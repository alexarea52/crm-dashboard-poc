import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  /** Panel heading; omit for a bare surface with no header block. */
  title?: ReactNode;
  /** Small muted line under the title (e.g. "Lower than target is better"). */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Extra classes for the outer surface (e.g. grid spans). */
  className?: string;
  /** Extra classes for the body wrapper around `children`. */
  bodyClassName?: string;
}

/**
 * White rounded surface used for every chart/table block on the CRM
 * dashboard. Mirrors the bordered cards in the wireframe.
 */
export function Panel({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-crm-border bg-white p-4 shadow-sm",
        className,
      )}
    >
      {title ? (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-crm-primary">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
