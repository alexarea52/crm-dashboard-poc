/** Compact USD, e.g. 383000 -> "$383K", 5100000 -> "$5.1M". */
export function formatUsdCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Plain number with thousands separators. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
