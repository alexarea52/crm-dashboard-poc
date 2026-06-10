// Selectors: pure functions that turn the merged CrmDatabase into the
// view-layer shapes the components render. Aggregation + formatting live here;
// the canonical data stays raw + numeric. Crucially, selectors emit semantic
// color *roles* (not concrete colors) so the output is theme-agnostic.

import { formatDate, formatPct, formatUsd, formatUsdM } from "./format";
import type { Column, ComboChart, HBar, Kpi, PieDatum } from "./view";
import { businessUnitById } from "../data/business-units";
import type {
  ChannelPerformance,
  CrmDatabase,
  LeadRecord,
  MarketSegment,
  StageTiming,
} from "../data/model";

const sum = <T>(arr: T[], f: (x: T) => number) =>
  arr.reduce((acc, x) => acc + f(x), 0);

const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

const segmentLabel: Record<MarketSegment, string> = {
  OEM: "OEM",
  Aftermarket: "After",
  Both: "Both",
};

/* -------------------------- Lead Management ------------------------------- */

const isMql = (l: LeadRecord) =>
  l.stage === "mql" || l.stage === "sql" || l.stage === "opp";
const isSql = (l: LeadRecord) => l.stage === "sql" || l.stage === "opp";
const isOpp = (l: LeadRecord) => l.stage === "opp";

/** Roll lead records up into per-channel performance (the derived aggregate). */
export function aggregateChannels(db: CrmDatabase): ChannelPerformance[] {
  return db.channelMeta.map((meta) => {
    const rows = db.leads.filter((l) => l.channel === meta.channel);
    return {
      channel: meta.channel,
      sourceType: meta.sourceType,
      cost: meta.cost,
      leads: rows.length,
      mqls: rows.filter(isMql).length,
      sqls: rows.filter(isSql).length,
      opportunities: rows.filter(isOpp).length,
      projectedQuoteValue: sum(rows, (r) => r.projectedQuoteValue),
      quotedValue: sum(rows, (r) => r.quotedValue),
      bookedValue: sum(rows, (r) => r.bookedValue),
    };
  });
}

/** The four lead-funnel headline KPIs (MQLs, conversions, quoted value). */
export function selectLeadKpis(db: CrmDatabase): Kpi[] {
  const leads = db.leads;
  const mqls = leads.filter(isMql).length;
  const sqls = leads.filter(isSql).length;
  const opps = leads.filter(isOpp).length;
  const quoted = sum(leads, (l) => l.quotedValue);
  return [
    { label: "MQLs Created", value: String(mqls) },
    { label: "MQLs Converted to SQL", value: String(sqls), sub: `(${pct(sqls, mqls)}%)` },
    { label: "SQLs Converted to Opp", value: String(opps), sub: `(${pct(opps, sqls)}%)` },
    { label: "Quoted Value", value: formatUsdM(quoted) },
  ];
}

/** New-vs-existing customer mix as pie slices (derived from lead rows). */
export function selectNewVsExisting(db: CrmDatabase): PieDatum[] {
  const total = db.leads.length || 1;
  const existing = db.leads.filter((l) => l.customerType === "customer").length;
  const newPct = Math.round(((total - existing) / total) * 100);
  return [
    { label: "New", value: newPct, tone: "primary" },
    { label: "Existing", value: 100 - newPct, tone: "muted" },
  ];
}

/** Each channel's share of inbound leads, as percentage bars. */
export function selectLeadsBySource(db: CrmDatabase): HBar[] {
  const channels = aggregateChannels(db);
  const total = sum(channels, (c) => c.leads);
  return channels.map((c) => ({ label: c.channel, value: pct(c.leads, total) }));
}

const sourceDetailsBaseColumns: Column[] = [
  { header: "Source" },
  { header: "MQL #", align: "right" },
  { header: "SQL #", align: "right" },
  { header: "Cost", align: "right" },
  { header: "Cost per MQL", align: "right" },
  { header: "Cost per SQL", align: "right" },
  { header: "Projected Quote Value", align: "right" },
  { header: "Quotes", align: "right" },
  { header: "Bookings", align: "right" },
];

// Indices of the cost/economics columns gated behind canSeeFinancials.
const COST_COLUMN_INDICES = [3, 4, 5];

/**
 * Source Details table. When `includeCost` is false the cost/economics columns
 * are dropped entirely (both header and cells) — financial gating.
 */
export function selectSourceDetails(
  db: CrmDatabase,
  includeCost: boolean,
): { columns: Column[]; rows: string[][] } {
  const fullRows = aggregateChannels(db).map((c) => [
    c.channel,
    String(c.mqls),
    String(c.sqls),
    formatUsd(c.cost),
    c.cost ? formatUsd(c.cost / c.mqls) : "–",
    c.cost ? formatUsd(c.cost / c.sqls) : "–",
    formatUsd(c.projectedQuoteValue),
    formatUsd(c.quotedValue),
    formatUsd(c.bookedValue),
  ]);

  if (includeCost) {
    return { columns: sourceDetailsBaseColumns, rows: fullRows };
  }

  const drop = new Set(COST_COLUMN_INDICES);
  const keep = <T>(row: T[]) => row.filter((_, i) => !drop.has(i));
  return {
    columns: keep(sourceDetailsBaseColumns),
    rows: fullRows.map(keep),
  };
}

function stageChart(timings: StageTiming[]): ComboChart {
  return {
    categories: timings.map((t) => t.stage),
    bars: [
      {
        name: "Avg days",
        role: "primary",
        values: timings.map((t) => t.actualDays),
        highlight: timings
          .map((t, i) => (t.actualDays > t.targetDays ? i : -1))
          .filter((i) => i >= 0),
      },
    ],
    lines: [
      { name: "Target", role: "target", values: timings.map((t) => t.targetDays) },
    ],
  };
}

/** Stage-timing chart for all segments (actual bars vs target line). */
export const selectAvgTimeByStage = (db: CrmDatabase): ComboChart =>
  stageChart(db.leadRollups.avgTimeByStage);

/** Stage-timing chart for the aftermarket segment only. */
export const selectAftermarketAvgTimeByStage = (db: CrmDatabase): ComboChart =>
  stageChart(db.leadRollups.aftermarketAvgTimeByStage);

/* ----------------------------- Sales Funnel ------------------------------- */

/** The five sales-funnel headline KPIs from the corporate rollups. */
export function selectFunnelKpis(db: CrmDatabase): Kpi[] {
  const f = db.funnelRollups;
  return [
    { label: "Open Quotes Value", value: formatUsdM(f.openQuotesValue) },
    { label: "Booked Value", value: formatUsdM(f.bookedValue) },
    { label: "Lost Order Value", value: formatUsdM(f.lostOrderValue) },
    { label: "Win Rate", value: formatPct(f.winRatePct) },
    { label: "% AOP Target", value: formatPct(f.aopAttainmentPct) },
  ];
}

/** Monthly bookings vs prior year (grouped bars + dashed PY trend line). */
export function selectBookingsVsPy(db: CrmDatabase): ComboChart {
  const f = db.funnelRollups;
  return {
    categories: f.bookingsThisYear.map((p) => p.month),
    bars: [
      { name: "This year", role: "primary", values: f.bookingsThisYear.map((p) => p.value) },
      { name: "Prior year", role: "secondary", values: f.bookingsPriorYear.map((p) => p.value) },
    ],
    lines: [
      { name: "PY trend", role: "target", values: f.bookingsPriorYear.map((p) => p.value), dashed: true },
    ],
  };
}

/** Monthly open quotes (bars) vs the AOP target (line). */
export function selectOpenQuotesVsAop(db: CrmDatabase): ComboChart {
  const f = db.funnelRollups;
  return {
    categories: f.openQuotes.map((p) => p.month),
    bars: [{ name: "Open quotes", role: "secondary", values: f.openQuotes.map((p) => p.value) }],
    lines: [{ name: "AOP", role: "primary", values: f.aopTarget.map((p) => p.value) }],
  };
}

/** Monthly coverage ratio (open pipeline ÷ remaining target) bars. */
export function selectCoverageRatio(db: CrmDatabase): ComboChart {
  const f = db.funnelRollups;
  return {
    categories: f.coverageRatio.map((p) => p.month),
    bars: [{ name: "Coverage", role: "secondary", values: f.coverageRatio.map((p) => p.value) }],
  };
}

/** Column spec for both deal tables (margin columns are gated upstream). */
export const dealColumns: Column[] = [
  { header: "Business Unit" },
  { header: "Opportunity Name" },
  { header: "Customer" },
  { header: "Customer Country" },
  { header: "OEM or After" },
  { header: "End User" },
  { header: "End User Country" },
  { header: "Stage" },
  { header: "Creation Date" },
  { header: "Projected Close Date" },
  { header: "Quoted Value ($USD)", align: "right" },
  { header: "Margin Value ($USD)", align: "right" },
  { header: "Margin %", align: "right" },
];

/** Top 10 open or booked deals by quoted value, as formatted table rows. */
export function selectDeals(
  db: CrmDatabase,
  kind: "open" | "booked",
): string[][] {
  const accountName = (id: string) =>
    db.accounts.find((a) => a.id === id)?.name ?? "—";

  const matches =
    kind === "booked"
      ? (stage: string) => stage === "Closed Won"
      : (stage: string) => stage !== "Closed Won" && stage !== "Closed Lost";

  return db.opportunities
    .filter((o) => matches(o.stage))
    .sort((a, b) => b.quotedValue - a.quotedValue)
    .slice(0, 10)
    .map((o) => [
      businessUnitById(o.businessUnitId).name,
      o.name,
      accountName(o.accountId),
      o.customerCountry,
      segmentLabel[o.segment],
      o.endUser ?? "–",
      o.endUserCountry ?? "–",
      o.stage,
      formatDate(o.createdAt),
      formatDate(o.projectedCloseAt),
      formatUsd(o.quotedValue),
      formatUsd(o.marginValue),
      `${o.marginPct}%`,
    ]);
}
