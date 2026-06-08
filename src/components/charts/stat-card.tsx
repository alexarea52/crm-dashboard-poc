import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Metric } from "@/lib/types";

function TrendArrow({ trend }: { trend: NonNullable<Metric["trend"]> }) {
  if (trend === "flat") {
    return <span aria-hidden>→</span>;
  }
  return <span aria-hidden>{trend === "up" ? "▲" : "▼"}</span>;
}

/** Headline metric: label, large value, optional caption + delta line. */
export function StatCard({ metric }: { metric: Metric }) {
  const { label, value, caption, delta, trend, emphasis } = metric;
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
          emphasis
            ? "text-brand-600 dark:text-brand-300"
            : "text-zinc-900 dark:text-zinc-50",
        )}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            trend === "down" ? "text-accent-600" : "text-emerald-600",
          )}
        >
          {trend ? <TrendArrow trend={trend} /> : null}
          {delta}
        </p>
      ) : null}
      {caption ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{caption}</p>
      ) : null}
    </Card>
  );
}
