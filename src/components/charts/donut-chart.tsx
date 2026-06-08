import { cn } from "@/lib/cn";
import type { Slice } from "@/lib/types";

const fallbackColors = [
  "var(--color-brand-600)",
  "var(--color-brand-300)",
  "var(--color-accent-500)",
  "#cbd0dd",
  "var(--color-brand-800)",
];

interface DonutChartProps {
  data: Slice[];
  /** Big label rendered in the hole, e.g. "15K". */
  centerLabel?: string;
  className?: string;
}

/** Lightweight SVG donut + legend. Values are treated as percentages. */
export function DonutChart({ data, centerLabel, className }: DonutChartProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // Precompute each slice's arc length and starting offset up front so the
  // render pass stays free of mutation.
  const segments = data.map((slice, i) => {
    const length = (slice.value / 100) * circumference;
    const color = slice.color ?? fallbackColors[i % fallbackColors.length];
    return { slice, length, color };
  });
  const offsets = segments.reduce<number[]>((acc, seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].length);
    return acc;
  }, []);

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--color-brand-50)"
            strokeWidth="14"
            className="dark:stroke-zinc-800"
          />
          {segments.map(({ slice, length, color }, i) => (
            <circle
              key={slice.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offsets[i]}
            />
          ))}
        </svg>
        {centerLabel ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {centerLabel}
            </span>
          </div>
        ) : null}
      </div>

      <ul className="flex flex-col gap-1.5 text-xs">
        {data.map((slice, i) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor:
                  slice.color ?? fallbackColors[i % fallbackColors.length],
              }}
            />
            <span className="text-zinc-600 dark:text-zinc-300">{slice.label}</span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
              {slice.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
