import { cn } from "@/lib/cn";
import { formatUsdCompact } from "@/lib/format";
import type { FunnelStage } from "@/lib/types";

const toneStyles: Record<NonNullable<FunnelStage["tone"]>, string> = {
  brand: "bg-brand-600 text-white",
  muted: "bg-zinc-400 text-white dark:bg-zinc-600",
  dark: "bg-zinc-700 text-white dark:bg-zinc-500",
  accent: "bg-accent-500 text-white",
};

const amountPillTone: Record<NonNullable<FunnelStage["tone"]>, string> = {
  brand: "bg-brand-700/60",
  muted: "bg-black/20",
  dark: "bg-black/25",
  accent: "bg-accent-600/70",
};

/**
 * Horizontal funnel — each stage is a centered bar whose width is
 * proportional to its amount, with the value pinned to the right edge.
 */
export function PipelineFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.amount), 1);

  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage) => {
        const tone = stage.tone ?? "brand";
        // Floor the width so the smallest stage stays readable.
        const width = Math.max(28, (stage.amount / max) * 100);
        return (
          <div key={stage.label} className="flex justify-center">
            <div
              className={cn(
                "flex h-10 items-center justify-between rounded-lg px-3 text-xs font-medium",
                toneStyles[tone],
              )}
              style={{ width: `${width}%` }}
            >
              <span className="truncate">{stage.label}</span>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded px-1.5 py-0.5 tabular-nums",
                  amountPillTone[tone],
                )}
              >
                {formatUsdCompact(stage.amount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
