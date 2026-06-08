import { cn } from "@/lib/cn";
import type { SeriesPoint } from "@/lib/types";

interface BarChartProps {
  data: SeriesPoint[];
  /** Height of the plot area in pixels. */
  height?: number;
  className?: string;
}

/** Simple vertical bar chart — one bar per category, labelled below. */
export function BarChart({ data, height = 160, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height }}>
      {data.map((point) => (
        <div
          key={point.label}
          className="flex flex-1 flex-col items-center gap-2"
          style={{ height: "100%" }}
        >
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-md bg-brand-500 transition-all"
              style={{ height: `${(point.value / max) * 100}%` }}
              title={`${point.label}: ${point.value}`}
            />
          </div>
          <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}
