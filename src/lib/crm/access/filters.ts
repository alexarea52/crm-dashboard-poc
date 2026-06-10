// Dashboard filters applied on top of a (year-selected, BU-scoped) database.
// Lead filters narrow the row-level lead records; deal filters narrow the
// opportunities behind the deal tables. Options are derived from the data so
// the dropdowns always offer real values.

import type { CrmDatabase, MarketSegment } from "../data/model";

/** Sentinel option value meaning "no filtering on this dimension". */
export const ALL = "all";

/** A dropdown option (machine `value` + display `label`). */
export interface SelectOption {
  value: string;
  label: string;
}

/** OEM/Aftermarket segment filter, or "all" for no filtering. */
export type SegmentFilter = "all" | MarketSegment;

/** Fixed options for the "OEM or Aftermarket" dropdowns. */
export const segmentOptions: SelectOption[] = [
  { value: "all", label: "All" },
  { value: "OEM", label: "OEM" },
  { value: "Aftermarket", label: "Aftermarket" },
  { value: "Both", label: "Both" },
];

/** Distinct sorted values prefixed with the "All" sentinel option. */
const withAll = (values: string[]): SelectOption[] => [
  { value: ALL, label: "All" },
  ...[...new Set(values)].sort().map((v) => ({ value: v, label: v })),
];

/* ------------------------------ Lead filters ------------------------------ */

/** Lead-management header filter state; every field accepts ALL ("all"). */
export interface LeadFilter {
  segment: SegmentFilter;
  /** Channel grouping, e.g. "Paid" | "Organic" | "Referral". */
  sourceType: string;
  /** Specific channel, e.g. "Website". */
  sourceName: string;
  campaign: string;
  /** Customer (account) name. */
  customer: string;
  /** Customer country. */
  country: string;
}

/** The no-op lead filter — every dimension set to ALL. */
export const emptyLeadFilter: LeadFilter = {
  segment: "all",
  sourceType: ALL,
  sourceName: ALL,
  campaign: ALL,
  customer: ALL,
  country: ALL,
};

/** Narrow `db.leads` to rows matching every non-ALL dimension of `f`. */
export function filterLeads(db: CrmDatabase, f: LeadFilter): CrmDatabase {
  return {
    ...db,
    leads: db.leads.filter(
      (l) =>
        (f.segment === "all" || l.segment === f.segment) &&
        (f.sourceType === ALL || l.sourceType === f.sourceType) &&
        (f.sourceName === ALL || l.channel === f.sourceName) &&
        (f.campaign === ALL || l.campaign === f.campaign) &&
        (f.customer === ALL || l.customerName === f.customer) &&
        (f.country === ALL || l.customerCountry === f.country),
    ),
  };
}

/** Dropdown options for each lead-filter dimension, derived from the data. */
export function leadFilterOptions(db: CrmDatabase) {
  return {
    sourceType: withAll(db.leads.map((l) => l.sourceType)),
    sourceName: withAll(db.leads.map((l) => l.channel)),
    campaign: withAll(db.leads.map((l) => l.campaign)),
    customer: withAll(db.leads.map((l) => l.customerName)),
    country: withAll(db.leads.map((l) => l.customerCountry)),
  };
}

/* ------------------------------ Deal filters ------------------------------ */

/** Sales-funnel header filter state; every field accepts ALL ("all"). */
export interface DealFilter {
  segment: SegmentFilter;
  /** "all" | "customer" | "prospect" — matched via the deal's account. */
  customerType: string;
  /** Account name. */
  name: string;
  /** Deal's customer country. */
  country: string;
}

/** The no-op deal filter — every dimension set to ALL. */
export const emptyDealFilter: DealFilter = {
  segment: "all",
  customerType: ALL,
  name: ALL,
  country: ALL,
};

/** Fixed options for the "Customer Type" dropdown. */
export const customerTypeOptions: SelectOption[] = [
  { value: ALL, label: "All" },
  { value: "customer", label: "Customer" },
  { value: "prospect", label: "Prospect" },
];

/** Narrow `db.opportunities` to deals matching every non-ALL dimension of `f`. */
export function filterOpportunities(db: CrmDatabase, f: DealFilter): CrmDatabase {
  const account = (id: string) => db.accounts.find((a) => a.id === id);
  return {
    ...db,
    opportunities: db.opportunities.filter((o) => {
      const acc = account(o.accountId);
      const isCustomer = acc?.isCustomer ?? true;
      const name = acc?.name ?? "";
      return (
        (f.segment === "all" || o.segment === f.segment) &&
        (f.name === ALL || name === f.name) &&
        (f.country === ALL || o.customerCountry === f.country) &&
        (f.customerType === ALL ||
          (f.customerType === "customer" ? isCustomer : !isCustomer))
      );
    }),
  };
}

/** Dropdown options for the deal-filter dimensions, derived from the data. */
export function dealFilterOptions(db: CrmDatabase) {
  const names = db.opportunities
    .map((o) => db.accounts.find((a) => a.id === o.accountId)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    name: withAll(names),
    country: withAll(db.opportunities.map((o) => o.customerCountry)),
  };
}
