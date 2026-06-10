import type { Metadata } from "next";
import { CrmDashboard } from "@/components/crm/crm-dashboard";

export const metadata: Metadata = {
  title: "CRM Dashboard",
  description:
    "Lead Management and Sales Funnel dashboards — wireframe replica with mock data.",
};

/** The /crm-dashboard route — renders the client orchestrator on a grey canvas. */
export default function CrmDashboardPage() {
  return (
    <div className="min-h-full bg-[#eef1f5]">
      <CrmDashboard />
    </div>
  );
}
