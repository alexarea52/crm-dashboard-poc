# Knowledge base

Dense, non-obvious context for working on this codebase — invariants, gotchas,
"why" decisions, and extension recipes. Read the file matching your task
before changing that area. `src/README.md` has the plain directory map; these
files carry what the map can't.

| File | Read when you're touching… |
| --- | --- |
| [architecture.md](architecture.md) | anything — start here; layering rules + data flow |
| [data-layer.md](data-layer.md) | `lib/crm/{data,presentation}` — model, mock generation, years, selectors |
| [auth-and-scoping.md](auth-and-scoping.md) | `lib/crm/access` — sessions, BU scoping, financial gating |
| [theming.md](theming.md) | colors anywhere — tokens, ThemeScope, per-BU themes |
| [text-to-sql.md](text-to-sql.md) | `lib/crm/sql`, `/api/ask` — pipeline, security layers, the LLM swap |
| [charts-and-ui.md](charts-and-ui.md) | `components/crm` — SVG charts, tooltips, a11y patterns |
| [testing-and-tooling.md](testing-and-tooling.md) | tests, ESLint config, verification workflow |

Maintenance: these files describe *intent and invariants*, not line-by-line
code. Update them when an invariant or recipe changes, not for routine edits.
