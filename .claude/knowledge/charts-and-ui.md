# Charts & UI (`components/crm`)

Hand-rolled SVG/HTML — no chart library. Keep it that way unless the user
asks; the charts are small and fully theme/token aware.

## Component altitude

- Top level: `crm-dashboard.tsx` (orchestrator) + feature widgets
  (`assistant-bar`, `view-controls`, `glossary-modal`).
- `dashboards/`: the two tab layouts — they own per-tab filter state and call
  the query facades.
- `charts/`: combo (bar+line), pie, h-bars + shared `chart-tooltip`.
- `ui/`: panel, kpi-card, data-table, dashboard-header (the dropdown bar),
  theme-scope.

## Combo chart (`charts/combo-chart.tsx`)

- Fixed coordinate space `W=360 H=250` scaling to container width. **Keep the
  viewBox near the real rendered panel width** — it was once 600 and all text
  rendered ~half size. Generous `PAD.left/bottom` because the rotated x-labels
  ("New→MQL") extend down-left; `overflow-visible` on the svg as a safety net.
- Hover = one transparent full-height `<rect>` per category showing ALL series
  values for that column in one tooltip.
- `highlight` indices paint bars in the `warn` token (over-target).

## Pie chart hydration trap

Slice/label coordinates come from `Math.cos/sin`, which can differ by one ULP
between Node and browser → different serialized attribute strings → React
hydration mismatch. `pointAt()` therefore **rounds to 3 decimals**. Any new
trig/float-derived SVG attribute must round the same way. (Pure arithmetic
like the bar charts is deterministic and safe.)

## Tooltips (`charts/chart-tooltip.tsx`)

`useChartTooltip()` → `{ wrapRef, tip, show, hide }`; put `wrapRef` +
`onMouseLeave={hide}` on a `relative` wrapper, call `show(e, title, rows)`
from element handlers, render `<ChartTooltip tip={tip}/>` inside the wrapper.
X is clamped to the wrapper so it can't spill past the panel edge.

## A11y patterns (lint-enforced — see eslint jsx-a11y rules)

- Chart hover wrappers/targets are mouse-only *enhancements*: mark them
  `role="presentation"` and ensure every value is ALSO visible as text
  (bar value labels, pie centroid % + legend, h-bar inline %). In h-bars the
  handler sits on a presentational div inside the `<li>`, not on the li.
- Modal: `role="dialog"` + `aria-modal`; the scrim is `aria-hidden` with
  Escape + a focusable ✕ for keyboard dismissal. `autoFocus` on the filter
  input is intentional (rule disabled with a comment).
- Tabs/segmented controls use `role="tab(list)"`/`aria-pressed`.

## Header dropdowns (`ui/dashboard-header.tsx`)

Every field is the SAME `<select>`-based `HeaderFilter` ({label, value,
options, onChange, disabled?}). There was once a separate "static" field
variant — it could never stay pixel-aligned with native selects; don't
reintroduce one. Locked state = `disabled` (muted underline/chevron).

## Misc

- `data-table.tsx` rows are `ReactNode[][]` aligned per `columns[i].align`.
- Assistant SQL-mode result table is intentionally inline markup copying the
  data-table token classes (response columns don't fit the `Column` type).
