// SQLite schema for the text-to-SQL layer.
//
// Base tables are prefixed `raw_` and are NEVER exposed to generated SQL —
// queries run against per-session TEMP VIEWs (see views.ts) and the guard
// only allowlists the view names. Column names are snake_case (what SQL
// models expect). Fact tables carry a `year` column, warehouse-style, seeded
// from databaseForYear for every available year.
//
// The dashboard's pre-aggregated rollups (FunnelRollups/LeadRollups) are
// deliberately NOT loaded here: they're corporate-wide numbers that can't be
// recomputed per business-unit scope, so exposing them would leak cross-BU
// aggregates to scoped users. Aggregate questions are answered from the
// row-level tables with GROUP BY — which also means SQL-mode answers can
// differ slightly from the rollup-driven dashboard KPI cards.

import { canSeeFinancials, type Session } from "../access/auth";

/** CREATE statements for the raw_* base tables + indexes. */
export const DDL = `
CREATE TABLE raw_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  segment TEXT NOT NULL,
  is_customer INTEGER NOT NULL
);

CREATE TABLE raw_opportunities (
  id TEXT NOT NULL,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  business_unit_id TEXT NOT NULL,
  customer_country TEXT NOT NULL,
  segment TEXT NOT NULL,
  end_user TEXT,
  end_user_country TEXT,
  stage TEXT NOT NULL,
  created_at TEXT NOT NULL,
  projected_close_at TEXT NOT NULL,
  quoted_value REAL NOT NULL,
  margin_value REAL NOT NULL,
  margin_pct REAL NOT NULL,
  PRIMARY KEY (year, id)
);

CREATE TABLE raw_leads (
  id TEXT NOT NULL,
  year INTEGER NOT NULL,
  business_unit_id TEXT NOT NULL,
  segment TEXT NOT NULL,
  channel TEXT NOT NULL,
  source_type TEXT NOT NULL,
  campaign TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_country TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TEXT NOT NULL,
  quoted_value REAL NOT NULL,
  projected_quote_value REAL NOT NULL,
  booked_value REAL NOT NULL,
  PRIMARY KEY (year, id)
);

CREATE TABLE raw_channel_meta (
  channel TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  cost REAL NOT NULL
);

CREATE INDEX idx_leads_bu ON raw_leads (business_unit_id, year);
CREATE INDEX idx_opps_bu ON raw_opportunities (business_unit_id, year);
`;

/* ----------------------- Exposed (view) column lists ----------------------- */

// Single source of truth for which columns each session-scoped view exposes.
// Financial columns are appended only for sessions that pass canSeeFinancials.

const LEAD_COLUMNS = [
  "id", "year", "business_unit_id", "segment", "channel", "source_type",
  "campaign", "customer_name", "customer_country", "customer_type", "stage",
  "created_at", "quoted_value", "projected_quote_value", "booked_value",
];

const OPP_COLUMNS = [
  "id", "year", "name", "account_id", "account_name", "business_unit_id",
  "customer_country", "segment", "end_user", "end_user_country", "stage",
  "created_at", "projected_close_at", "quoted_value",
];
const OPP_FINANCIAL_COLUMNS = ["margin_value", "margin_pct"];

const ACCOUNT_COLUMNS = ["id", "name", "country", "segment", "is_customer"];

const CHANNEL_COLUMNS = ["channel", "source_type"];
const CHANNEL_FINANCIAL_COLUMNS = ["cost"];

/** Column lists each session-scoped view exposes (financials gated). */
export function viewColumns(session: Session) {
  const fin = canSeeFinancials(session);
  return {
    leads: LEAD_COLUMNS,
    opportunities: fin ? [...OPP_COLUMNS, ...OPP_FINANCIAL_COLUMNS] : OPP_COLUMNS,
    accounts: ACCOUNT_COLUMNS,
    channels: fin ? [...CHANNEL_COLUMNS, ...CHANNEL_FINANCIAL_COLUMNS] : CHANNEL_COLUMNS,
  };
}

/* ----------------------- Schema description (LLM prompt) ------------------- */

const COLUMN_NOTES: Record<string, string> = {
  stage: "leads.stage ∈ lead|mql|sql|opp (how far it qualified); opportunities.stage ∈ Scoping|Concepting|Designing|Quoting|Negotiation|Closed Won|Closed Lost",
  year: "fact year, one of 2024|2025|2026",
  segment: "OEM | Aftermarket | Both",
  customer_type: "customer | prospect",
};

/**
 * Markdown description of the views THIS session may query — fed to the
 * SqlGenerator (and, later, the LLM prompt). Gated columns simply don't
 * appear, so a correct generator never writes SQL that references them.
 */
export function describeSchemaFor(session: Session): string {
  const cols = viewColumns(session);
  const table = (name: keyof typeof cols, desc: string) =>
    `### ${name}\n${desc}\nColumns: ${cols[name].join(", ")}`;

  return [
    "## Queryable views (SQLite dialect; SELECT only)",
    table("leads", "One row per inbound lead, all years."),
    table("opportunities", "One row per deal (open + closed), all years."),
    table("accounts", "Reference: one row per company."),
    table("channels", "Reference: one row per marketing channel."),
    "## Notes",
    ...Object.entries(COLUMN_NOTES).map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n\n");
}
