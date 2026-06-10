# Source layout

```
app/
  page.tsx              home — links to the dashboard
  crm-dashboard/        /crm-dashboard route (entry: components/crm/crm-dashboard)
  api/ask/              POST /api/ask — text-to-SQL endpoint (server-only)

components/
  crm/
    crm-dashboard.tsx   client orchestrator: persona/BU/tab state, theming
    assistant-bar.tsx   "Ask your CRM" chat (Mock ↔ SQL engine toggle)
    view-controls.tsx   "View as" persona switch (demo auth)
    glossary-modal.tsx  in-app glossary of funnel/sales terms
    dashboards/         the two tab layouts (lead management, sales funnel)
    charts/             hand-rolled SVG charts + shared hover tooltip
    ui/                 panel, KPI card, data table, header band, ThemeScope

lib/
  cn.ts                 classnames joiner
  crm/
    index.ts            public barrel — client components import "@/lib/crm"
    data/               canonical model, mock data, per-year datasets,
                        connector + business-unit registries
    access/             sessions/roles, BU scoping, financial gating, filters
    presentation/       view types + selectors/queries (raw data → render-ready)
    assistant/          mock keyword assistant + glossary content
    sql/                text-to-SQL pipeline (SERVER-ONLY: schema, seed,
                        guard, session views, generator, /api/ask backing).
                        Not re-exported from the barrel; sql/types.ts is the
                        one client-safe module.
```

Conventions:
- Tests sit next to their subject (`*.test.ts`, Vitest, `npm test`).
- Theming: components use `crm-*` token classes / `var(--color-crm-*)`;
  per-business-unit values are applied by `ThemeScope` (see `globals.css`).
- `lib/crm/sql/` must never be imported from client components.
