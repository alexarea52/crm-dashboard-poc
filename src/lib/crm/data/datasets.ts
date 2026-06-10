// Per-year datasets. The "Creation Date" / "Date" dropdowns pick a year, and
// this derives that year's CrmDatabase from the base mock by scaling the
// numbers and rebasing the deal dates. Cheap + deterministic, so it can run in
// render. Swap for real per-year queries against the warehouse later.

import { crmDb } from "./mock-data";
import type { CrmDatabase, FunnelRollups } from "./model";

/** Years selectable in the date dropdowns (and seeded into the SQL layer). */
export const availableYears = ["2024", "2025", "2026"] as const;
/** One of the selectable mock years. */
export type Year = (typeof availableYears)[number];

interface YearMeta {
  /** Revenue/volume scale relative to the 2025 base. */
  factor: number;
  winRatePct: number;
  aopAttainmentPct: number;
  newCustomerPct: number;
}

const YEAR_META: Record<Year, YearMeta> = {
  "2024": { factor: 0.82, winRatePct: 54, aopAttainmentPct: 96, newCustomerPct: 16 },
  "2025": { factor: 1, winRatePct: 60, aopAttainmentPct: 108, newCustomerPct: 20 },
  "2026": { factor: 1.18, winRatePct: 63, aopAttainmentPct: 115, newCustomerPct: 24 },
};

// Largest factor — lead counts slice a fraction of the base (≤ 100%).
const MAX_FACTOR = 1.18;

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const withYear = (iso: string, year: string | number) => `${year}${iso.slice(4)}`;

function scaleFunnel(f: FunnelRollups, meta: YearMeta): FunnelRollups {
  const scale = (pts: { month: string; value: number }[]) =>
    pts.map((p) => ({ ...p, value: r1(p.value * meta.factor) }));
  return {
    openQuotesValue: r0(f.openQuotesValue * meta.factor),
    bookedValue: r0(f.bookedValue * meta.factor),
    lostOrderValue: r0(f.lostOrderValue * meta.factor),
    winRatePct: meta.winRatePct,
    aopAttainmentPct: meta.aopAttainmentPct,
    bookingsThisYear: scale(f.bookingsThisYear),
    bookingsPriorYear: scale(f.bookingsPriorYear),
    openQuotes: scale(f.openQuotes),
    aopTarget: scale(f.aopTarget),
    coverageRatio: f.coverageRatio, // a ratio — not scaled by the revenue factor
  };
}

/** The merged database as it looked (or is projected) for a given year. */
export function databaseForYear(year: Year): CrmDatabase {
  const meta = YEAR_META[year];
  const f = meta.factor;

  return {
    ...crmDb,
    opportunities: crmDb.opportunities.map((o) => {
      const createY = Number(o.createdAt.slice(0, 4));
      const closeY = Number(o.projectedCloseAt.slice(0, 4));
      // Preserve the create→close span; anchor creation to the selected year.
      const closeYear = Number(year) + (closeY - createY);
      return {
        ...o,
        createdAt: withYear(o.createdAt, year),
        projectedCloseAt: withYear(o.projectedCloseAt, closeYear),
        quotedValue: r0(o.quotedValue * f),
        marginValue: r0(o.marginValue * f),
      };
    }),
    // Scale lead volume (by slicing a stable prefix — the channel/stage
    // patterns repeat, so proportions hold) and lead values by the year factor.
    leads: crmDb.leads
      .slice(0, Math.round(crmDb.leads.length * (f / MAX_FACTOR)))
      .map((l) => ({
        ...l,
        createdAt: withYear(l.createdAt, year),
        quotedValue: r0(l.quotedValue * f),
        projectedQuoteValue: r0(l.projectedQuoteValue * f),
        bookedValue: r0(l.bookedValue * f),
      })),
    channelMeta: crmDb.channelMeta,
    leadRollups: { ...crmDb.leadRollups, newCustomerPct: meta.newCustomerPct },
    funnelRollups: scaleFunnel(crmDb.funnelRollups, meta),
  };
}
