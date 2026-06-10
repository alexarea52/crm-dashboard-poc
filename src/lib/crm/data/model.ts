// Canonical, source-agnostic CRM model.
//
// Every record that can come from more than one system carries its provenance
// (`sources`) and a stable canonical `id` assigned at ingest. Source-specific
// field names are mapped to this shape by per-connector adapters (not modeled
// here). Amounts/dates are stored RAW (numbers / ISO strings) — formatting is
// a view concern handled by the selectors.

import type { ConnectorId } from "./connectors";

/** Provenance for one contributing system: its native id + last sync time. */
export interface SourceRef {
  connector: ConnectorId;
  /** The record's primary key in that system (for re-sync + audit). */
  externalId: string;
  syncedAt: string; // ISO
}

/** Base shape: a canonical id plus the 1..n systems that contributed to it. */
export interface Merged {
  id: string;
  sources: SourceRef[];
}

/** OEM = original-equipment deals; Aftermarket = parts/service; Both = mixed. */
export type MarketSegment = "OEM" | "Aftermarket" | "Both";

/** Acquisition channel a lead arrived through. */
export type LeadChannel =
  | "Bulk Upload"
  | "Website"
  | "Referral Within"
  | "Referral Across"
  | "Aftermarket";

/** Opportunity pipeline stage, from first scoping to a terminal won/lost. */
export type DealStage =
  | "Scoping"
  | "Concepting"
  | "Designing"
  | "Quoting"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

/** A company. Identity resolution across systems collapses to one Account. */
export interface Account extends Merged {
  name: string;
  /** HQ country. Per-deal country lives on the Opportunity. */
  country: string;
  segment: MarketSegment;
  /** Existing customer vs net-new logo — drives the new/existing split. */
  isCustomer: boolean;
}

/** A deal / quote. Drives the deal tables and (in production) the funnel KPIs. */
export interface Opportunity extends Merged {
  name: string;
  accountId: string;
  /** References a BusinessUnit id in the registry (see business-units.ts). */
  businessUnitId: string;
  /** Customer country for this specific deal. */
  customerCountry: string;
  segment: MarketSegment;
  endUser?: string;
  endUserCountry?: string;
  stage: DealStage;
  createdAt: string; // ISO
  projectedCloseAt: string; // ISO
  quotedValue: number; // raw USD
  marginValue: number; // raw USD
  /** Stored explicitly (margin % is a source field, not derivable from $). */
  marginPct: number;
}

/** How far a lead progressed. */
export type LeadStageRow = "lead" | "mql" | "sql" | "opp";

/**
 * A single inbound lead with all the dimensions the lead-management filters
 * slice on. The lead funnel views (KPIs, Leads by Source, Source Details, New
 * vs Existing) are aggregated from these rows, so every filter is real.
 */
export interface LeadRecord extends Merged {
  businessUnitId: string;
  segment: MarketSegment;
  channel: LeadChannel;
  /** Grouping over channels, e.g. "Paid", "Organic", "Referral". */
  sourceType: string;
  campaign: string;
  customerName: string;
  customerCountry: string;
  customerType: "customer" | "prospect";
  stage: LeadStageRow;
  createdAt: string;
  /** Attributed deal value (0 until the lead reaches the relevant stage). */
  quotedValue: number;
  projectedQuoteValue: number;
  bookedValue: number;
}

/** Per-channel marketing spend + source-type grouping (a small lookup). */
export interface ChannelMeta {
  channel: LeadChannel;
  sourceType: string;
  cost: number;
}

/**
 * Per-channel lead performance — a *derived* aggregate computed from the lead
 * records (see selectors.aggregateChannels), the source of the "Source Details"
 * table and the lead-funnel KPIs.
 */
export interface ChannelPerformance {
  channel: LeadChannel;
  sourceType: string;
  cost: number;
  leads: number;
  mqls: number;
  sqls: number;
  opportunities: number;
  projectedQuoteValue: number;
  quotedValue: number;
  bookedValue: number;
}

/** One point in a monthly metric series ($M, or a unitless ratio). */
export interface MonthlyPoint {
  month: string;
  value: number;
}

/** A stage-transition timing, actual vs target (lower is better). */
export interface StageTiming {
  stage: string;
  actualDays: number;
  targetDays: number;
}

/**
 * Business-wide rollups that arrive pre-aggregated from the warehouse rather
 * than from the row-level sample above — the real totals span far more records
 * than we mock here. Kept explicit and honest about that boundary.
 */
export interface FunnelRollups {
  openQuotesValue: number;
  bookedValue: number;
  lostOrderValue: number;
  winRatePct: number;
  aopAttainmentPct: number;
  bookingsThisYear: MonthlyPoint[];
  bookingsPriorYear: MonthlyPoint[];
  openQuotes: MonthlyPoint[];
  aopTarget: MonthlyPoint[];
  coverageRatio: MonthlyPoint[];
}

/** Corporate-wide lead-funnel aggregates (warehouse feed, not derivable). */
export interface LeadRollups {
  /** % of leads tied to net-new customers (the rest are existing). */
  newCustomerPct: number;
  avgTimeByStage: StageTiming[];
  aftermarketAvgTimeByStage: StageTiming[];
}

/**
 * The merged dataset: the single in-memory shape the whole UI reads from. Swap
 * `mock-data` for a real loader (connector adapters + identity resolution +
 * merge) and nothing downstream changes.
 */
export interface CrmDatabase {
  accounts: Account[];
  opportunities: Opportunity[];
  leads: LeadRecord[];
  channelMeta: ChannelMeta[];
  leadRollups: LeadRollups;
  funnelRollups: FunnelRollups;
}
