# Text-to-SQL (`lib/crm/sql` + `POST /api/ask`)

Real production-shaped pipeline; only the LLM is a stub.

```
question → SqlGenerator → guard.validateAndCap → withSessionViews(prepare/all)
        → { answer, sql, columns, rows } (AskResult discriminated union)
```

## Security = 4 layers (never rely on one)

1. Base tables are `raw_*` and the guard's allowlist contains **only** the
   view names (`EXPOSED_VIEWS`: leads, opportunities, accounts, channels).
2. `withSessionViews` creates per-request TEMP VIEWs that bake permissions
   into SQL: BU row filter + financial column pruning (non-admin views simply
   lack `cost`/`margin_value`/`margin_pct` → "no such column" on access).
3. `guard.ts`: single statement, must start SELECT/WITH, token denylist
   (after stripping string literals), FROM/JOIN identifier allowlist (+ CTE
   names), no comments, no dotted names, wrap in `SELECT * FROM (…) LIMIT 200`.
4. Execution: `prepare()` throws on multi-statement; `!stmt.reader` rejected.

**Critical invariant**: `withSessionViews`' callback must be SYNCHRONOUS —
that's what makes create→query→drop atomic on the shared connection
(better-sqlite3 is sync). Enforced at compile time via the `NotPromise<T>`
return type; an async callback is a type error. Do not relax it.
(`@typescript-eslint/no-misused-promises` can NOT see through the generic —
that's why the type-level guard exists.)

## Database

In-memory better-sqlite3 v12, seeded once per process
(`db.ts` globalThis singleton, survives dev HMR) from `databaseForYear` for
**all three years** (`year` column; composite PK `(year,id)` because ids
repeat across years). Rollups are deliberately NOT loaded (would leak
cross-BU aggregates); aggregate questions GROUP BY over rows, so SQL answers
≠ dashboard rollup KPIs.

## The generator contract & the LLM swap

`SqlGenerator.generate({ question, schemaDescription }) →
{ kind:"sql", sql, summarize? } | { kind:"unsupported", message }`.
`schemaDescription` comes from `schema.ts#describeSchemaFor(session)` and
already omits gated columns — the prompt is permission-aware for free.

To go live: write `anthropic-generator.ts` implementing the interface
(**invoke the `claude-api` skill first**), put `ANTHROPIC_API_KEY` in
`.env.local` (repo root — /src projects don't load env from src/), and swap
`defaultGenerator` in `pipeline.ts` (or add an env switch). Nothing else
changes; `askSql` takes an injectable generator (that's how the
malicious-generator test works).

## Stub generator (`stub-generator.ts`)

Ordered regex pattern table, first match wins — most specific phrasing first
(a "largest open deal" once mis-routed to the open-pipeline pattern because
of keyword-overlap scoring; ordering fixed it). `requiresFinancials` patterns
check the schemaDescription for "cost" and refuse otherwise. Year parsed from
the question (`2024|2025|2026`), else all-years GROUP BY.
`sqlExampleQuestions` in `types.ts` must each hit a pattern (chips).

## Gotchas

- **Restart the dev server after editing mock data** — the DB singleton
  intentionally survives HMR, so seeds go stale.
- Guard/execution failures return **HTTP 200 with a `kind`** (in-band chat
  outcomes); only malformed bodies get 400.
- `sql/types.ts` is the only module under `sql/` a client component may
  import (ESLint-enforced).
