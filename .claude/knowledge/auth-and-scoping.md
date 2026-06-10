# Auth, scoping & financial gating (`lib/crm/access`)

Demo-grade auth with production-shaped *enforcement points*. A real deployment
replaces session derivation, not the gating plumbing.

## Sessions & personas

`Session = { id, name, role, businessUnitIds }`. Three pre-baked
`demoSessions` behind the "View as" toggle (`view-controls.tsx`):

| persona  | role        | businessUnitIds        | financials |
| -------- | ----------- | ---------------------- | ---------- |
| `single` | bu_user     | `["betcher"]` (locked) | no         |
| `multi`  | bu_manager  | `["wyma","betcher"]`   | no         |
| `admin`  | admin       | all                    | yes        |

**`businessUnitIds` is the unit of data visibility; `role` only feeds
`canSeeFinancials` / `canSwitchBusinessUnit`.** Don't branch on role for data
scoping.

## The two gates and every place they thread through

1. **BU scoping** — `scopeDb(db, visibleBuIds)` filters `opportunities` AND
   `leads`. Applied: per-tab in both dashboards, in the assistant bar's db,
   and in SQL via the session views' `WHERE business_unit_id IN (…)`.
2. **Financial gating** — `canSeeFinancials(session)` (admin-only). Applied:
   - Source Details **Cost columns** dropped in `selectSourceDetails`
   - Deal-table **Margin columns** dropped in `getFunnelDashboard`
     (`MARGIN_COLUMN_INDICES` — index-based; update if `dealColumns` changes!)
   - mock assistant's cost answers refuse
   - stub generator refuses `requiresFinancials` patterns
   - SQL session views omit `cost`/`margin_value`/`margin_pct` entirely

When adding any new financial surface, wire it through **all** of these or it
leaks. Grep for `canSeeFinancials` to find the seams.

## UI wiring

- The header **Business Unit dropdown** (not a separate top control) drives
  both scope and theme; options = "All" + the session's allowed units;
  `disabled` when `businessUnitIds.length === 1`. State lives in
  `crm-dashboard.tsx` (`selectedBu`, with a guard against stale ids after a
  persona switch).
- The route handler maps `persona` → session **server-side**
  (`/api/ask`); the client's header BU selection is deliberately NOT sent —
  if you add that, intersect it with `session.businessUnitIds` server-side,
  never trust it alone.
