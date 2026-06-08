import { cn } from "@/lib/cn";
import type { SegmentPoint } from "@/lib/types";

interface SegmentedBarChartProps {
  data: SegmentPoint[];
  primaryLabel?: string;
  remainderLabel?: string;
  height?: number;
  className?: string;
}

/**
 * Vertical bars split into two segments (e.g. contacted vs not-yet),
 * each bar full-height with the primary share filled from the bottom.
 */
export function SegmentedBarChart({
  data,
  primaryLabel = "Contacted",
  remainderLabel = "Not yet",
  height = 160,
  className,
}: SegmentedBarChartProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((point) => {
          const pct = Math.round((point.value / point.total) * 100);
          return (
            <div
              key={point.label}
              className="flex flex-1 flex-col items-center gap-2"
              style={{ height: "100%" }}
            >
              <div className="flex w-full flex-1 flex-col overflow-hidden rounded-md bg-zinc-700 dark:bg-zinc-600">
                <div className="flex items-start justify-center" style={{ height: `${100 - pct}%` }} />
                <div
                  className="flex items-center justify-center bg-brand-500 text-[11px] font-semibold text-white"
                  style={{ height: `${pct}%` }}
                  title={`${point.label}: ${pct}% ${primaryLabel.toLowerCase()}`}
                >
                  {pct}%
                </div>
              </div>
              <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-500" aria-hidden />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-zinc-700 dark:bg-zinc-600" aria-hidden />
          {remainderLabel}
        </span>
      </div>
    </div>
  );
}
