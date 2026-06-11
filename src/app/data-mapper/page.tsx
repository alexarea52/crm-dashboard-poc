import type { Metadata } from "next";
import { DataMapper } from "@/components/mapping/data-mapper";

export const metadata: Metadata = {
  title: "Data Mapper",
  description:
    "Map a CRM export onto the Lead Management & Sales Funnel semantic model and convert it.",
};

/** The /data-mapper route — schema mapping + file conversion tool. */
export default function DataMapperPage() {
  return (
    <div className="min-h-full bg-[#eef1f5]">
      <DataMapper />
    </div>
  );
}
