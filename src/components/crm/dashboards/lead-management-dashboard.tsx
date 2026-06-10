"use client";

import { useState } from "react";
import {
  availableYears,
  crmDb,
  databaseForYear,
  emptyLeadFilter,
  filterLeads,
  getLeadDashboard,
  leadFilterOptions,
  scopeDb,
  segmentOptions,
  type LeadFilter,
  type Session,
  type Year,
} from "@/lib/crm";
import { ComboChart } from "../charts/combo-chart";
import { HBarChart } from "../charts/h-bar-chart";
import { PieChart } from "../charts/pie-chart";
import { DashboardHeader, type HeaderFilter } from "../ui/dashboard-header";
import { DataTable } from "../ui/data-table";
import { KpiCard } from "../ui/kpi-card";
import { Panel } from "../ui/panel";

interface Props {
  /** Business units the data is scoped to (session ∩ header BU selection). */
  visibleBuIds: string[];
  /** Drives financial gating (cost columns) via the query facade. */
  session: Session;
  /** Options for the header's Business Unit dropdown ("All" + allowed BUs). */
  buOptions: { value: string; label: string }[];
  /** Selected BU id ("all" for the whole allowed set). */
  selectedBu: string;
  /** Called with the newly selected BU id (owned by CrmDashboard). */
  onSelectBu: (id: string) => void;
  /** False locks the BU dropdown (single-BU sessions). */
  canSwitch: boolean;
  /** Logo letter for the active business unit's header badge. */
  logoText: string;
}

const days = (v: number) => v.toFixed(1);
const yearOptions = availableYears.map((y) => ({ value: y, label: y }));
// Options derived once from the full base dataset (stable across scope).
const opts = leadFilterOptions(crmDb);

/** The Lead Management tab: header filters, KPIs, charts, source table. */
export function LeadManagementDashboard({
  visibleBuIds,
  session,
  buOptions,
  selectedBu,
  onSelectBu,
  canSwitch,
  logoText,
}: Props) {
  const [year, setYear] = useState<Year>("2025");
  const [filter, setFilter] = useState<LeadFilter>(emptyLeadFilter);

  const set = (patch: Partial<LeadFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const db = filterLeads(scopeDb(databaseForYear(year), visibleBuIds), filter);
  const d = getLeadDashboard(db, session);

  const filters: HeaderFilter[] = [
    {
      label: "Creation Date",
      value: year,
      options: yearOptions,
      onChange: (v) => setYear(v as Year),
    },
    {
      label: "Business Unit",
      value: selectedBu,
      options: buOptions,
      onChange: onSelectBu,
      disabled: !canSwitch,
    },
    {
      label: "OEM or Aftermarket",
      value: filter.segment,
      options: segmentOptions,
      onChange: (v) => set({ segment: v as LeadFilter["segment"] }),
    },
    {
      label: "Customer",
      value: filter.customer,
      options: opts.customer,
      onChange: (v) => set({ customer: v }),
    },
    {
      label: "Customer Country",
      value: filter.country,
      options: opts.country,
      onChange: (v) => set({ country: v }),
    },
    {
      label: "Source Type",
      value: filter.sourceType,
      options: opts.sourceType,
      onChange: (v) => set({ sourceType: v }),
    },
    {
      label: "Source Name",
      value: filter.sourceName,
      options: opts.sourceName,
      onChange: (v) => set({ sourceName: v }),
    },
    {
      label: "Campaign",
      value: filter.campaign,
      options: opts.campaign,
      onChange: (v) => set({ campaign: v }),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        title="Lead Management Dashboard"
        logoText={logoText}
        filters={filters}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {d.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="New vs Existing Customers">
          <PieChart data={d.newVsExisting} />
        </Panel>
        <Panel title="Leads by Source (%)">
          <HBarChart data={d.leadsBySource} />
        </Panel>
        <Panel title="Avg Time by Stage" subtitle="Lower than target is better">
          <ComboChart
            chart={d.avgTimeByStage}
            format={days}
            ariaLabel="Average time by stage, actual versus target days"
          />
        </Panel>
        <Panel
          title="Aftermarket: Avg Time by Stage"
          subtitle="Lower than target is better"
        >
          <ComboChart
            chart={d.aftermarketAvgTimeByStage}
            format={days}
            ariaLabel="Aftermarket average time by stage, actual versus target days"
          />
        </Panel>
      </div>

      {/* Source details */}
      <Panel title="Source Details">
        <DataTable columns={d.sourceDetails.columns} rows={d.sourceDetails.rows} />
      </Panel>
    </div>
  );
}
