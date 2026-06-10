"use client";

import { cn } from "@/lib/cn";
import type { HBar } from "@/lib/crm";
import { ChartTooltip, useChartTooltip } from "./chart-tooltip";

const PRIMARY_VAR = "var(--color-crm-primary)";

interface HBarChartProps {
  /** Bars top-to-bottom; `value`s are percentages (longest bar = max value). */
  data: HBar[];
  /** Extra classes for the list element. */
  className?: string;
}

/** Horizontal bars with a label column and a trailing % value. */
export function HBarChart({ data, className }: HBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const { wrapRef, tip, show, hide } = useChartTooltip();

  return (
    // Mouse-only tooltip enhancement; each row shows its % as text anyway.
    <div
      ref={wrapRef}
      role="presentation"
      className="relative"
      onMouseLeave={hide}
    >
      <ul className={cn("flex flex-col gap-3 text-sm", className)}>
        {data.map((item) => (
          <li key={item.label}>
            <div
              role="presentation"
              className="flex items-center gap-3"
              onMouseMove={(e) =>
                show(e, item.label, [
                  { label: "Share", value: `${item.value}%`, color: PRIMARY_VAR },
                ])
              }
            >
              <span className="w-32 shrink-0 truncate text-zinc-600">
                {item.label}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <div
                  className="h-4 rounded-sm bg-crm-primary"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
                <span className="shrink-0 font-medium tabular-nums text-zinc-700">
                  {item.value}%
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ChartTooltip tip={tip} />
    </div>
  );
}
