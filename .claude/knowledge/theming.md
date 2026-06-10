# Theming (per business unit)

Color is fully token-driven; re-skinning a BU is a data change.

## The pipeline

```
business-units.ts (BusinessUnitTheme per BU)
  → ThemeScope sets inline --crm-* CSS variables on a wrapper div
    → globals.css @theme inline maps --color-crm-*: var(--crm-*)
      → Tailwind utilities (bg-crm-primary, border-crm-accent, …)
      → SVG attributes use var(--color-crm-*) directly
```

Two variable families in `globals.css`:
- **Brand tokens** (overridden per BU by ThemeScope): `--crm-primary`,
  `--crm-primary-hover`, `--crm-accent`, `--crm-series-2`, `--crm-target`,
  `--crm-warn`, `--crm-muted`.
- **Neutral tokens** (fixed): surfaces, borders, grid/axis, table colors.

## Color never lives in data

Chart series carry semantic roles, not colors:
- `BarSeries`/`LineSeries.role: "primary" | "secondary" | "target" | "warn"`
- `PieDatum.tone: "primary" | "secondary" | "accent" | "target" | "muted"`

Charts map role→token via small `ROLE_VAR`/`TONE_VAR` records. Selectors and
mock data must never emit hex. If a new visual state is needed, add a token +
role, don't inline a color.

## Recipes

- **Add a business unit**: append to `businessUnits` in
  `lib/crm/data/business-units.ts` (id slug, name, logoText, 7 theme colors).
  Everything else — header dropdown options, ThemeScope, scoping — picks it up.
  Give its data a matching `businessUnitId` in mock-data.
- **Add a themeable color**: add `--crm-x` to `:root` + `--color-crm-x` to
  `@theme inline` in `globals.css`, a field in `BusinessUnitTheme`, a line in
  `themeVars()`, and values per BU.

## Gotchas

- `businessUnitById()` falls back to the corporate unit for unknown ids — the
  "All" pseudo-unit (`corporateBusinessUnit`, id `"all"`) is the default
  navy/green theme and is NOT in the `businessUnits` array.
- Tailwind arbitrary hex (`bg-[#…]`) is banned by convention in
  `components/crm` — there are currently zero; keep it that way.
- The single non-token color left is the route canvas `bg-[#eef1f5]` in
  `app/crm-dashboard/page.tsx`.
