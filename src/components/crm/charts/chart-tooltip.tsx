"use client";

import { useRef, useState } from "react";

/** One line in the tooltip body (e.g. a series name + formatted value). */
export interface TooltipRow {
  /** Series/category label shown muted before the value. */
  label?: string;
  /** Pre-formatted display value. */
  value: string;
  /** Swatch color (a CSS color or `var(--color-crm-*)` token). */
  color?: string;
}

/** A visible tooltip: position + content. */
export interface TooltipState {
  /** Pixel position relative to the chart's `relative` wrapper. */
  x: number;
  y: number;
  /** Bold first line — usually the hovered category (month, stage, slice). */
  title: string;
  rows: TooltipRow[];
}

/**
 * Shared hover-tooltip state for the CRM charts. Returns a ref to put on the
 * chart's `relative` wrapper, a `show(event, …)` to call from element mouse
 * handlers, and a `hide()` for the wrapper's onMouseLeave.
 */
export function useChartTooltip() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);

  function show(
    e: { clientX: number; clientY: number },
    title: string,
    rows: TooltipRow[],
  ) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Clamp x so the (center-anchored) tooltip doesn't spill past the panel.
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    setTip({ x, y: e.clientY - rect.top, title, rows });
  }

  const hide = () => setTip(null);

  return { wrapRef, tip, show, hide };
}

/** Renders the floating tooltip. Place inside the chart's `relative` wrapper. */
export function ChartTooltip({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      <div className="font-semibold text-crm-primary">{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div
          key={i}
          className="mt-0.5 flex items-center gap-1.5 text-zinc-700"
        >
          {r.color ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: r.color }}
            />
          ) : null}
          {r.label ? <span className="text-zinc-500">{r.label}</span> : null}
          <span className="ml-3 font-medium tabular-nums text-crm-primary">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
