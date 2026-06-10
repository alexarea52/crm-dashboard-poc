// Session-scoped TEMP VIEWs — layers 1–2 of the defense-in-depth stack.
//
// Generated SQL only ever references these views (the guard allowlists their
// names), and each view bakes the session's permissions into its definition:
//   - row filter: business_unit_id IN (…the session's allowed BUs…)
//   - column pruning: financial columns simply don't exist for non-admins
// So even a guard bypass can't reach other BUs' rows or gated columns — the
// data isn't addressable through any relation the query can name.

import type Database from "better-sqlite3";
import { viewColumns } from "./schema";
import { type Session } from "../access/auth";
import { businessUnitById } from "../data/business-units";

/** The only relation names generated SQL may reference (guard allowlist). */
export const EXPOSED_VIEWS: ReadonlySet<string> = new Set([
  "leads",
  "opportunities",
  "accounts",
  "channels",
]);

/** Validate against the registry, then quote as a SQL string literal. */
function buLiterals(session: Session): string {
  const ids = session.businessUnitIds.filter(
    (id) => businessUnitById(id).id === id, // unknown ids resolve to corporate fallback
  );
  if (ids.length === 0) return "''"; // matches nothing
  return ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(", ");
}

/** Rejects promise types so an async callback is a compile-time error. */
type NotPromise<T> = T extends Promise<unknown> ? never : T;

/**
 * Create the session's views, run `fn`, and always drop them.
 *
 * INVARIANT: `fn` must be SYNCHRONOUS (the `NotPromise` return type makes an
 * async callback a compile error — do not relax it). better-sqlite3 is
 * synchronous, so the create→query→drop sequence cannot interleave with
 * another request on the shared connection as long as nothing yields to the
 * event loop in between.
 */
export function withSessionViews<T>(
  db: Database.Database,
  session: Session,
  fn: () => NotPromise<T>,
): NotPromise<T> {
  const cols = viewColumns(session);
  const bus = buLiterals(session);

  db.exec(`
    CREATE TEMP VIEW leads AS
      SELECT ${cols.leads.join(", ")} FROM raw_leads
      WHERE business_unit_id IN (${bus});
    CREATE TEMP VIEW opportunities AS
      SELECT ${cols.opportunities.join(", ")} FROM raw_opportunities
      WHERE business_unit_id IN (${bus});
    CREATE TEMP VIEW accounts AS
      SELECT ${cols.accounts.join(", ")} FROM raw_accounts;
    CREATE TEMP VIEW channels AS
      SELECT ${cols.channels.join(", ")} FROM raw_channel_meta;
  `);

  try {
    return fn();
  } finally {
    db.exec(`
      DROP VIEW IF EXISTS temp.leads;
      DROP VIEW IF EXISTS temp.opportunities;
      DROP VIEW IF EXISTS temp.accounts;
      DROP VIEW IF EXISTS temp.channels;
    `);
  }
}
