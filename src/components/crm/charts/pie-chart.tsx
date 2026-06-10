"use client";

import { cn } from "@/lib/cn";
import type { PieDatum, PieTone } from "@/lib/crm";
import { ChartTooltip, useChartTooltip } from "./chart-tooltip";

interface PieChartProps {
  /** Slices; `value`s are percentages and should sum to ~100. */
  data: PieDatum[];
  /** Extra classes for the flex row holding the pie + legend. */
  className?: string;
}

// Semantic tone -> themeable CSS token.
const TONE_VAR: Record<PieTone, string> = {
  primary: "var(--color-crm-primary)",
  secondary: "var(--color-crm-series-2)",
  accent: "var(--color-crm-accent)",
  target: "var(--color-crm-target)",
  muted: "var(--color-crm-muted)",
};

const CX = 50;
const CY = 50;
const R = 45;
const TWO_PI = 2 * Math.PI;

// Round trig output to a fixed precision. Math.cos/sin can differ by a ULP
// between the server (Node) and client (browser), which serializes to slightly
// different SVG coordinate strings and trips React's hydration check. Rounding
// makes both sides emit identical markup.
const round = (n: number) => Math.round(n * 1000) / 1000;

// Angle 0 at 12 o'clock, sweeping clockwise.
const pointAt = (frac: number, radius: number) => {
  const a = frac * TWO_PI - Math.PI / 2;
  return [round(CX + radius * Math.cos(a)), round(CY + radius * Math.sin(a))] as const;
};

function arcPath(startFrac: number, endFrac: number) {
  const [x0, y0] = pointAt(startFrac, R);
  const [x1, y1] = pointAt(endFrac, R);
  const large = endFrac - startFrac > 0.5 ? 1 : 0;
  return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

/** Filled SVG pie with per-slice hover tooltips, centroid % labels, legend. */
export function PieChart({ data, className }: PieChartProps) {
  const { wrapRef, tip, show, hide } = useChartTooltip();

  // Non-mutating cumulative starts.
  const fractions = data.map((d) => d.value / 100);
  const starts = fractions.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + fractions[i - 1]);
    return acc;
  }, []);
  const slices = data.map((d, i) => ({
    ...d,
    start: starts[i],
    fraction: fractions[i],
  }));

  return (
    <div className={cn("flex items-center gap-5", className)}>
      {/* Mouse-only tooltip enhancement; slices carry visible % + legend. */}
      <div
        ref={wrapRef}
        role="presentation"
        className="relative shrink-0"
        onMouseLeave={hide}
      >
        <svg viewBox="0 0 100 100" className="size-32">
          {slices.map((s) => (
            <path
              key={s.label}
              d={arcPath(s.start, s.start + s.fraction)}
              fill={TONE_VAR[s.tone]}
              stroke="var(--color-crm-surface)"
              strokeWidth={1}
              onMouseMove={(e) =>
                show(e, s.label, [
                  { value: `${s.value}%`, color: TONE_VAR[s.tone] },
                ])
              }
            />
          ))}
          {slices.map((s) => {
            if (s.value < 8) return null;
            const [x, y] = pointAt(s.start + s.fraction / 2, 26);
            return (
              <text
                key={s.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="700"
                fill="var(--color-crm-surface)"
                pointerEvents="none"
              >
                {s.value}%
              </text>
            );
          })}
        </svg>
        <ChartTooltip tip={tip} />
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: TONE_VAR[d.tone] }}
            />
            <span className="text-zinc-600">{d.label}</span>
            <span className="font-medium tabular-nums text-crm-primary">
              {d.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
