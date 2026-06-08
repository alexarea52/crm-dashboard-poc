import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Signal } from "@/lib/types";

type BadgeTone = "neutral" | "brand" | "hot" | "warm" | "new";

const toneStyles: Record<BadgeTone, string> = {
  neutral:
    "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
  brand:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  hot: "border-accent-300 text-accent-600 dark:border-accent-400 dark:text-accent-400",
  warm: "border-brand-300 text-brand-600 dark:border-brand-400 dark:text-brand-300",
  new: "border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/** Small rounded pill — used for signals, counts, and labels. */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const signalLabel: Record<Signal, string> = {
  hot: "Hot",
  warm: "Warm",
  new: "New",
};

/** Convenience wrapper that maps a Mover's signal to a styled Badge. */
export function SignalBadge({ signal }: { signal: Signal }) {
  return <Badge tone={signal}>{signalLabel[signal]}</Badge>;
}
