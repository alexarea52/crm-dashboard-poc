// View-layer (presentation) types. These are what the chart/table/KPI
// components consume. They are *derived* from the canonical model by the
// selectors — never stored. Keeping them separate from the canonical entities
// is the core idea: raw merged data stays numeric + typed, formatting and
// shaping happen on the way to the screen.

/** A headline metric card's content. */
export interface Kpi {
  label: string;
  /** Pre-formatted display value, e.g. "$19.0M". */
  value: string;
  /** Optional secondary line, e.g. "(80%)". */
  sub?: string;
}

/**
 * Semantic color role. The view layer maps these to themeable CSS tokens, so
 * the data layer never names a concrete color — that's what makes the whole
 * dashboard re-skinnable per business unit.
 */
export type SeriesRole = "primary" | "secondary" | "target" | "warn";

/** Semantic pie-slice tone, resolved to a themeable CSS token by the chart. */
export type PieTone = "primary" | "secondary" | "accent" | "target" | "muted";

/** One pie slice. */
export interface PieDatum {
  label: string;
  /** Percentage 0–100. */
  value: number;
  tone: PieTone;
}

/** One horizontal bar (label + percentage). */
export interface HBar {
  label: string;
  /** Percentage 0–100. */
  value: number;
}

/** A bar series for the combo (bar + line) chart. */
export interface BarSeries {
  name: string;
  role: SeriesRole;
  values: number[];
  /** Category indices to paint in the "over target" highlight color. */
  highlight?: number[];
}

/** A line series overlaid on the combo chart. */
export interface LineSeries {
  name: string;
  role: SeriesRole;
  values: number[];
  dashed?: boolean;
}

/** Data for the combined bar + line chart. */
export interface ComboChart {
  categories: string[];
  bars: BarSeries[];
  lines?: LineSeries[];
}

/** A data-table column header (alignment applies to its cells too). */
export interface Column {
  header: string;
  align?: "left" | "right" | "center";
}

/** A display-only filter control in the dashboard header. */
export interface Filter {
  label: string;
  value: string;
}
