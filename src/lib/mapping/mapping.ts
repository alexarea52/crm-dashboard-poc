// =============================================================================
// Mapping config — how a user's CRM columns/values map onto a target entity
// =============================================================================

import { type DateOrder } from "./coerce";
import { targetEntity, type TargetEntity } from "./target-schema";

/** How one target field gets its value. */
export interface FieldMapping {
  /** Target field name (matches a TargetField.name on the entity). */
  target: string;
  /**
   * Source column to pull from. `null` = unmapped. Ignored when `constant`
   * is set.
   */
  sourceColumn: string | null;
  /** Use a fixed value for every row instead of a source column. */
  constant?: string;
  /**
   * Value translation: source value -> target value. Used for enum/boolean
   * fields ("Closed-Won" -> "Closed Won", "Y" -> "true"). Keys are raw source
   * values; unmatched values pass through unchanged. An explicit "" target
   * blanks the value.
   */
  valueMap?: Record<string, string>;
  /** For date fields: day/month order of ambiguous dates. Default month-first. */
  dateFormat?: DateOrder;
  /** True while this mapping is an untouched auto-suggestion. */
  auto?: boolean;
}

/** A full mapping for one target entity. */
export interface EntityMapping {
  entity: string;
  fields: FieldMapping[];
}

/** Normalize a header/field name for fuzzy matching. */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Suggestions scoring below this are dropped rather than risk a wrong guess. */
const SUGGEST_THRESHOLD = 0.3;

/**
 * Score a normalized header against a field's candidate names. Exact match
 * wins outright; boundary (prefix/suffix) and substring matches are weighted
 * by length overlap, so "OppId" scores too low to claim a bare `id` field.
 */
function matchScore(headerNorm: string, candidates: string[]): number {
  let best = 0;
  for (const candidate of candidates) {
    if (!candidate || !headerNorm) continue;
    const ratio =
      Math.min(candidate.length, headerNorm.length) / Math.max(candidate.length, headerNorm.length);
    let score = 0;
    if (headerNorm === candidate) {
      score = 1;
    } else if (
      headerNorm.startsWith(candidate) ||
      headerNorm.endsWith(candidate) ||
      candidate.startsWith(headerNorm) ||
      candidate.endsWith(headerNorm)
    ) {
      score = 0.6 * ratio;
    } else if (headerNorm.includes(candidate) || candidate.includes(headerNorm)) {
      score = 0.4 * ratio;
    }
    if (score > best) best = score;
  }
  return best;
}

/**
 * Build a starting mapping for an entity, auto-suggesting a source column for
 * each target field. Candidates are scored (exact > entity-prefixed >
 * boundary > substring, weighted by overlap) and weak matches are left
 * unmapped. Suggestions carry `auto: true` so the UI can badge them and
 * rebasing can tell them apart from deliberate choices.
 */
export function autoMap(entityKey: string, headers: string[]): EntityMapping {
  const entity = targetEntity(entityKey);
  if (!entity) return { entity: entityKey, fields: [] };

  const normHeaders = headers.map((header) => ({ raw: header, norm: normalize(header) }));

  const fields: FieldMapping[] = entity.fields.map((field) => {
    const candidates = [
      normalize(field.name),
      normalize(field.label),
      normalize(entity.label + field.name),
    ];
    let best: string | null = null;
    let bestScore = 0;
    for (const header of normHeaders) {
      const score = matchScore(header.norm, candidates);
      if (score > bestScore) {
        bestScore = score;
        best = header.raw;
      }
    }
    return bestScore >= SUGGEST_THRESHOLD && best !== null
      ? { target: field.name, sourceColumn: best, auto: true }
      : { target: field.name, sourceColumn: null };
  });

  return { entity: entityKey, fields };
}

/**
 * Re-suggest a mapping against new headers while keeping the user's manual
 * edits (anything without `auto`) whose source column still exists — so
 * re-uploading a corrected export doesn't wipe mapping work.
 */
export function rebaseMapping(
  previous: EntityMapping | undefined,
  entityKey: string,
  headers: string[],
): EntityMapping {
  const fresh = autoMap(entityKey, headers);
  if (!previous) return fresh;
  return {
    ...fresh,
    fields: fresh.fields.map((fm) => {
      const old = fieldMapping(previous, fm.target);
      if (!old || old.auto) return fm;
      if (old.constant !== undefined) return { ...old };
      if (old.sourceColumn !== null && headers.includes(old.sourceColumn)) return { ...old };
      return fm;
    }),
  };
}

/** Find the mapping for a given target field (or undefined). */
export function fieldMapping(
  mapping: EntityMapping,
  target: string,
): FieldMapping | undefined {
  return mapping.fields.find((field) => field.target === target);
}

/** Replace one field mapping immutably, returning a new EntityMapping. */
export function setFieldMapping(
  mapping: EntityMapping,
  next: FieldMapping,
): EntityMapping {
  return {
    ...mapping,
    fields: mapping.fields.map((field) => (field.target === next.target ? next : field)),
  };
}

/**
 * The fields that identify a row of this entity, used to deduplicate when
 * shredding a wide file. Primary-key fields if any; otherwise the foreign keys
 * (covers AOP, which is keyed by its (BU, Date) FKs with no surrogate PK).
 */
export function keyFields(entity: TargetEntity): string[] {
  const pk = entity.fields.filter((field) => field.pk).map((field) => field.name);
  if (pk.length > 0) return pk;
  return entity.fields.filter((field) => field.references).map((field) => field.name);
}

/** Count how many of an entity's required fields are still unmapped. */
export function unmappedRequired(
  entity: TargetEntity,
  mapping: EntityMapping,
): string[] {
  return entity.fields
    .filter((field) => field.required)
    .filter((field) => {
      const fieldMap = fieldMapping(mapping, field.name);
      if (!fieldMap) return true;
      // An empty constant is not a mapping — it would just error on every row.
      const hasConstant = fieldMap.constant !== undefined && fieldMap.constant.trim() !== "";
      return fieldMap.sourceColumn === null && !hasConstant;
    })
    .map((field) => field.name);
}
