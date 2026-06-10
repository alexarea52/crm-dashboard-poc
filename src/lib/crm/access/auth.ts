// Very basic role / data-scoping layer.
//
// A Session carries a role and the set of business units the user may see.
// `scopeDb` narrows the merged database to those units; `canSeeFinancials`
// gates cost/margin columns. This is intentionally simple (no real auth) — it
// exists to demonstrate how gating threads through the data + UI. A real
// implementation would derive Session from an auth provider.

import { businessUnits } from "../data/business-units";
import type { CrmDatabase } from "../data/model";

/** Coarse capability tier; data visibility itself comes from businessUnitIds. */
export type Role = "bu_user" | "bu_manager" | "admin";

/** An authenticated user's identity + what they may see (mock for demo). */
export interface Session {
  id: string;
  name: string;
  role: Role;
  /** Business-unit ids this user is permitted to see. */
  businessUnitIds: string[];
}

/** Human-readable role names for the UI banner. */
export const roleLabel: Record<Role, string> = {
  bu_user: "Business-unit user",
  bu_manager: "Multi-BU manager",
  admin: "Administrator",
};

/** Keys of the pre-baked demo sessions behind the "View as" toggle. */
export type DemoPersona = "single" | "multi" | "admin";

const allBuIds = businessUnits.map((b) => b.id);

/** Pre-baked sessions behind the "View as" demo toggle. */
export const demoSessions: Record<DemoPersona, Session> = {
  single: {
    id: "u-dana",
    name: "Dana — Betcher Sales",
    role: "bu_user",
    businessUnitIds: ["betcher"],
  },
  multi: {
    id: "u-morgan",
    name: "Morgan — Regional Manager",
    role: "bu_manager",
    businessUnitIds: ["wyma", "betcher"],
  },
  admin: {
    id: "u-alex",
    name: "Alex — Administrator",
    role: "admin",
    businessUnitIds: allBuIds,
  },
};

/** Cost/margin economics are restricted to admins in this demo. */
export function canSeeFinancials(session: Session): boolean {
  return session.role === "admin";
}

/** Can the user pick among business units, or are they locked to one? */
export function canSwitchBusinessUnit(session: Session): boolean {
  return session.businessUnitIds.length > 1;
}

/**
 * Narrow the database to a set of visible business units. Opportunities are
 * filtered by `businessUnitId`; aggregate channel/funnel rollups are corporate
 * feeds and left intact (a production system would recompute them per scope).
 */
export function scopeDb(
  db: CrmDatabase,
  visibleBusinessUnitIds: string[],
): CrmDatabase {
  const allowed = new Set(visibleBusinessUnitIds);
  return {
    ...db,
    opportunities: db.opportunities.filter((o) => allowed.has(o.businessUnitId)),
    leads: db.leads.filter((l) => allowed.has(l.businessUnitId)),
  };
}
