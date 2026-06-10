// Presentation formatting. Selectors call these so components receive
// ready-to-render strings and never deal with raw numbers.

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC", // stable regardless of server locale
});

/** Full USD, no cents: 12000000 -> "$12,000,000". */
export function formatUsd(n: number): string {
  return usd0.format(n);
}

/** Compact USD in millions, one decimal: 19000000 -> "$19.0M". */
export function formatUsdM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

/** Whole-number percent: 71.4 -> "71%". */
export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

/** ISO date -> "Mar 01, 2025". */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Day count with one decimal: 1.5 -> "1.5". */
export function formatDays(n: number): string {
  return n.toFixed(1);
}
