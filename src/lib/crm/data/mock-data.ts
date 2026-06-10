// Mock merged dataset in the canonical shape. In production this module would
// be replaced by: connector adapters (Salesforce/HubSpot/NetSuite/…) ->
// identity resolution -> field-level merge -> a CrmDatabase. Everything
// downstream (selectors, components, assistant) is agnostic to that swap.

import type { SourceRef ,
  Account,
  ChannelMeta,
  CrmDatabase,
  DealStage,
  LeadChannel,
  LeadRecord,
  MarketSegment,
  Opportunity,
} from "./model";

const SYNCED = "2026-06-08T06:00:00Z";

const months = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
];

const series = (values: number[]) =>
  months.map((month, i) => ({ month, value: values[i] }));

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

const accounts: Account[] = [
  { id: "acc-sysco", name: "Sysco", country: "USA", segment: "OEM", isCustomer: true, sources: [{ connector: "salesforce", externalId: "0011", syncedAt: SYNCED }, { connector: "zoominfo", externalId: "ZI-sysco", syncedAt: SYNCED }] },
  { id: "acc-partnercorp", name: "PartnerCorp", country: "Germany", segment: "OEM", isCustomer: false, sources: [{ connector: "salesforce", externalId: "0012", syncedAt: SYNCED }] },
  { id: "acc-vegco", name: "Veg Co", country: "NZ", segment: "OEM", isCustomer: true, sources: [{ connector: "salesforce", externalId: "0013", syncedAt: SYNCED }, { connector: "netsuite", externalId: "NS-veg", syncedAt: SYNCED }] },
  { id: "acc-tyson", name: "Tyson", country: "USA", segment: "Aftermarket", isCustomer: true, sources: [{ connector: "hubspot", externalId: "HS-901", syncedAt: SYNCED }] },
  { id: "acc-cargill", name: "Cargill", country: "USA", segment: "Aftermarket", isCustomer: true, sources: [{ connector: "hubspot", externalId: "HS-902", syncedAt: SYNCED }] },
  { id: "acc-jbs", name: "JBS", country: "USA", segment: "Aftermarket", isCustomer: false, sources: [{ connector: "hubspot", externalId: "HS-903", syncedAt: SYNCED }] },
];

/* -------------------------------------------------------------------------- */
/* Opportunities                                                              */
/* -------------------------------------------------------------------------- */

interface Seed {
  name: string;
  accountId: string;
  businessUnitId: string;
  customerCountry: string;
  segment: MarketSegment;
  endUser?: string;
  endUserCountry?: string;
  createdAt: string;
  projectedCloseAt: string;
  quotedValue: number;
  marginValue: number;
  marginPct: number;
}

const seeds: Seed[] = [
  { name: "US Facility Buildout 2025", accountId: "acc-sysco", businessUnitId: "wyma", customerCountry: "USA", segment: "OEM", createdAt: "2025-03-01", projectedCloseAt: "2025-11-30", quotedValue: 7_000_000, marginValue: 3_850_000, marginPct: 55 },
  { name: "DE Facility Buildout 2025", accountId: "acc-partnercorp", businessUnitId: "wyma", customerCountry: "Germany", segment: "OEM", endUser: "Veg GmbH", endUserCountry: "Germany", createdAt: "2025-04-01", projectedCloseAt: "2026-06-30", quotedValue: 5_000_000, marginValue: 1_400_000, marginPct: 49 },
  { name: "NZ Facility Buildout 2026", accountId: "acc-vegco", businessUnitId: "wyma", customerCountry: "NZ", segment: "OEM", createdAt: "2025-06-01", projectedCloseAt: "2026-06-30", quotedValue: 3_000_000, marginValue: 1_440_000, marginPct: 48 },
  { name: "AUS Facility Buildout 2025", accountId: "acc-vegco", businessUnitId: "wyma", customerCountry: "Australia", segment: "OEM", createdAt: "2025-06-20", projectedCloseAt: "2026-12-19", quotedValue: 2_000_000, marginValue: 840_000, marginPct: 42 },
  { name: "MX Facility Buildout 2026", accountId: "acc-vegco", businessUnitId: "wyma", customerCountry: "Mexico", segment: "OEM", createdAt: "2026-05-29", projectedCloseAt: "2026-05-29", quotedValue: 1_500_000, marginValue: 675_000, marginPct: 45 },
  { name: "5 handsets, 50 blades", accountId: "acc-tyson", businessUnitId: "betcher", customerCountry: "USA", segment: "Aftermarket", createdAt: "2025-10-27", projectedCloseAt: "2026-01-31", quotedValue: 50_000, marginValue: 10_000, marginPct: 20 },
  { name: "100 blades", accountId: "acc-cargill", businessUnitId: "betcher", customerCountry: "USA", segment: "Aftermarket", createdAt: "2025-11-30", projectedCloseAt: "2026-01-31", quotedValue: 20_000, marginValue: 10_000, marginPct: 50 },
  { name: "5 handsets", accountId: "acc-jbs", businessUnitId: "betcher", customerCountry: "USA", segment: "Aftermarket", createdAt: "2025-11-02", projectedCloseAt: "2025-12-15", quotedValue: 10_000, marginValue: 5_000, marginPct: 50 },
  { name: "5 handsets, 50 blades", accountId: "acc-sysco", businessUnitId: "betcher", customerCountry: "USA", segment: "Aftermarket", createdAt: "2025-11-22", projectedCloseAt: "2026-01-10", quotedValue: 10_000, marginValue: 2_000, marginPct: 20 },
  { name: "2 handset, 20 blades", accountId: "acc-sysco", businessUnitId: "betcher", customerCountry: "USA", segment: "Both", createdAt: "2025-10-20", projectedCloseAt: "2025-12-12", quotedValue: 8_000, marginValue: 2_800, marginPct: 35 },
];

const openStages: DealStage[] = [
  "Negotiation", "Concepting", "Concepting", "Negotiation", "Designing",
  "Quoting", "Quoting", "Negotiation", "Negotiation", "Scoping",
];

/** Wyma deals flow from Salesforce + NetSuite; Betcher from HubSpot + CSV. */
function sourcesFor(businessUnitId: string, externalId: string): SourceRef[] {
  return businessUnitId === "wyma"
    ? [
        { connector: "salesforce", externalId, syncedAt: SYNCED },
        { connector: "netsuite", externalId: `NS-${externalId}`, syncedAt: SYNCED },
      ]
    : [
        { connector: "hubspot", externalId, syncedAt: SYNCED },
        { connector: "bulk-csv", externalId: `CSV-${externalId}`, syncedAt: SYNCED },
      ];
}

// Each seed becomes one open deal (varied stage) and one booked deal (won),
// matching the wireframe's two "Top 10" tables. A handful of seeds also get a
// lost variant so win-rate math (won ÷ decided) has real losses to count.
const lostSeedIndices = new Set([1, 3, 6, 9]); // 2 Wyma + 2 Betcher

const opportunities: Opportunity[] = seeds.flatMap((seed, i) => {
  const open: Opportunity = {
    ...seed,
    id: `opp-open-${i + 1}`,
    stage: openStages[i],
    sources: sourcesFor(seed.businessUnitId, `OPN-${i + 1}`),
  };
  const booked: Opportunity = {
    ...seed,
    id: `opp-won-${i + 1}`,
    stage: "Closed Won",
    sources: sourcesFor(seed.businessUnitId, `WON-${i + 1}`),
  };
  if (!lostSeedIndices.has(i)) return [open, booked];
  const lost: Opportunity = {
    ...seed,
    id: `opp-lost-${i + 1}`,
    name: `${seed.name} (alt bid)`,
    stage: "Closed Lost",
    quotedValue: Math.round(seed.quotedValue * 0.6),
    marginValue: Math.round(seed.marginValue * 0.6),
    sources: sourcesFor(seed.businessUnitId, `LST-${i + 1}`),
  };
  return [open, booked, lost];
});

/* -------------------------------------------------------------------------- */
/* Channels + generated lead records                                          */
/* -------------------------------------------------------------------------- */

const channelMeta: ChannelMeta[] = [
  { channel: "Bulk Upload", sourceType: "Paid", cost: 500_000 },
  { channel: "Website", sourceType: "Organic", cost: 10_000 },
  { channel: "Referral Within", sourceType: "Referral", cost: 0 },
  { channel: "Referral Across", sourceType: "Referral", cost: 0 },
  { channel: "Aftermarket", sourceType: "Aftermarket", cost: 0 },
];

const sourceTypeOf: Record<string, string> = Object.fromEntries(
  channelMeta.map((c) => [c.channel, c.sourceType]),
);

const connectorOf: Record<string, "bulk-csv" | "hubspot" | "salesforce" | "netsuite"> = {
  "Bulk Upload": "bulk-csv",
  Website: "hubspot",
  "Referral Within": "salesforce",
  "Referral Across": "salesforce",
  Aftermarket: "netsuite",
};

// Channel mix (weights sum to 100) → reproduces the "Leads by Source" spread.
const channelMix: [LeadChannel, number][] = [
  ["Bulk Upload", 34],
  ["Website", 26],
  ["Referral Within", 18],
  ["Referral Across", 13],
  ["Aftermarket", 9],
];
const channelPattern: LeadChannel[] = channelMix.flatMap(([c, w]) =>
  Array<LeadChannel>(w).fill(c),
);

const leadCustomers: { name: string; country: string; isCustomer: boolean }[] = [
  { name: "Sysco", country: "USA", isCustomer: true },
  { name: "PartnerCorp", country: "Germany", isCustomer: false },
  { name: "Veg Co", country: "NZ", isCustomer: true },
  { name: "Tyson", country: "USA", isCustomer: true },
  { name: "Cargill", country: "USA", isCustomer: true },
  { name: "JBS", country: "USA", isCustomer: false },
  { name: "Maple Foods", country: "Canada", isCustomer: true },
  { name: "Greenfield AG", country: "Australia", isCustomer: false },
];

const campaigns = [
  "FY Expansion",
  "Trade Show",
  "Webinar Series",
  "Outbound",
  "None",
];

const LEAD_COUNT = 1600;

// Deterministic generator (no Math.random — must be stable for SSR + tests).
const leads: LeadRecord[] = Array.from({ length: LEAD_COUNT }, (_, i) => {
  const channel = channelPattern[i % channelPattern.length];
  const segment: MarketSegment =
    channel === "Aftermarket" ? "Aftermarket" : i % 7 === 0 ? "Both" : "OEM";
  const businessUnitId =
    segment === "Aftermarket" ? "betcher" : i % 3 === 0 ? "betcher" : "wyma";

  // Stage mix per 20: 6 lead / 8 mql / 4 sql / 2 opp.
  const rank = i % 20;
  const stage: LeadRecord["stage"] =
    rank < 6 ? "lead" : rank < 14 ? "mql" : rank < 18 ? "sql" : "opp";

  const reachedSql = stage === "sql" || stage === "opp";
  const isOpp = stage === "opp";
  const unit = segment === "Aftermarket" ? 12_000 : 120_000;
  const quotedValue = isOpp ? unit + (i % 10) * Math.round(unit * 0.1) : 0;
  const projectedQuoteValue = reachedSql
    ? Math.round((quotedValue || unit) * 1.3)
    : 0;
  const bookedValue = isOpp && i % 2 === 0 ? Math.round(quotedValue * 0.5) : 0;

  const cust = leadCustomers[i % leadCustomers.length];
  const month = String((i % 12) + 1).padStart(2, "0");
  const day = String((i % 27) + 1).padStart(2, "0");

  return {
    id: `lead-${i}`,
    businessUnitId,
    segment,
    channel,
    sourceType: sourceTypeOf[channel],
    campaign: campaigns[i % campaigns.length],
    customerName: cust.name,
    customerCountry: cust.country,
    customerType: cust.isCustomer ? "customer" : "prospect",
    stage,
    createdAt: `2025-${month}-${day}`,
    quotedValue,
    projectedQuoteValue,
    bookedValue,
    sources: [
      { connector: connectorOf[channel], externalId: `lead-${i}`, syncedAt: SYNCED },
    ],
  };
});

/* -------------------------------------------------------------------------- */
/* The merged database                                                        */
/* -------------------------------------------------------------------------- */

/** The merged mock database — the single source every view derives from. */
export const crmDb: CrmDatabase = {
  accounts,
  opportunities,
  leads,
  channelMeta,
  leadRollups: {
    newCustomerPct: 20,
    avgTimeByStage: [
      { stage: "New→MQL", actualDays: 1.5, targetDays: 1.0 },
      { stage: "MQL→SQL", actualDays: 1.4, targetDays: 1.5 },
      { stage: "SQL→Opp", actualDays: 1.4, targetDays: 2.0 },
      { stage: "Opp→Quote", actualDays: 2.3, targetDays: 2.5 },
      { stage: "Quote→Won", actualDays: 3.2, targetDays: 3.0 },
    ],
    aftermarketAvgTimeByStage: [
      { stage: "New→MQL", actualDays: 1.2, targetDays: 1.0 },
      { stage: "MQL→SQL", actualDays: 1.6, targetDays: 1.5 },
      { stage: "SQL→Opp", actualDays: 1.8, targetDays: 2.0 },
      { stage: "Opp→Quote", actualDays: 2.0, targetDays: 2.5 },
      { stage: "Quote→Won", actualDays: 2.8, targetDays: 3.0 },
    ],
  },
  funnelRollups: {
    openQuotesValue: 33_000_000,
    bookedValue: 49_000_000,
    lostOrderValue: 32_700_000,
    winRatePct: 60,
    aopAttainmentPct: 108,
    bookingsThisYear: series([3.1, 2.6, 3.8, 4.2, 3.5, 5.1, 4.4, 3.9, 4.8, 5.6, 4.2, 3.8]),
    bookingsPriorYear: series([2.4, 2.2, 3.1, 3.0, 2.8, 4.0, 3.6, 3.2, 3.9, 4.1, 3.5, 3.2]),
    openQuotes: series([2.0, 2.8, 3.4, 2.9, 3.8, 4.6, 4.1, 3.7, 4.9, 5.2, 4.4, 5.0]),
    aopTarget: series([2.5, 2.7, 3.0, 3.2, 3.5, 3.8, 4.0, 4.1, 4.3, 4.5, 4.6, 4.8]),
    coverageRatio: series([2.6, 2.4, 2.9, 2.7, 3.1, 3.4, 2.8, 2.5, 3.2, 3.6, 3.0, 3.3]),
  },
};
