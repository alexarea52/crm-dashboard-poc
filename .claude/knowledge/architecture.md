# Architecture

POC of a CRM dashboard ("Lead Management" + "Sales Funnel" tabs) replicating a
client wireframe PDF, with mock auth, per-business-unit theming, working
filters, and a real text-to-SQL pipeline behind a stub LLM. Built on a
**modified Next.js 16** — always read `node_modules/next/dist/docs/` before
using framework APIs you haven't used here yet (per AGENTS.md).

## Layering (lib/crm)

```
data/          canonical entities + mock data + registries   (imports nothing above)
access/        sessions, scoping, gating, filters            (imports data/)
presentation/  view types + selectors/queries                (imports data/, access/)
assistant/     mock keyword assistant + glossary             (imports all above)
sql/           text-to-SQL — SERVER-ONLY                     (imports data/, access/)
index.ts       client-facing barrel (everything EXCEPT sql/)
```

Rules that must hold:
- **`sql/` is never imported from client components** — it would pull
  better-sqlite3 into the bundle. ESLint enforces this (`no-restricted-imports`
  in `eslint.config.mjs`); the one exception is `sql/types.ts` (type-only wire
  types + example questions).
- **No layer imports upward**; `import/no-cycle` backs this.
- **Selectors emit semantic color roles, never hex** — color is a view-layer
  concern resolved from CSS tokens (see theming.md).
- **Raw data stays numeric/ISO**; formatting happens in
  `presentation/format.ts` on the way to the screen.

## Data flow (UI)

```
crm-dashboard.tsx (client orchestrator)
  owns: persona (View-as demo auth), selectedBu, active tab
  computes: session, visibleBuIds, theme
    └── dashboards/* own per-tab state: year + lead/deal filter
          db = filter…(scopeDb(databaseForYear(year), visibleBuIds))
          view model = getLeadDashboard/getFunnelDashboard(db, session)
```

Everything below the orchestrator is props-driven; there is no context/store.
The assistant bar gets a separately scoped db (default year 2025) plus the
persona key for the SQL API.

## Honest boundaries (by design, commented in code)

- Funnel KPI cards + monthly trend charts come from **corporate rollup feeds**
  scaled per year — they respond to the Year dropdown but NOT to
  segment/customer filters (those scope the deal tables only). Same for the
  two Avg-Time-by-Stage charts.
- SQL-mode answers are computed from row-level tables and can differ from the
  rollup-driven dashboard KPIs.

## History quirks worth knowing

- A `/demo` route (Area52 component showcase) existed and was fully deleted;
  don't resurrect its patterns. `lib/cn.ts` survives as the lone shared util.
- The wireframe PDF lives in gitignored `.context/attachments/`; rendered page
  PNGs in `.context/wireframes/` (also gitignored — regenerate with pdftoppm
  if needed).
