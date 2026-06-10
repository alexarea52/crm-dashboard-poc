# Testing & tooling

## Commands

```
npm run dev          # localhost:3000 (another instance may already hold the port)
npm test             # vitest run (69 tests currently)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (see rule inventory below)
npm run build        # next build — routes: /, /crm-dashboard, ƒ /api/ask
```

Standard verification after any change: typecheck → lint → test → build, then
curl the route / `POST /api/ask` if server behavior changed.

## Test layout & conventions

`*.test.ts` next to the subject (vitest, node env, `@` alias in
`vitest.config.ts`). Conventions that matter:
- **Compute expectations from the data, don't hardcode** (e.g. per-year lead
  counts come from `databaseForYear(y).leads.length`). Exception:
  `auth.test.ts` hardcodes the Betcher opportunity count (12) — update it when
  changing mock deals.
- Security tests are behavioral: a malicious `SqlGenerator` double proves the
  guard sits between any generator and the DB; hand-written cross-BU SQL
  proves the views scope rows.
- When adding a lint rule or invariant, **negative-test it** with a throwaway
  fixture file, confirm it fires, delete the fixture.

## ESLint (`eslint.config.mjs`) — what's enforced beyond the Next presets

- Hygiene: `eqeqeq`, `no-console` (warn/error ok), `prefer-const`,
  `object-shorthand`, `no-unused-vars` (error, `^_` escape),
  `consistent-type-imports` (inline), `import/order` (alphabetized),
  `import/no-duplicates`, `import/no-cycle`.
- **Type-aware** (projectService; surgical, not full strictTypeChecked):
  `no-floating-promises`, `no-misused-promises`, `await-thenable`,
  `prefer-nullish-coalescing`.
- **jsdoc/require-jsdoc** (error) on exported functions/classes/interfaces/
  type aliases — the codebase is at 100% coverage; keep it there.
  ⚠ `eslint --fix` for this rule inserts EMPTY `/** */` stubs — always replace
  them with real content.
- **jsx-a11y** additions: click-events-have-key-events,
  no-static-element-interactions, no-noninteractive-element-interactions,
  interactive-supports-focus, etc. `no-autofocus` deliberately NOT enabled
  (dialog focus management).
- **@vitest plugin** on `*.test.ts`: `no-focused-tests` (error — `.only`
  can't silently skip CI), `expect-expect`, `no-identical-title`.
- **Architecture rule**: components/pages can't import `@/lib/crm/sql/*`
  except `sql/types` (see architecture.md).

## Environment facts

- Node v26; better-sqlite3 v12 has working prebuilds (verify after
  reinstalls: `node -e "require('better-sqlite3')"`).
- Next 16 auto-externalizes better-sqlite3 (no `serverExternalPackages`
  config needed).
- `.env*` files load from the **repo root** (not src/); all `.env*` are
  gitignored; none exist yet — `ANTHROPIC_API_KEY` goes in `.env.local` when
  the real LLM lands.
- This is a **modified Next.js 16** — read `node_modules/next/dist/docs/`
  before using unfamiliar framework APIs.
