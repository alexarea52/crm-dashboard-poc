import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { RankedItem } from "@/lib/types";

interface BarListProps {
  items: RankedItem[];
  className?: string;
}

/** Ranked horizontal bars with a label column and right-aligned value. */
export function BarList({ items, className }: BarListProps) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-zinc-700 dark:text-zinc-300">
            {item.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={cn(
                "h-full rounded-full",
                item.highlight ? "bg-accent-500" : "bg-brand-500",
              )}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatNumber(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
