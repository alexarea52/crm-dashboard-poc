// Dashboard data facade. Components call these with a scoped database + the
// session, and get back fully-derived, gating-aware view models. This replaces
// the old eagerly-computed module constants, so the data can vary per
// business-unit scope / role / (eventually) filter.

import * as select from "./selectors";
import { dealColumns } from "./selectors";
import type { Column, ComboChart, HBar, Kpi, PieDatum } from "./view";
import { canSeeFinancials, type Session } from "../access/auth";
import type { CrmDatabase } from "../data/model";

/** Everything the Lead Management tab renders, fully derived + formatted. */
export interface LeadDashboard {
  /** The four headline metrics (MQLs, conversions, quoted value). */
  kpis: Kpi[];
  /** New-vs-existing customer pie slices. */
  newVsExisting: PieDatum[];
  /** Leads-by-channel share bars (percentages). */
  leadsBySource: HBar[];
  /** Source Details table; cost columns omitted for non-financial sessions. */
  sourceDetails: { columns: Column[]; rows: string[][] };
  /** Stage-timing chart, all segments (actual bars + target line). */
  avgTimeByStage: ComboChart;
  /** Stage-timing chart, aftermarket only. */
  aftermarketAvgTimeByStage: ComboChart;
}

/** Everything the Sales Funnel tab renders, fully derived + formatted. */
export interface FunnelDashboard {
  /** The five headline metrics (open/booked/lost value, win rate, AOP). */
  kpis: Kpi[];
  /** Monthly bookings vs prior year (grouped bars + trend line). */
  bookingsVsPy: ComboChart;
  /** Monthly open quotes vs AOP target (bars + line). */
  openQuotesVsAop: ComboChart;
  /** Monthly coverage-ratio bars. */
  coverageRatio: ComboChart;
  /** Deal-table headers; margin columns omitted for non-financial sessions. */
  dealColumns: Column[];
  /** Top 10 open deals by quoted value, formatted rows. */
  openDeals: string[][];
  /** Top 10 Closed Won deals by quoted value, formatted rows. */
  bookedDeals: string[][];
}

/** Derive the Lead Management view model from a scoped db + session. */
export function getLeadDashboard(
  db: CrmDatabase,
  session: Session,
): LeadDashboard {
  return {
    kpis: select.selectLeadKpis(db),
    newVsExisting: select.selectNewVsExisting(db),
    leadsBySource: select.selectLeadsBySource(db),
    sourceDetails: select.selectSourceDetails(db, canSeeFinancials(session)),
    avgTimeByStage: select.selectAvgTimeByStage(db),
    aftermarketAvgTimeByStage: select.selectAftermarketAvgTimeByStage(db),
  };
}

// Margin columns (Margin Value, Margin %) in the deal tables are financials.
const MARGIN_COLUMN_INDICES = new Set([11, 12]);

/** Derive the Sales Funnel view model from a scoped db + session. */
export function getFunnelDashboard(
  db: CrmDatabase,
  session: Session,
): FunnelDashboard {
  const includeMargin = canSeeFinancials(session);
  const keep = <T>(row: T[]) =>
    includeMargin ? row : row.filter((_, i) => !MARGIN_COLUMN_INDICES.has(i));

  return {
    kpis: select.selectFunnelKpis(db),
    bookingsVsPy: select.selectBookingsVsPy(db),
    openQuotesVsAop: select.selectOpenQuotesVsAop(db),
    coverageRatio: select.selectCoverageRatio(db),
    dealColumns: keep(dealColumns),
    openDeals: select.selectDeals(db, "open").map(keep),
    bookedDeals: select.selectDeals(db, "booked").map(keep),
  };
}
