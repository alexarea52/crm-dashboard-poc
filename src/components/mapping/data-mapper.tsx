"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  TARGET_SCHEMA,
  autoMap,
  distinctValues,
  fieldMapping,
  parseUpload,
  rebaseMapping,
  setFieldMapping,
  shredModel,
  targetEntity,
  unmappedRequired,
  type DateOrder,
  type EntityMapping,
  type FieldMapping,
  type ParsedCsv,
  type ShredInput,
  type ShredResult,
  type TargetField,
} from "@/lib/mapping";

const UNMAPPED = "__unmapped__";
const CONSTANT = "__constant__";

/** Preview shreds at most this many rows per file; downloads use all rows. */
const SAMPLE_ROWS = 2000;

interface SourceFile {
  name: string;
  csv: ParsedCsv;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Merge an imported mapping config onto the current mappings, keeping only
 * known entities/fields and well-typed values. Imported fields are treated as
 * deliberate (no `auto` flag). Returns null if the payload isn't a config.
 */
function sanitizeImportedMappings(
  data: unknown,
  current: EntityMapping[],
): EntityMapping[] | null {
  const incoming = isRecord(data) && Array.isArray(data.mappings) ? data.mappings : data;
  if (!Array.isArray(incoming)) return null;
  return current.map((entityMapping) => {
    const inc = incoming.find((candidate) => isRecord(candidate) && candidate.entity === entityMapping.entity);
    if (!isRecord(inc) || !Array.isArray(inc.fields)) return entityMapping;
    const incFields = inc.fields as unknown[];
    return {
      entity: entityMapping.entity,
      fields: entityMapping.fields.map((fm) => {
        const incField = incFields.find((candidate) => isRecord(candidate) && candidate.target === fm.target);
        if (!isRecord(incField)) return fm;
        const next: FieldMapping = {
          target: fm.target,
          sourceColumn: typeof incField.sourceColumn === "string" ? incField.sourceColumn : null,
        };
        if (typeof incField.constant === "string") next.constant = incField.constant;
        if (isRecord(incField.valueMap)) {
          const vm: Record<string, string> = {};
          for (const [sourceValue, targetValue] of Object.entries(incField.valueMap)) {
            if (typeof targetValue === "string") vm[sourceValue] = targetValue;
          }
          if (Object.keys(vm).length > 0) next.valueMap = vm;
        }
        if (incField.dateFormat === "mdy" || incField.dateFormat === "dmy") next.dateFormat = incField.dateFormat;
        return next;
      }),
    };
  });
}

/**
 * Data Mapper — map CRM exports (one wide Salesforce report, or per-object
 * HubSpot files) onto the semantic model, then shred them into the normalized
 * tables. Each entity reads from one file; all entities are deduplicated by
 * key, ids intern consistently, and declared FKs are integrity-checked.
 */
export function DataMapper() {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [fileByEntity, setFileByEntity] = useState<Record<string, number>>({});
  const [mappings, setMappings] = useState<EntityMapping[]>(() =>
    TARGET_SCHEMA.map((entityDef) => autoMap(entityDef.key, [])),
  );
  const [activeKey, setActiveKey] = useState<string>(TARGET_SCHEMA[0].key);
  const [configError, setConfigError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const configInput = useRef<HTMLInputElement>(null);

  const entity = targetEntity(activeKey)!;
  const activeMapping = mappings.find((mapping) => mapping.entity === activeKey)!;

  function fileIndexFor(entityKey: string): number {
    if (files.length === 0) return 0;
    return Math.min(fileByEntity[entityKey] ?? 0, files.length - 1);
  }
  const activeFile: SourceFile | undefined = files[fileIndexFor(activeKey)];
  const activeRows = useMemo(
    () => (activeFile?.csv.rows ?? []).slice(0, SAMPLE_ROWS),
    [activeFile],
  );

  async function onFiles(selected: File[]) {
    const parsed: SourceFile[] = [];
    for (const file of selected) {
      // One upload may yield several sources (an .xlsx with a tab per object).
      parsed.push(...(await parseUpload(file)));
    }
    const firstUpload = files.length === 0;
    const merged = [...files];
    const replaced = new Set<number>();
    for (const parsedFile of parsed) {
      const existingIndex = merged.findIndex((existing) => existing.name === parsedFile.name);
      if (existingIndex >= 0) {
        merged[existingIndex] = parsedFile;
        replaced.add(existingIndex);
      } else {
        merged.push(parsedFile);
      }
    }
    setFiles(merged);
    setMappings((prev) =>
      TARGET_SCHEMA.map((entityDef) => {
        const prevMapping = prev.find((mapping) => mapping.entity === entityDef.key);
        const idx = firstUpload ? 0 : Math.min(fileByEntity[entityDef.key] ?? 0, merged.length - 1);
        const headers = merged[idx]?.csv.headers ?? [];
        if (firstUpload) return autoMap(entityDef.key, headers);
        // Re-uploading a file rebases (keeps manual work); added files don't
        // disturb existing mappings.
        if (replaced.has(idx)) return rebaseMapping(prevMapping, entityDef.key, headers);
        return prevMapping ?? autoMap(entityDef.key, headers);
      }),
    );
  }

  function onPickFile(entityKey: string, index: number) {
    setFileByEntity((prev) => ({ ...prev, [entityKey]: index }));
    const headers = files[index]?.csv.headers ?? [];
    setMappings((prev) =>
      prev.map((mapping) => (mapping.entity === entityKey ? rebaseMapping(mapping, entityKey, headers) : mapping)),
    );
  }

  function updateActive(next: FieldMapping) {
    // Any edit makes the mapping deliberate — clear the auto-suggestion flag.
    setMappings((ms) =>
      ms.map((mapping) =>
        mapping.entity === activeKey ? setFieldMapping(mapping, { ...next, auto: false }) : mapping,
      ),
    );
  }

  function onImportConfig(file: File) {
    file
      .text()
      .then((text) => {
        const next = sanitizeImportedMappings(JSON.parse(text), mappings);
        if (!next) throw new Error("not a mapping config");
        setMappings(next);
        setConfigError(null);
      })
      .catch((error: unknown) => {
        setConfigError(`Couldn't read mapping config: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  // Preview over a sample keeps typing responsive on big files; deferring the
  // mappings value lets React batch keystrokes ahead of the reshred.
  const deferredMappings = useDeferredValue(mappings);
  const result = useMemo(() => {
    if (files.length === 0) return null;
    const inputs: ShredInput[] = deferredMappings.map((mapping) => {
      const idx = Math.min(fileByEntity[mapping.entity] ?? 0, files.length - 1);
      const rows = files[idx]?.csv.rows ?? [];
      return { mapping, rows: rows.length > SAMPLE_ROWS ? rows.slice(0, SAMPLE_ROWS) : rows };
    });
    return shredModel(inputs);
  }, [deferredMappings, files, fileByEntity]);

  const sampled = files.some((file) => file.csv.rows.length > SAMPLE_ROWS);
  const missing = unmappedRequired(entity, activeMapping);

  /** Full (unsampled) shred for downloads. */
  function fullShred(): ShredResult {
    const inputs: ShredInput[] = mappings.map((mapping) => ({
      mapping,
      rows: files[fileIndexFor(mapping.entity)]?.csv.rows ?? [],
    }));
    return shredModel(inputs);
  }

  const assignedKeyCount = result
    ? Object.values(result.keyAssignments).reduce((total, assignments) => total + assignments.length, 0)
    : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Data Mapper</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Map CRM exports onto the Lead Management &amp; Sales Funnel semantic
          model, then shred them into normalized tables. Use one wide file
          (Salesforce report) or one file per entity (HubSpot exports).
        </p>
      </header>

      <Step n={1} title="Import your CRM file(s) (CSV or Excel)">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            className="hidden"
            onChange={(event) => {
              const list = event.target.files;
              if (list && list.length > 0) void onFiles([...list]);
              event.target.value = ""; // allow re-selecting the same file
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg bg-crm-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crm-primary-hover"
          >
            {files.length > 0 ? "Add or replace files" : "Choose file(s)"}
          </button>
          {files.length > 0 && (
            <ul className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {files.map((file) => (
                <li key={file.name}>
                  {file.name} — {file.csv.rows.length} rows, {file.csv.headers.length} columns
                </li>
              ))}
            </ul>
          )}
        </div>
        {files.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400">
            Re-uploading a file with the same name replaces it; your manual
            mappings are kept where the columns still exist.
          </p>
        )}
      </Step>

      {files.length > 0 && (
        <Step n={2} title="Map fields by entity">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {TARGET_SCHEMA.map((entityDef) => {
              const mapping = mappings.find((candidate) => candidate.entity === entityDef.key)!;
              const miss = unmappedRequired(entityDef, mapping).length;
              const count = result?.counts[entityDef.key] ?? 0;
              return (
                <button
                  key={entityDef.key}
                  onClick={() => setActiveKey(entityDef.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    entityDef.key === activeKey
                      ? "border-crm-primary bg-crm-primary text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                  )}
                >
                  {entityDef.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs",
                      entityDef.key === activeKey
                        ? "bg-white/25"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
                    )}
                  >
                    {count}
                  </span>
                  {miss > 0 && (
                    <span
                      className="text-amber-500"
                      title={`${miss} required field(s) unmapped`}
                    >
                      ●
                    </span>
                  )}
                </button>
              );
            })}
            <span className="ml-auto flex items-center gap-2">
              <input
                ref={configInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportConfig(file);
                  event.target.value = "";
                }}
              />
              <button
                onClick={() => configInput.current?.click()}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Import mapping…
              </button>
              <button
                onClick={() => downloadJson({ version: 1, mappings }, "mapping-config.json")}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Export mapping
              </button>
            </span>
          </div>

          {configError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {configError}
            </p>
          )}

          {files.length > 1 && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Source file for {entity.label}:</span>
              <select
                aria-label={`Source file for ${entity.label}`}
                value={fileIndexFor(activeKey)}
                onChange={(event) => onPickFile(activeKey, Number(event.target.value))}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {files.map((file, index) => (
                  <option key={file.name} value={index}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="mb-3 text-sm text-zinc-500">{entity.description}</p>
          {missing.length > 0 && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {missing.length} required field{missing.length === 1 ? "" : "s"} still
              unmapped: {missing.join(", ")}
            </p>
          )}

          <div className="space-y-3">
            {entity.fields.map((field) => (
              <FieldRow
                key={field.name}
                field={field}
                mapping={fieldMapping(activeMapping, field.name)!}
                headers={activeFile?.csv.headers ?? []}
                rows={activeRows}
                onChange={updateActive}
              />
            ))}
          </div>
        </Step>
      )}

      {result && (
        <Step n={3} title="Preview & export">
          <div className="mb-4 flex items-center gap-4 text-sm">
            {result.errors.length > 0 ? (
              <span className="text-red-600 dark:text-red-400">
                {result.errors.length} value problem
                {result.errors.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">
                no value problems
              </span>
            )}
            <button
              onClick={() => downloadJson(fullShred().model, "semantic-model.json")}
              className="ml-auto rounded-lg bg-crm-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crm-primary-hover"
            >
              Download full model JSON
            </button>
          </div>

          {sampled && (
            <p className="mb-3 text-xs text-zinc-500">
              Preview computed from the first {SAMPLE_ROWS.toLocaleString()} rows
              of each file; downloads always use all rows.
            </p>
          )}

          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-700">
                <th className="py-1.5 font-medium">Entity</th>
                <th className="py-1.5 font-medium">Records</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {TARGET_SCHEMA.map((entityDef) => (
                <tr
                  key={entityDef.key}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="py-1.5 text-zinc-700 dark:text-zinc-300">
                    {entityDef.label}
                    {result.derived.includes(entityDef.key) && (
                      <span className="ml-1.5 text-xs text-zinc-400">(derived)</span>
                    )}
                  </td>
                  <td className="py-1.5 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {result.counts[entityDef.key] ?? 0}
                  </td>
                  <td className="py-1.5 text-right">
                    {(result.counts[entityDef.key] ?? 0) > 0 && (
                      <button
                        onClick={() =>
                          downloadJson(fullShred().model[entityDef.key] ?? [], `${entityDef.key}.json`)
                        }
                        className="text-xs text-crm-primary hover:underline"
                      >
                        Download {entityDef.key}.json
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {assignedKeyCount > 0 && (
            <p className="mb-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
              {assignedKeyCount} non-numeric source id
              {assignedKeyCount === 1 ? " was" : "s were"} assigned sequential
              numeric keys (consistently across tables).{" "}
              <button
                onClick={() => downloadJson(fullShred().keyAssignments, "key-map.json")}
                className="text-crm-primary hover:underline"
              >
                Download the key map
              </button>{" "}
              to trace originals.
            </p>
          )}

          {result.integrity.length > 0 && (
            <ul className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {result.integrity.map((issue) => (
                <li key={`${issue.entity}.${issue.field}`}>
                  {issue.entity}.{issue.field}: {issue.missing} value
                  {issue.missing === 1 ? "" : "s"} with no matching{" "}
                  {issue.references} record (e.g. {issue.samples.join(", ")})
                </li>
              ))}
            </ul>
          )}

          {result.errors.length > 0 && (
            <div className="mb-4 max-h-40 overflow-auto rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {result.errors.length > 50 && (
                <p className="mb-1 font-medium">
                  Showing the first 50 of {result.errors.length} problems
                </p>
              )}
              <ul>
                {result.errors.slice(0, 50).map((problem, index) => (
                  <li key={index}>
                    {problem.entity} · row {problem.row}, <code>{problem.field}</code>: {problem.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-1 text-xs font-medium text-zinc-500">
            Preview: {entity.label} (first 10)
          </p>
          <pre className="max-h-80 overflow-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">
            {JSON.stringify((result.model[activeKey] ?? []).slice(0, 10), null, 2)}
          </pre>
        </Step>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One target field's mapping row: column picker + optional value mapping. */
function FieldRow({
  field,
  mapping,
  headers,
  rows,
  onChange,
}: {
  field: TargetField;
  mapping: FieldMapping;
  headers: string[];
  rows: Record<string, string>[];
  onChange: (next: FieldMapping) => void;
}) {
  const usingConstant = mapping.constant !== undefined;
  const selectValue = usingConstant
    ? CONSTANT
    : (mapping.sourceColumn ?? UNMAPPED);

  // Value mapping applies to enum/boolean fields bound to a source column.
  const showValueMap =
    !usingConstant &&
    mapping.sourceColumn !== null &&
    (field.type === "enum" || field.type === "boolean");
  const sourceValues = showValueMap
    ? distinctValues(rows, mapping.sourceColumn!)
    : [];
  const targetOptions =
    field.type === "enum" ? field.options! : ["true", "false"];

  const samples =
    !usingConstant && mapping.sourceColumn !== null
      ? distinctValues(rows, mapping.sourceColumn).slice(0, 3)
      : [];

  function onSelect(value: string) {
    if (value === UNMAPPED) onChange({ target: field.name, sourceColumn: null });
    else if (value === CONSTANT)
      onChange({ target: field.name, sourceColumn: null, constant: "" });
    else onChange({ target: field.name, sourceColumn: value });
  }

  function onValueMapPick(sourceValue: string, targetValue: string) {
    // "(pass through)" removes the entry — an empty-string *mapping* would
    // blank the value instead of passing it through.
    const next = { ...(mapping.valueMap ?? {}) };
    if (targetValue === "") delete next[sourceValue];
    else next[sourceValue] = targetValue;
    onChange({
      ...mapping,
      valueMap: Object.keys(next).length > 0 ? next : undefined,
    });
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800">
      <div>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
          {mapping.auto && (
            <span className="ml-1.5 rounded bg-sky-100 px-1 py-0.5 align-middle text-[10px] font-normal text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              suggested
            </span>
          )}
        </span>
        <div className="text-xs text-zinc-400">
          <code>{field.name}</code> · {field.type}
          {field.references && <> · → {field.references}</>}
        </div>
        {field.note && (
          <p className="mt-0.5 text-xs text-zinc-400">{field.note}</p>
        )}
      </div>

      <div className="pt-1 text-zinc-300">←</div>

      <div className="space-y-2">
        <select
          aria-label={`Source column for ${field.label}`}
          value={selectValue}
          onChange={(event) => onSelect(event.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value={UNMAPPED}>— unmapped —</option>
          <option value={CONSTANT}>(constant value)</option>
          <optgroup label="Source columns">
            {headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </optgroup>
        </select>

        {samples.length > 0 && (
          <p className="truncate text-xs text-zinc-400">
            e.g. {samples.map((sample) => `"${sample}"`).join(", ")}
          </p>
        )}

        {usingConstant && (
          <input
            type="text"
            placeholder="constant value"
            aria-label={`Constant value for ${field.label}`}
            value={mapping.constant ?? ""}
            onChange={(event) =>
              onChange({ ...mapping, sourceColumn: null, constant: event.target.value })
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        )}

        {field.type === "date" && !usingConstant && mapping.sourceColumn !== null && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Ambiguous dates (01/02/2026) read as</span>
            <select
              aria-label={`Date order for ${field.label}`}
              value={mapping.dateFormat ?? "mdy"}
              onChange={(event) =>
                onChange({ ...mapping, dateFormat: event.target.value as DateOrder })
              }
              className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="mdy">month-first (US)</option>
              <option value="dmy">day-first</option>
            </select>
          </div>
        )}

        {showValueMap && sourceValues.length > 0 && (
          <div className="rounded-md bg-zinc-50 p-2 dark:bg-zinc-800/50">
            <p className="mb-1 text-xs font-medium text-zinc-500">
              Map values → {field.type === "enum" ? field.options!.join(" / ") : "true / false"}
            </p>
            <div className="space-y-1">
              {sourceValues.map((sv) => (
                <div key={sv} className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                    {sv}
                  </code>
                  <span className="text-zinc-300">→</span>
                  <select
                    aria-label={`Target value for ${sv}`}
                    value={mapping.valueMap?.[sv] ?? ""}
                    onChange={(event) => onValueMapPick(sv, event.target.value)}
                    className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">(pass through)</option>
                    {targetOptions.map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
