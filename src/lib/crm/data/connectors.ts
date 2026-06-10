// Connected source systems. The whole point of this app is to *merge* CRM data
// from several systems, so a "connector" is a first-class concept: every
// canonical record records which connectors contributed to it (see SourceRef
// in model.ts), and conflicts during merge are resolved by connector priority.

/** Stable identifier for a connected source system. */
export type ConnectorId =
  | "salesforce"
  | "hubspot"
  | "netsuite"
  | "bulk-csv"
  | "zoominfo";

/** What class of system a connector is (CRM, ERP, file import, …). */
export type ConnectorKind =
  | "crm"
  | "marketing"
  | "erp"
  | "file"
  | "enrichment";

/** A connected source system and its sync state. */
export interface Connector {
  id: ConnectorId;
  name: string;
  kind: ConnectorKind;
  status: "connected" | "syncing" | "error";
  /** ISO timestamp of the last successful sync. */
  lastSyncedAt: string;
  /**
   * Higher priority wins when two connectors disagree on the same field during
   * identity-resolution / merge (e.g. NetSuite is authoritative for $ amounts,
   * Salesforce for deal stage). A real merge layer would track this per field;
   * here it's a single number to illustrate the idea.
   */
  priority: number;
}

/** The demo's connected systems, in priority order for display. */
export const connectors: Connector[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    kind: "crm",
    status: "connected",
    lastSyncedAt: "2026-06-08T06:00:00Z",
    priority: 100,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    kind: "marketing",
    status: "connected",
    lastSyncedAt: "2026-06-08T05:30:00Z",
    priority: 80,
  },
  {
    id: "netsuite",
    name: "NetSuite",
    kind: "erp",
    status: "connected",
    lastSyncedAt: "2026-06-08T04:00:00Z",
    priority: 90,
  },
  {
    id: "bulk-csv",
    name: "Bulk CSV Import",
    kind: "file",
    status: "connected",
    lastSyncedAt: "2026-06-07T18:00:00Z",
    priority: 40,
  },
  {
    id: "zoominfo",
    name: "ZoomInfo",
    kind: "enrichment",
    status: "syncing",
    lastSyncedAt: "2026-06-08T03:15:00Z",
    priority: 30,
  },
];
