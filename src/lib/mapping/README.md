# Data Mapper

Map CRM exports onto the V2 **semantic model**, then shred them into the
normalized tables. Two source shapes are supported:

- **One wide, denormalized file** (a Salesforce report: every row carries
  columns for several entities at once) — point all entities at it.
- **Per-object files** (HubSpot: contacts.csv, deals.csv, …) — each entity
  picks its own source file.

**Formats:** CSV and Excel (`.xlsx` / `.xls`). A multi-tab workbook is expanded
into one source per populated sheet (`crm.xlsx — Leads`, `crm.xlsx —
Opportunities`), so a workbook-with-a-tab-per-object is just the per-object
case. Parsing lives in `parse-file.ts`; XLSX uses SheetJS (`xlsx`), lazy-loaded
so it only ships to clients that open a workbook. Excel cells are read as the
*formatted* strings the user sees (dates included), then coerced like CSV.

> `xlsx` is pinned to the SheetJS CDN tarball (`cdn.sheetjs.com/...`), **not**
> the npm registry. The npm `xlsx@0.18.5` is the last registry release and
> carries an unpatched high-severity advisory (prototype pollution + ReDoS);
> SheetJS ships fixes only via their CDN. Don't repoint this at the npm version.

Route: `/data-mapper` → `components/mapping/data-mapper.tsx` (client UI).
Core: this folder (`lib/mapping`) — pure, tested; its only outside import is
the semantic model it targets (`lib/crm/data/semantic-model.ts`).

## Flow

1. **Import CSV(s)** — parsed in-browser, no upload. Duplicate header names
   are renamed (`Name`, `Name (2)`) instead of silently collapsed.
   Re-uploading a same-named file replaces it and *keeps* manual mappings
   whose columns still exist.
2. **Map fields, per entity** — map each target field ← a source column, a
   constant, or unmapped. Suggestions come from scored fuzzy matching
   (exact > entity-prefixed > boundary > substring, weighted by overlap; weak
   matches stay unmapped) and are badged "suggested" until touched. The
   mapping config itself can be exported/imported as JSON for reuse.
3. **Map values** — for `enum`/`boolean` fields, translate the source's
   distinct values to ours (`"Closed-Won"` → `"Closed Won"`, `"Y"` → `true`).
   Date fields take a month-first/day-first hint for ambiguous `01/02/2026`.
4. **Preview & export** — `shredModel` splits the inputs into per-entity
   tables, deduplicating each by key, reports counts, orphaned-FK integrity
   issues, and per-cell problems (1-based row numbers). Big files preview from
   a 2,000-row sample; downloads always re-shred all rows.

## Shredding & the key model

One wide file → many tables. Each entity is **deduplicated by its key fields**
(`keyFields` in `mapping.ts`): PK fields if present, else the FKs (covers AOP,
which has no surrogate PK). First occurrence wins; repeat occurrences of the
same key contribute neither records nor errors (a bad cell on a dimension that
repeats per row is reported once, not 1600×).

**Presence rule:** an entity is "present" on a row only if all its key fields
are mapped and non-empty there. Absent → skipped silently (not an error).

**Key interning:** number-typed PK/FK fields accept *any* id shape. Numeric
source ids keep their value; alphanumeric ids (Salesforce `006Ax…`, 18-digit
HubSpot ids that overflow doubles) get sequential ints that never collide with
native ones. Each key *domain* (the entity a key identifies — `lead` covers
both `lead.id` and `opportunity.leadId`) shares one intern table across the
whole shred, so FKs stay consistent. `ShredResult.keyAssignments` is the
original ↔ assigned map (downloadable in the UI).

**Derived Date dimension:** if the `date` entity is left unmapped (it isn't in
real exports — the PDF says "not needed in Salesforce"), it's synthesized from
the union of all date values in the shredded records.

## Pieces

| File | Role |
| --- | --- |
| `target-schema.ts` | Runtime descriptor of the semantic model. Field names are pinned to the interfaces via `f<Lead>("id", …)` — renames in `semantic-model.ts` are compile errors here; enum options are imported, not restated. |
| `mapping.ts` | Mapping-config types + `autoMap` (scored header matching) + `rebaseMapping` (preserve manual work across re-uploads) + helpers. |
| `csv.ts` | RFC-4180-ish CSV parser (quotes, escaped `""`, CRLF, duplicate-header rename) + `distinctValues`. |
| `coerce.ts` | Per-type value coercion: tolerant number parsing (`$1,200.50`, `(300)`, `12.5%` — *not* EU decimal commas), date normalization to ISO `YYYY-MM-DD` with day/month-order hint, and the key interner. |
| `transform.ts` | `transformRows` / `shredModel({mapping, rows}[]) → model + counts + errors + keyAssignments + derived + integrity`. Pure; collects errors instead of throwing. |

## Invariants / gotchas

- **Dates always normalize to ISO** on coercion, so `DateId` joins compare
  equal. Slashy dates default to month-first (US); an unambiguous part
  (`15/01`) overrides the hint. Month-name formats fall back to `Date.parse`.
- **A `valueMap` is applied *before* coercion**, so it can fix enum/boolean
  inputs. An explicit `""` target blanks the value; *removing* the entry
  passes the source value through (the UI deletes entries, never writes `""`).
- **Integrity is checked per declared `references`** against the referenced
  entity's PK values, and skipped when the referenced table came out empty.
- **Inherited model questions still apply.** `customerCountry` etc. map as
  free-text strings, not a `Geography` FK — same open question flagged in
  `semantic-model.ts`. Name → dimension-key lookup doesn't exist.
- **First occurrence wins** on dedupe — if the same key carries conflicting
  attributes across rows, later rows are dropped silently (not merged).

## Not built yet (candidate next steps)

- Wire the shredded output into the dashboards (today they render the mock
  `CrmDatabase` from `model.ts`; the V2 semantic model isn't consumed —
  needs either a V2 → `CrmDatabase` adapter or the planned data-layer rework).
- Merge (rather than first-wins) when duplicate keys disagree.
- Derive computed fields (`combinedCloseDate`, the duration columns) in transform.
- Name → dimension-key resolution (e.g. country strings → `Geography`).
- EU-style decimal commas (`1.200,50`) in number parsing.
