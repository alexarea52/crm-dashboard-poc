"use client";

import { useState } from "react";
import {
  availableYears,
  crmDb,
  customerTypeOptions,
  databaseForYear,
  dealFilterOptions,
  emptyDealFilter,
  filterOpportunities,
  getFunnelDashboard,
  scopeDb,
  segmentOptions,
  type DealFilter,
  type Session,
  type Year,
} from "@/lib/crm";
import { ComboChart } from "../charts/combo-chart";
import { DashboardHeader, type HeaderFilter } from "../ui/dashboard-header";
import { DataTable } from "../ui/data-table";
import { KpiCard } from "../ui/kpi-card";
import { Panel } from "../ui/panel";

interface Props {
  /** Business units the data is scoped to (session ∩ header BU selection). */
  visibleBuIds: string[];
  /** Drives financial gating (margin columns) via the query facade. */
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

const usdM = (v: number) => `$${v.toFixed(1)}M`;
const ratio = (v: number) => v.toFixed(1);
const yearOptions = availableYears.map((y) => ({ value: y, label: y }));
const opts = dealFilterOptions(crmDb);

/** The Sales Funnel tab: header filters, KPIs, trend charts, deal tables. */
export function SalesFunnelDashboard({
  visibleBuIds,
  session,
  buOptions,
  selectedBu,
  onSelectBu,
  canSwitch,
  logoText,
}: Props) {
  const [year, setYear] = useState<Year>("2026");
  const [filter, setFilter] = useState<DealFilter>(emptyDealFilter);

  const set = (patch: Partial<DealFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const db = filterOpportunities(
    scopeDb(databaseForYear(year), visibleBuIds),
    filter,
  );
  const d = getFunnelDashboard(db, session);

  const filters: HeaderFilter[] = [
    {
      label: "Date",
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
      onChange: (v) => set({ segment: v as DealFilter["segment"] }),
    },
    {
      label: "Customer Type",
      value: filter.customerType,
      options: customerTypeOptions,
      onChange: (v) => set({ customerType: v }),
    },
    {
      label: "Name",
      value: filter.name,
      options: opts.name,
      onChange: (v) => set({ name: v }),
    },
    {
      label: "Country",
      value: filter.country,
      options: opts.country,
      onChange: (v) => set({ country: v }),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        title="Sales Funnel Dashboard"
        logoText={logoText}
        filters={filters}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {d.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Previous 12 Months Bookings vs PY Month">
          <ComboChart
            chart={d.bookingsVsPy}
            format={usdM}
            ariaLabel="Previous 12 months bookings versus prior year"
          />
        </Panel>
        <Panel title="Next 12 Months Open Quotes vs AOP">
          <ComboChart
            chart={d.openQuotesVsAop}
            format={usdM}
            ariaLabel="Next 12 months open quotes versus AOP target"
          />
        </Panel>
        <Panel title="Coverage Ratio">
          <ComboChart
            chart={d.coverageRatio}
            format={ratio}
            showValueLabels
            ariaLabel="Coverage ratio by month"
          />
        </Panel>
      </div>

      {/* Deal tables */}
      <Panel title="Top 10 Open Deals">
        <DataTable columns={d.dealColumns} rows={d.openDeals} />
      </Panel>
      <Panel title="Top 10 Booked Deals">
        <DataTable columns={d.dealColumns} rows={d.bookedDeals} />
      </Panel>
    </div>
  );
}
