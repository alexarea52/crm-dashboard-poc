"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  businessUnitById,
  businessUnits,
  canSwitchBusinessUnit,
  connectors,
  corporateBusinessUnit,
  databaseForYear,
  demoSessions,
  scopeDb,
  type DemoPersona,
} from "@/lib/crm";
import { AssistantBar } from "./assistant-bar";
import { LeadManagementDashboard } from "./dashboards/lead-management-dashboard";
import { SalesFunnelDashboard } from "./dashboards/sales-funnel-dashboard";
import { GlossaryModal } from "./glossary-modal";
import { ThemeScope } from "./ui/theme-scope";
import { ViewControls } from "./view-controls";

const tabs = [
  { key: "lead", label: "Lead Management" },
  { key: "funnel", label: "Sales Funnel" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

/** Top-level orchestrator: owns persona/BU/tab state, themes the subtree. */
export function CrmDashboard() {
  const [persona, setPersona] = useState<DemoPersona>("admin");
  const [selectedBu, setSelectedBu] = useState<string>("all");
  const [active, setActive] = useState<TabKey>("lead");
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const session = demoSessions[persona];
  const canSwitch = canSwitchBusinessUnit(session);

  // BU options the session may view; multi/admin also get the "All" view.
  const allowedBus = businessUnits.filter((b) =>
    session.businessUnitIds.includes(b.id),
  );
  const buOptions = canSwitch
    ? [corporateBusinessUnit, ...allowedBus]
    : allowedBus;

  // Effective selection (guard against a stale id after a persona switch).
  const effectiveBu = buOptions.some((b) => b.id === selectedBu)
    ? selectedBu
    : (buOptions[0]?.id ?? "all");

  const visibleBuIds =
    effectiveBu === "all" ? session.businessUnitIds : [effectiveBu];
  const themeBu = businessUnitById(effectiveBu);

  // Options for the header's Business Unit dropdown ("All" + the units the
  // session is allowed to see). A locked single-BU user gets just their unit.
  const buHeaderOptions = buOptions.map((b) => ({
    value: b.id,
    label: b.id === "all" ? "All" : b.name,
  }));

  // The assistant answers against the current scope at the default year.
  // (Per-tab year/segment filters live inside each dashboard.)
  const assistantDb = scopeDb(databaseForYear("2025"), visibleBuIds);

  function changePersona(p: DemoPersona) {
    setPersona(p);
    const next = demoSessions[p];
    // Reset BU selection: locked users land on their unit, others on "All".
    setSelectedBu(next.businessUnitIds.length > 1 ? "all" : next.businessUnitIds[0]);
  }

  return (
    <ThemeScope
      theme={themeBu.theme}
      className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mb-4">
        <ViewControls
          persona={persona}
          onPersona={changePersona}
          session={session}
        />
      </div>

      <div className="mb-5">
        <AssistantBar db={assistantDb} session={session} persona={persona} />
        <p className="mt-2 px-1 text-[11px] text-zinc-500">
          Merging {connectors.length} sources:{" "}
          {connectors.map((c) => c.name).join(" · ")}
        </p>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Dashboards"
          className="inline-flex rounded-lg border border-crm-border bg-white p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                active === tab.key
                  ? "bg-crm-primary text-white"
                  : "text-zinc-600 hover:text-crm-primary",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setGlossaryOpen(true)}
          className="rounded-lg border border-crm-border bg-white px-3 py-1.5 text-sm font-medium text-crm-primary transition-colors hover:bg-zinc-50"
        >
          Glossary
        </button>
      </div>

      {active === "lead" ? (
        <LeadManagementDashboard
          visibleBuIds={visibleBuIds}
          session={session}
          buOptions={buHeaderOptions}
          selectedBu={effectiveBu}
          onSelectBu={setSelectedBu}
          canSwitch={canSwitch}
          logoText={themeBu.logoText}
        />
      ) : (
        <SalesFunnelDashboard
          visibleBuIds={visibleBuIds}
          session={session}
          buOptions={buHeaderOptions}
          selectedBu={effectiveBu}
          onSelectBu={setSelectedBu}
          canSwitch={canSwitch}
          logoText={themeBu.logoText}
        />
      )}

      <GlossaryModal
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />
    </ThemeScope>
  );
}
