// Domain types for the Area52 dashboard.
// Area52 turns job changes in your network into sourced pipeline.

export type Signal = "hot" | "warm" | "new";

export type AccountType = "customer" | "open-opp" | "target" | "regular";

export type Trend = "up" | "down" | "flat";

/** A headline metric shown in a StatCard. */
export interface Metric {
  label: string;
  /** Pre-formatted display value, e.g. "$5.1M" or "298". */
  value: string;
  /** Optional secondary line, e.g. "45 deals · 15% win". */
  caption?: string;
  /** Optional delta line, e.g. "+18% vs last Q". */
  delta?: string;
  trend?: Trend;
  /** Render the value in the accent/brand color to draw the eye. */
  emphasis?: boolean;
}

/** A single stage in the pipeline funnel. */
export interface FunnelStage {
  label: string;
  /** Numeric amount in dollars, used for bar width + formatting. */
  amount: number;
  /** Visual treatment of the bar. */
  tone?: "brand" | "muted" | "dark" | "accent";
}

/** A slice of a donut / proportion chart. */
export interface Slice {
  label: string;
  /** 0–100 percentage. */
  value: number;
  color?: string;
}

/** A labelled, value-ranked horizontal bar (e.g. top accounts). */
export interface RankedItem {
  label: string;
  value: number;
  /** Highlight this row in the accent color. */
  highlight?: boolean;
}

/** A vertical bar (e.g. activity by rep). */
export interface SeriesPoint {
  label: string;
  value: number;
}

/** A two-part segmented bar (e.g. contacted vs not-yet). */
export interface SegmentPoint {
  label: string;
  /** Primary segment value. */
  value: number;
  /** Total the value is a fraction of. */
  total: number;
}

/** A person in your network who recently changed jobs. */
export interface Mover {
  id: string;
  name: string;
  /** Initials for the avatar; derived from name if omitted. */
  initials?: string;
  title: string;
  /** Company they moved away from. */
  fromCompany?: string;
  /** Company they just joined (a tracked / target account). */
  toCompany: string;
  signal: Signal;
}
