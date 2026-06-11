// =============================================================================
// Transform — apply mappings to parsed CSV rows
// =============================================================================
// A real export is either ONE wide, denormalized file (a Salesforce report:
// each row carries columns for several entities at once) or several per-object
// files (HubSpot: contacts.csv, deals.csv, …). `shredModel` takes one
// (mapping, rows) input per entity — point every mapping at the same rows for
// the wide case — and produces the normalized tables of the semantic model,
// deduplicating each entity by its key.
//
// Pure: coercion/validation problems are collected as errors (1-based row
// numbers) rather than thrown, so the UI can show a partial result + problems.
// Errors are reported once per distinct entity instance, not once per source
// row — dimension attributes repeat on every row of a wide file, and a single
// bad BU cell shouldn't read as 1600 problems.
//
// Presence rule: an entity is considered "present on a row" only if all of its
// key fields are mapped AND non-empty on that row. Rows where it's absent are
// skipped silently (not an error) — that's how the same wide file yields, say,
// 1600 leads but only 8 business units.
//
// Keys: number-typed PK/FK fields are interned (see coerce.ts), so
// alphanumeric source ids ("006Ax000001a2bC") become stable small integers,
// consistently across entities — opportunity.leadId resolves to the same
// number as the lead.id it came from.

import {
  coerce,
  createKeyInterner,
  MONTH_NAMES,
  type CoerceContext,
  type KeyAssignment,
  type KeyInterner,
} from "./coerce";
import { fieldMapping, keyFields, type EntityMapping, type FieldMapping } from "./mapping";
import {
  TARGET_SCHEMA,
  targetEntity,
  type TargetEntity,
  type TargetField,
} from "./target-schema";

/** A coercion/validation problem on one cell, with a 1-based row number. */
export interface TransformError {
  /** 1-based source data row (excludes the header row). */
  row: number;
  entity: string;
  field: string;
  value: string;
  message: string;
}

/** The converted records for one entity plus any per-cell problems. */
export interface TransformResult {
  records: Record<string, unknown>[];
  errors: TransformError[];
}

/** One entity's mapping plus the rows of the file it reads from. */
export interface ShredInput {
  mapping: EntityMapping;
  rows: Record<string, string>[];
}

/** One referential-integrity problem: FK values with no matching record. */
export interface IntegrityIssue {
  entity: string;
  field: string;
  references: string;
  /** Count of records whose FK value has no match. */
  missing: number;
  /** Up to 5 sample orphaned values. */
  samples: string[];
}

/** A full shredded model: per-entity records, counts, and pooled diagnostics. */
export interface ShredResult {
  /** entityKey -> deduplicated records. */
  model: Record<string, Record<string, unknown>[]>;
  /** entityKey -> record count. */
  counts: Record<string, number>;
  errors: TransformError[];
  /** Key domain -> numeric keys assigned to non-numeric source ids. */
  keyAssignments: Record<string, KeyAssignment[]>;
  /** Entities synthesized rather than mapped (currently only "date"). */
  derived: string[];
  /** Orphaned-FK report, per declared reference. */
  integrity: IntegrityIssue[];
}

/** Resolve the input for a field on a row: the mapping plus its raw value. */
function rawFor(
  mapping: EntityMapping,
  target: string,
  row: Record<string, string>,
): { raw: string; fieldMap: FieldMapping } | null {
  const fieldMap = fieldMapping(mapping, target);
  if (!fieldMap) return null;
  if (fieldMap.constant !== undefined) return { raw: fieldMap.constant, fieldMap };
  if (fieldMap.sourceColumn === null) return null;
  return { raw: row[fieldMap.sourceColumn] ?? "", fieldMap };
}

/** The translated raw value for a field on a row, or "" if unmapped. */
function translatedRaw(
  mapping: EntityMapping,
  target: string,
  row: Record<string, string>,
): string {
  const input = rawFor(mapping, target, row);
  if (!input) return "";
  return (input.fieldMap.valueMap?.[input.raw] ?? input.raw).trim();
}

/** Is every key field of `entity` mapped and non-empty on this row? */
function isPresent(
  entity: TargetEntity,
  mapping: EntityMapping,
  row: Record<string, string>,
): boolean {
  const keys = keyFields(entity);
  if (keys.length === 0) return false;
  return keys.every((key) => translatedRaw(mapping, key, row) !== "");
}

/** The intern domain a key field identifies: its own entity for PKs, the
 *  referenced entity for FKs. */
function keyDomain(entity: TargetEntity, field: TargetField): string | null {
  if (field.type !== "number") return null;
  if (field.pk) return entity.key;
  return field.references ?? null;
}

/** Reserve every natively-numeric key value so interned ids never collide. */
function reserveKeys(
  interner: KeyInterner,
  entity: TargetEntity,
  mapping: EntityMapping,
  rows: Record<string, string>[],
): void {
  const keyed = entity.fields
    .map((field) => ({ field, domain: keyDomain(entity, field) }))
    .filter((entry): entry is { field: TargetField; domain: string } => entry.domain !== null);
  if (keyed.length === 0) return;
  for (const row of rows) {
    for (const { field, domain } of keyed) {
      const raw = translatedRaw(mapping, field.name, row);
      if (raw !== "") interner.reserve(domain, raw);
    }
  }
}

/** Build one entity record from a row. Assumes the entity is present. */
function buildRecord(
  entity: TargetEntity,
  mapping: EntityMapping,
  row: Record<string, string>,
  rowNum: number,
  interner: KeyInterner,
): { record: Record<string, unknown>; errors: TransformError[] } {
  const record: Record<string, unknown> = {};
  const errors: TransformError[] = [];

  for (const field of entity.fields) {
    const input = rawFor(mapping, field.name, row);
    if (!input) continue; // unmapped — UI surfaces required-but-unmapped separately
    const raw = input.fieldMap.valueMap?.[input.raw] ?? input.raw;
    const domain = keyDomain(entity, field);
    const ctx: CoerceContext = {
      dateOrder: input.fieldMap.dateFormat,
      internKey: domain !== null ? (value) => interner.resolve(domain, value) : undefined,
    };
    const result = coerce(field, raw, ctx);
    if (!result.ok) {
      errors.push({
        row: rowNum,
        entity: entity.key,
        field: field.name,
        value: input.raw,
        message: result.message!,
      });
    } else if (result.value !== undefined) {
      record[field.name] = result.value;
    }
  }

  return { record, errors };
}

/** Signature used to dedupe an entity's records by its key fields. */
function keySignature(entity: TargetEntity, record: Record<string, unknown>): string | null {
  const keys = keyFields(entity);
  const parts: string[] = [];
  for (const key of keys) {
    if (record[key] === undefined) return null; // key didn't coerce — drop
    parts.push(String(record[key]));
  }
  return parts.join("\u0000");
}

/**
 * Convert one entity from the rows, deduplicating by key (first occurrence
 * wins). Rows where the entity isn't present are skipped silently; repeat
 * occurrences of the same key contribute neither records nor errors. Pass a
 * shared `interner` (shredModel does) to keep ids consistent across entities.
 */
export function transformRows(
  mapping: EntityMapping,
  rows: Record<string, string>[],
  interner?: KeyInterner,
): TransformResult {
  const entity = targetEntity(mapping.entity);
  if (!entity) {
    return {
      records: [],
      errors: [{ row: 0, entity: mapping.entity, field: "", value: "", message: `unknown entity "${mapping.entity}"` }],
    };
  }

  const intern = interner ?? createKeyInterner();
  if (!interner) reserveKeys(intern, entity, mapping, rows);

  const keys = keyFields(entity);
  const records: Record<string, unknown>[] = [];
  const errors: TransformError[] = [];
  const seenRaw = new Set<string>();
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    if (!isPresent(entity, mapping, row)) return;
    // Dedupe on the raw key spelling first: repeats of the same entity
    // instance are skipped wholesale, so their cell problems aren't recounted.
    const rawSig = keys.map((key) => translatedRaw(mapping, key, row)).join("\u0000");
    if (seenRaw.has(rawSig)) return;
    seenRaw.add(rawSig);

    const { record, errors: errs } = buildRecord(entity, mapping, row, index + 1, intern);
    const sig = keySignature(entity, record);
    if (sig === null) {
      errors.push(...errs); // a key failed coercion — surface why the row dropped
      return;
    }
    if (seen.has(sig)) return; // distinct raw spelling, same coerced key
    seen.add(sig);
    errors.push(...errs);
    records.push(record);
  });

  return { records, errors };
}

/**
 * Synthesize the Date dimension from every date-typed value present in the
 * shredded records (values are already ISO-normalized by coercion). The PDF
 * notes the date table is "not needed in Salesforce" — it isn't in exports.
 */
function deriveDateDim(model: Record<string, Record<string, unknown>[]>): Record<string, unknown>[] {
  const dates = new Set<string>();
  for (const entity of TARGET_SCHEMA) {
    if (entity.key === "date") continue;
    const records = model[entity.key];
    if (!records) continue;
    const dateFields = entity.fields.filter((field) => field.type === "date").map((field) => field.name);
    if (dateFields.length === 0) continue;
    for (const record of records) {
      for (const name of dateFields) {
        const value = record[name];
        if (typeof value === "string") dates.add(value);
      }
    }
  }
  return [...dates].sort().map((iso) => {
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const day = Number(iso.slice(8, 10));
    return {
      date: iso,
      year,
      quarter: `Q${Math.ceil(month / 3)}`,
      month,
      monthName: MONTH_NAMES[month - 1],
      day,
    };
  });
}

/**
 * Check every declared FK against the referenced entity's records. Skips
 * references whose target table came out empty (nothing to validate against).
 */
function checkIntegrity(model: Record<string, Record<string, unknown>[]>): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const entity of TARGET_SCHEMA) {
    const records = model[entity.key];
    if (!records || records.length === 0) continue;
    for (const field of entity.fields) {
      if (!field.references) continue;
      const referenced = targetEntity(field.references);
      const pk = referenced?.fields.find((pkField) => pkField.pk);
      if (!referenced || !pk) continue;
      const targetRecords = model[referenced.key];
      if (!targetRecords || targetRecords.length === 0) continue;
      const known = new Set(targetRecords.map((record) => String(record[pk.name])));
      const orphans = new Set<string>();
      let missing = 0;
      for (const record of records) {
        const value = record[field.name];
        if (value === undefined) continue;
        if (!known.has(String(value))) {
          missing++;
          if (orphans.size < 5) orphans.add(String(value));
        }
      }
      if (missing > 0) {
        issues.push({
          entity: entity.key,
          field: field.name,
          references: field.references,
          missing,
          samples: [...orphans],
        });
      }
    }
  }
  return issues;
}

/**
 * Shred CRM exports into the full semantic model: one (mapping, rows) input
 * per entity — same rows everywhere for a wide file, per-entity rows for
 * per-object exports. Every entity is deduplicated by its key; ids intern
 * consistently across entities; the Date dimension is derived when unmapped;
 * declared FKs are integrity-checked.
 */
export function shredModel(inputs: ShredInput[]): ShredResult {
  const interner = createKeyInterner();
  for (const { mapping, rows } of inputs) {
    const entity = targetEntity(mapping.entity);
    if (entity) reserveKeys(interner, entity, mapping, rows);
  }

  const model: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  const errors: TransformError[] = [];

  for (const { mapping, rows } of inputs) {
    const { records, errors: errs } = transformRows(mapping, rows, interner);
    model[mapping.entity] = records;
    counts[mapping.entity] = records.length;
    errors.push(...errs);
  }

  const derived: string[] = [];
  if ((model["date"]?.length ?? 0) === 0) {
    const dates = deriveDateDim(model);
    if (dates.length > 0) {
      model["date"] = dates;
      counts["date"] = dates.length;
      derived.push("date");
    }
  }

  return {
    model,
    counts,
    errors,
    keyAssignments: interner.assignments(),
    derived,
    integrity: checkIntegrity(model),
  };
}
