// =============================================================================
// Lead Management & Sales Funnel — Semantic Model (V2)
// =============================================================================
//
// Faithful transcription of the Power BI semantic model PDF
// ("Lead Management and Sales Funnel Semantic Model V2"), for review.
//
// This is a STAR SCHEMA: two fact tables (Lead, Opportunity) surrounded by
// shared dimension tables (BU, Source, Campaign, Date, Geography) plus a
// target/plan table (AOP). It is intentionally kept separate from the current
// app model in `model.ts` — the dashboards don't render from it yet. Once
// approved, we rework the app's data layer to map onto these entities.
//
// The /data-mapper tool consumes this model: `lib/mapping/target-schema.ts` is
// its runtime descriptor and type-checks its field names against these
// interfaces, so renames here surface as compile errors there.
//
// Type mapping from the PDF's Power BI types:
//   Int  -> number      Num  -> number
//   Str  -> string      Bool -> boolean
//   Date -> string (ISO 8601), matching the app's existing "dates are strings"
//           convention; the PBI "Date" dimension keys on a real date value.
//
// Naming: a table's own fields drop the redundant entity prefix (Opportunity
// has `name`, not `opportunityName`). Foreign keys keep their target-naming
// (`leadId`, `sourceId`, …) since they don't duplicate their home table. The
// PDF names keys "<Entity> Key"; we use the conventional `id` suffix. The
// lightweight id aliases below (all `number`) make FK targets self-documenting.
// =============================================================================

// --- Id aliases (documentation only; all numeric) ----------------------------

/** PK of the BU dimension (`BU.lvl2Id`). */
export type BULvl2Id = number;
/** PK of the Source dimension (`Source.id`). */
export type SourceId = number;
/** PK of the Campaign dimension (`Campaign.id`). */
export type CampaignId = number;
/** PK of the Lead fact (`Lead.id`). */
export type LeadId = number;
/** PK of the Opportunity fact (`Opportunity.id`). */
export type OpportunityId = number;
/** PK of the Geography dimension (`Geography.countryCode`), ISO 3166-1 numeric. */
export type CountryCode = number;
/** PK of the Date dimension (`Date.date`), an ISO date string here. */
export type DateId = string;

// --- Enumerated string domains (from PDF annotations) ------------------------
//
// Defined once as `as const` arrays with the union types derived from them, so
// the runtime mapping tool (`lib/mapping/target-schema.ts`) can import the
// arrays without restating the values.

/** Opportunity.oemOrAfter values — PDF: "OEM or After == OEM, Aftermarket, Both". */
export const OEM_OR_AFTER = ["OEM", "Aftermarket", "Both"] as const;
/** Opportunity.oemOrAfter — derived from {@link OEM_OR_AFTER}. */
export type OemOrAfter = (typeof OEM_OR_AFTER)[number];

/** Lead.finalState values — PDF: "Final state == qualification, dq, or nurture". */
export const FINAL_STATE = ["Qualification", "DQ", "Nurture"] as const;
/** Lead.finalState — derived from {@link FINAL_STATE}. */
export type FinalState = (typeof FINAL_STATE)[number];

// =============================================================================
// FACT TABLES
// =============================================================================

/**
 * Lead — fact table. One row per inbound lead, carrying its lifecycle stage
 * flags/dates and the per-stage durations (PDF: "All Durations in Days").
 */
export interface Lead {
  /** PK. */
  id: LeadId;
  name: string;
  /** FK -> BU. */
  buLvl2Id: BULvl2Id;
  /** FK -> Source. */
  sourceId: SourceId;
  /** FK -> Campaign. (PDF marks this PK on the Lead table; treated as the FK
   *  to Campaign, whose PK is `id`.) */
  campaignId: CampaignId;
  /** FK -> Date. */
  creationDate: DateId;

  customerName: string;
  /** PDF "Customer Existing" — existing customer vs net-new. */
  isExistingCustomer: boolean;
  /** FK -> Geography (by country). */
  customerCountry: string;
  endUser: string;
  /** FK -> Geography (by country). */
  endUserCountry: string;

  currentStatus: string;

  // --- MQL / SQL lifecycle flags + dates ---
  reachedMql: boolean;
  mqlDate: DateId;
  reachedSql: boolean;
  sqlDate: DateId;

  finalState: FinalState;
  finalStateDate: DateId;

  // --- Stage durations (days). PDF: "All Durations in Days". ---
  durationInDataLoad: number;
  durationInLoadToCrmAndAcknowledge: number;
  durationInLeadPrequalAndAssignToSales: number;
  durationInSalesLeadQual: number;
  durationInContact1: number;
  durationInBeyondContact1: number;

  // --- Aftermarket-specific durations (days) ---
  aftermarketDurationInFortifi: number;
  aftermarketDurationInBu: number;
  aftermarketDurationInContacts: number;
}

/**
 * Opportunity — fact table. One row per deal/quote, linked back to its
 * originating Lead. Holds the close-date trio (projected / actual / combined)
 * and the value + margin figures.
 */
export interface Opportunity {
  /** PK. */
  id: OpportunityId;
  /** FK -> Lead. */
  leadId: LeadId;
  /** FK -> BU. */
  buLvl2Id: BULvl2Id;
  name: string;
  stage: string;
  /** FK -> Date. */
  creationDate: DateId;
  /** FK -> Date. */
  projectedCloseDate: DateId;
  /** FK -> Date. */
  actualCloseDate: DateId;
  /** FK -> Date. Derived: actual if closed, else projected. */
  combinedCloseDate: DateId;
  customerName: string;
  /** FK -> Geography (by country). */
  customerCountry: string;
  endUserName: string;
  /** FK -> Geography (by country). */
  endUserCountry: string;

  oemOrAfter: OemOrAfter;

  prequoteEstimateValue: number;
  value: number;
  marginValue: number;
  /** Stored explicitly (not derived from value/margin). */
  marginPct: number;
}

// =============================================================================
// DIMENSION TABLES
// =============================================================================

/**
 * BU — business-unit dimension (two-level hierarchy). The PK is the level-2
 * key (`lvl2Id`); FKs elsewhere are named `buLvl2Id` to mark that grain.
 * PDF notes: hierarchy can be defined in DAX/PowerQuery, not needed in
 * Salesforce. Open question on the diagram: "What are the names of the fields
 * in the dropdowns with BU? Division?"
 */
export interface BU {
  /** PK. */
  lvl2Id: BULvl2Id;
  lvl2Name: string;
  lvl1Name: string;
  /** Sort order for display. */
  order: number;
}

/**
 * Source — lead/marketing source dimension. PDF: "Source is separate table
 * because of cost tracked at this level."
 */
export interface Source {
  /** PK. */
  id: SourceId;
  name: string;
  type: string;
  totalCost: number;
}

/**
 * Campaign — marketing campaign dimension. PDF: "This will likely be empty at
 * first; building out at John's rec."
 */
export interface Campaign {
  /** PK. */
  id: CampaignId;
  name: string;
  /** FK -> Source. */
  sourceId: SourceId;
  startDate: DateId;
  endDate: DateId;
}

/**
 * Date — date dimension. PDF: "To be marked as date table in PBI"; can be
 * defined in DAX/PowerQuery, not needed in Salesforce.
 */
export interface DateDim {
  /** PK. */
  date: DateId;
  year: number;
  quarter: string;
  month: number;
  monthName: string;
  day: number;
}

/**
 * Geography — country dimension. PDF: should be built as a table outside this
 * model and reused across reports for consistency. "Use ISO 3166-1 A3 and Num.
 * for code and name."
 */
export interface Geography {
  /** PK. ISO 3166-1 numeric. */
  countryCode: CountryCode;
  /** ISO 3166-1 alpha-3. */
  countryName: string;
  region: string;
}

// =============================================================================
// PLAN / TARGET TABLE
// =============================================================================

/**
 * AOP — Annual Operating Plan targets. Keyed by (BU, Date); no surrogate PK on
 * the diagram. PDF notes: "Possible that AOP may have country component"; can
 * be defined in DAX/PowerQuery, not needed in Salesforce.
 */
export interface AOP {
  /** FK -> BU. */
  buLvl2Id: BULvl2Id;
  /** FK -> Date. */
  date: DateId;
  targetValue: number;
}

// =============================================================================
// SCHEMA RELATIONSHIPS (star schema; "1" -> "many")
// =============================================================================
//
// These mirror the crow's-foot relationships drawn in the PDF. Documentation
// only — kept here so the join graph is reviewable alongside the entities.
//
//   Source     1 --< Lead          (sourceId)
//   Source     1 --< Campaign      (sourceId)
//   Campaign   1 --< Lead          (campaignId)
//   BU         1 --< Lead          (buLvl2Id)
//   BU         1 --< Opportunity   (buLvl2Id)
//   BU         1 --< AOP           (buLvl2Id)
//   Date       1 --< Lead          (creationDate, mqlDate, sqlDate, ...)
//   Date       1 --< Opportunity   (creationDate / projected / actual / combined)
//   Date       1 --< AOP           (date)
//   Lead       1 --< Opportunity   (leadId)
//   Geography  1 --< Lead          (customerCountry, endUserCountry)
//   Geography  1 --< Opportunity   (customerCountry, endUserCountry)
//
// =============================================================================

/** The full semantic model as one in-memory shape (mirrors the PBI dataset). */
export interface SemanticModel {
  // facts
  leads: Lead[];
  opportunities: Opportunity[];
  // dimensions
  businessUnits: BU[];
  sources: Source[];
  campaigns: Campaign[];
  dates: DateDim[];
  geographies: Geography[];
  // plan
  aop: AOP[];
}
