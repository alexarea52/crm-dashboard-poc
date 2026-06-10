import type { Kpi } from "@/lib/crm";

interface KpiCardProps {
  /** Pre-formatted metric (label + display value + optional sub-line). */
  kpi: Kpi;
}

/** Green-outlined headline metric, centered, as in the wireframe. */
export function KpiCard({ kpi }: KpiCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-crm-accent bg-white px-4 py-6 text-center">
      <p className="text-xs font-medium text-zinc-500">{kpi.label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-crm-primary">
        {kpi.value}
      </p>
      {kpi.sub ? (
        <p className="mt-1 text-sm font-medium tabular-nums text-zinc-500">
          {kpi.sub}
        </p>
      ) : null}
    </div>
  );
}
