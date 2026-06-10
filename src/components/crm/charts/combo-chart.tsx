"use client";

import type { ComboChart, SeriesRole } from "@/lib/crm";
import { ChartTooltip, useChartTooltip } from "./chart-tooltip";

interface ComboChartProps {
  /** Categories + bar series (+ optional overlaid line series) to plot. */
  chart: ComboChart;
  /** Formats values shown on bars / line points and the y-axis ceiling. */
  format?: (value: number) => string;
  /** Force value labels above bars on/off (defaults to on for ≤6 categories). */
  showValueLabels?: boolean;
  /** Accessible description (e.g. the panel title). */
  ariaLabel?: string;
  /** Extra classes for the outer wrapper (legend + plot). */
  className?: string;
}

// Semantic role -> themeable CSS token. The chart never names a raw color.
const ROLE_VAR: Record<SeriesRole, string> = {
  primary: "var(--color-crm-primary)",
  secondary: "var(--color-crm-series-2)",
  target: "var(--color-crm-target)",
  warn: "var(--color-crm-warn)",
};
const WARN_VAR = "var(--color-crm-warn)";

// Fixed coordinate space; the SVG scales uniformly to its container width.
// Kept close to the real rendered panel width so text isn't downscaled into
// illegibility (a wide viewBox in a narrow panel shrinks all the labels).
const W = 360;
const H = 250;
// Generous left/bottom padding so the rotated x-axis labels (e.g. "New→MQL")
// aren't clipped at the edges.
const PAD = { top: 16, right: 16, bottom: 60, left: 28 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const PLOT_BOTTOM = PAD.top + PLOT_H;

/**
 * Combined bar + line chart. Supports one or more grouped bar series and any
 * number of overlaid line series (e.g. a target/AOP reference). Used for the
 * "Avg Time by Stage", "Bookings vs PY", "Open Quotes vs AOP", and "Coverage
 * Ratio" panels.
 */
export function ComboChart({
  chart,
  format = (v) => `${v}`,
  showValueLabels,
  ariaLabel = "bar and line chart",
  className,
}: ComboChartProps) {
  const { categories, bars, lines = [] } = chart;
  const n = categories.length;
  const { wrapRef, tip, show, hide } = useChartTooltip();

  const barColor = (role: SeriesRole, i: number, highlight?: number[]) =>
    highlight?.includes(i) ? WARN_VAR : ROLE_VAR[role];

  const allValues = [
    ...bars.flatMap((b) => b.values),
    ...lines.flatMap((l) => l.values),
  ];
  const max = Math.max(...allValues, 1) * 1.12; // headroom above tallest

  const labelValues = showValueLabels ?? n <= 6;
  const rotateLabels = categories.some((c) => c.length > 4);

  const band = PLOT_W / n;
  const groupW = band * 0.66;
  const barW = groupW / bars.length;

  const y = (v: number) => PAD.top + PLOT_H * (1 - v / max);
  const cx = (i: number) => PAD.left + band * i + band / 2;

  // Faint horizontal gridlines.
  const gridLines = [0.25, 0.5, 0.75, 1].map((t) => PAD.top + PLOT_H * t);

  return (
    <div className={className}>
      {(bars.length > 1 || lines.length > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-700">
          {bars.map((b) => (
            <span key={b.name} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: ROLE_VAR[b.role] }}
              />
              {b.name}
            </span>
          ))}
          {lines.map((l) => (
            <span key={l.name} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-4"
                style={{ backgroundColor: ROLE_VAR[l.role] }}
              />
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Mouse-only tooltip enhancement; values are also rendered as text. */}
      <div
        ref={wrapRef}
        role="presentation"
        className="relative"
        onMouseLeave={hide}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Gridlines */}
          {gridLines.map((gy, i) => (
            <line
              key={i}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={gy}
              y2={gy}
              stroke="var(--color-crm-grid)"
              strokeWidth={1}
            />
          ))}

          {/* Bars */}
          {categories.map((_, i) => {
            const groupStart = PAD.left + band * i + (band - groupW) / 2;
            return bars.map((b, j) => {
              const v = b.values[i] ?? 0;
              const barY = y(v);
              return (
                <rect
                  key={`${b.name}-${i}`}
                  x={groupStart + barW * j}
                  y={barY}
                  width={barW * 0.86}
                  height={Math.max(PLOT_BOTTOM - barY, 0)}
                  rx={1.5}
                  fill={barColor(b.role, i, b.highlight)}
                />
              );
            });
          })}

          {/* Value labels above single-series bars */}
          {labelValues &&
            bars.length === 1 &&
            categories.map((_, i) => {
              const v = bars[0].values[i] ?? 0;
              return (
                <text
                  key={`vl-${i}`}
                  x={cx(i)}
                  y={y(v) - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="500"
                  fill="var(--color-crm-label)"
                >
                  {format(v)}
                </text>
              );
            })}

          {/* Lines + points */}
          {lines.map((l) => {
            const points = l.values.map((v, i) => `${cx(i)},${y(v)}`).join(" ");
            return (
              <g key={l.name}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={ROLE_VAR[l.role]}
                  strokeWidth={2}
                  strokeDasharray={l.dashed ? "5 4" : undefined}
                  strokeLinejoin="round"
                />
                {l.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={cx(i)}
                    cy={y(v)}
                    r={3}
                    fill="var(--color-crm-surface)"
                    stroke={ROLE_VAR[l.role]}
                    strokeWidth={1.75}
                  />
                ))}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PLOT_BOTTOM}
            y2={PLOT_BOTTOM}
            stroke="var(--color-crm-axis)"
            strokeWidth={1}
          />

          {/* Category labels */}
          {categories.map((c, i) => (
            <text
              key={c}
              x={cx(i)}
              y={PLOT_BOTTOM + 18}
              textAnchor={rotateLabels ? "end" : "middle"}
              fontSize="13"
              fill="var(--color-crm-axis-text)"
              transform={
                rotateLabels
                  ? `rotate(-35 ${cx(i)} ${PLOT_BOTTOM + 18})`
                  : undefined
              }
            >
              {c}
            </text>
          ))}

          {/* Transparent per-category hover columns drive the tooltip */}
          {categories.map((c, i) => {
            const rows = [
              ...bars.map((b) => ({
                label: b.name,
                value: format(b.values[i] ?? 0),
                color: barColor(b.role, i, b.highlight),
              })),
              ...lines.map((l) => ({
                label: l.name,
                value: format(l.values[i] ?? 0),
                color: ROLE_VAR[l.role],
              })),
            ];
            return (
              <rect
                key={`hit-${i}`}
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={PLOT_H}
                fill="transparent"
                onMouseMove={(e) => show(e, c, rows)}
              />
            );
          })}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
    </div>
  );
}
