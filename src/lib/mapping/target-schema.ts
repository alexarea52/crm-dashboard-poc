// =============================================================================
// Target schema — runtime descriptor of the V2 semantic model
// =============================================================================
//
// `semantic-model.ts` defines the target shape as TypeScript *types*, which are
// erased at runtime. The mapping UI needs to enumerate the target entities and
// their fields (names, types, enum options, FK targets) at runtime, so this
// file restates that model as data.
//
// Sync with `data/semantic-model.ts` is enforced by the compiler where types
// can reach: the `field<T>()` constructor pins every field name to `keyof T` of the
// matching interface (a rename there is a compile error here), enum options
// are imported rather than restated, and `references` is typed as EntityKey.
// Only `required`/`pk` flags and labels remain hand-maintained.
// =============================================================================

import {
  FINAL_STATE,
  OEM_OR_AFTER,
  type AOP,
  type BU,
  type Campaign,
  type DateDim,
  type Geography,
  type Lead,
  type Opportunity,
  type Source,
} from "../crm/data/semantic-model";

export { FINAL_STATE, OEM_OR_AFTER };

/** The coercion type of a target field. */
export type FieldType = "string" | "number" | "boolean" | "date" | "enum";

/** Keys of the target entities (tables) in the semantic model. */
export type EntityKey =
  | "lead"
  | "opportunity"
  | "bu"
  | "source"
  | "campaign"
  | "date"
  | "geography"
  | "aop";

/** One mappable field on a target entity, with its type + constraints. */
export interface TargetField {
  /** Field name as it appears on the semantic-model interface. */
  name: string;
  /** Human-readable label for the mapping UI. */
  label: string;
  type: FieldType;
  /** Must be mapped for a row to be valid. */
  required: boolean;
  /** True if this field is the entity's primary key. */
  pk?: boolean;
  /** For `enum` fields, the allowed target values. */
  options?: string[];
  /** If a foreign key, the target entity key it references. */
  references?: EntityKey;
  /** Short note (often lifted from the PDF) shown as a hint. */
  note?: string;
}

/** A target entity (table) and the fields a source can be mapped onto. */
export interface TargetEntity {
  key: EntityKey;
  label: string;
  description: string;
  fields: TargetField[];
}

/**
 * Compact field constructor. The type parameter pins `name` to a real field of
 * the matching semantic-model interface, so drift becomes a compile error.
 */
function field<T>(
  name: keyof T & string,
  label: string,
  type: FieldType,
  extra: Partial<TargetField> = {},
): TargetField {
  return { name, label, type, required: false, ...extra };
}

export const TARGET_SCHEMA: TargetEntity[] = [
  {
    key: "lead",
    label: "Lead",
    description:
      "Fact table — one row per inbound lead, with lifecycle flags/dates and per-stage durations (days).",
    fields: [
      field<Lead>("id", "Lead ID", "number", { required: true, pk: true }),
      field<Lead>("name", "Lead Name", "string", { required: true }),
      field<Lead>("buLvl2Id", "Business Unit ID", "number", { required: true, references: "bu" }),
      field<Lead>("sourceId", "Source ID", "number", { required: true, references: "source" }),
      field<Lead>("campaignId", "Campaign ID", "number", { references: "campaign" }),
      field<Lead>("creationDate", "Lead Creation Date", "date", { required: true }),
      field<Lead>("customerName", "Customer Name", "string", { required: true }),
      field<Lead>("isExistingCustomer", "Existing Customer?", "boolean"),
      field<Lead>("customerCountry", "Customer Country", "string", {
        note: "Joins to Geography by country (string today; see model questions).",
      }),
      field<Lead>("endUser", "End User", "string"),
      field<Lead>("endUserCountry", "End User Country", "string"),
      field<Lead>("currentStatus", "Current Status", "string"),
      field<Lead>("reachedMql", "Reached MQL?", "boolean"),
      field<Lead>("mqlDate", "MQL Date", "date"),
      field<Lead>("reachedSql", "Reached SQL?", "boolean"),
      field<Lead>("sqlDate", "SQL Date", "date"),
      field<Lead>("finalState", "Final State", "enum", { options: [...FINAL_STATE] }),
      field<Lead>("finalStateDate", "Final State Date", "date"),
      field<Lead>("durationInDataLoad", "Duration in Data Load (days)", "number"),
      field<Lead>("durationInLoadToCrmAndAcknowledge", "Duration in Load to CRM & Acknowledge (days)", "number"),
      field<Lead>("durationInLeadPrequalAndAssignToSales", "Duration in Lead Pre-qual & Assign to Sales (days)", "number"),
      field<Lead>("durationInSalesLeadQual", "Duration in Sales Lead Qual (days)", "number"),
      field<Lead>("durationInContact1", "Duration in Contact 1 (days)", "number"),
      field<Lead>("durationInBeyondContact1", "Duration in Beyond Contact 1 (days)", "number"),
      field<Lead>("aftermarketDurationInFortifi", "Aftermarket Duration in Fortifi (days)", "number"),
      field<Lead>("aftermarketDurationInBu", "Aftermarket Duration in BU (days)", "number"),
      field<Lead>("aftermarketDurationInContacts", "Aftermarket Duration in Contact(s) (days)", "number"),
    ],
  },
  {
    key: "opportunity",
    label: "Opportunity",
    description:
      "Fact table — one row per deal/quote, linked to its originating Lead. Close-date trio + value & margin.",
    fields: [
      field<Opportunity>("id", "Opportunity ID", "number", { required: true, pk: true }),
      field<Opportunity>("leadId", "Lead ID", "number", { required: true, references: "lead" }),
      field<Opportunity>("buLvl2Id", "Business Unit ID", "number", { required: true, references: "bu" }),
      field<Opportunity>("name", "Opportunity Name", "string", { required: true }),
      field<Opportunity>("stage", "Opportunity Stage", "string", { required: true }),
      field<Opportunity>("creationDate", "Creation Date", "date", { required: true }),
      field<Opportunity>("projectedCloseDate", "Projected Close Date", "date"),
      field<Opportunity>("actualCloseDate", "Actual Close Date", "date"),
      field<Opportunity>("combinedCloseDate", "Combined Close Date", "date", {
        note: "Actual if closed, else projected.",
      }),
      field<Opportunity>("customerName", "Customer Name", "string"),
      field<Opportunity>("customerCountry", "Customer Country", "string"),
      field<Opportunity>("endUserName", "End User Name", "string"),
      field<Opportunity>("endUserCountry", "End User Country", "string"),
      field<Opportunity>("oemOrAfter", "OEM or Aftermarket", "enum", { options: [...OEM_OR_AFTER] }),
      field<Opportunity>("prequoteEstimateValue", "Prequote Estimate Value", "number"),
      field<Opportunity>("value", "Opportunity Value", "number"),
      field<Opportunity>("marginValue", "Margin Value", "number"),
      field<Opportunity>("marginPct", "Margin %", "number"),
    ],
  },
  {
    key: "bu",
    label: "Business Unit",
    description: "Dimension — two-level BU hierarchy. PK is the level-2 key.",
    fields: [
      field<BU>("lvl2Id", "BU Level 2 ID", "number", { required: true, pk: true }),
      field<BU>("lvl2Name", "BU Level 2 Name", "string", { required: true }),
      field<BU>("lvl1Name", "BU Level 1 Name", "string", { required: true }),
      field<BU>("order", "Sort Order", "number"),
    ],
  },
  {
    key: "source",
    label: "Source",
    description: "Dimension — lead/marketing source; cost is tracked here.",
    fields: [
      field<Source>("id", "Source ID", "number", { required: true, pk: true }),
      field<Source>("name", "Source Name", "string", { required: true }),
      field<Source>("type", "Source Type", "string"),
      field<Source>("totalCost", "Total Cost", "number"),
    ],
  },
  {
    key: "campaign",
    label: "Campaign",
    description: "Dimension — marketing campaign.",
    fields: [
      field<Campaign>("id", "Campaign ID", "number", { required: true, pk: true }),
      field<Campaign>("name", "Campaign Name", "string", { required: true }),
      field<Campaign>("sourceId", "Source ID", "number", { references: "source" }),
      field<Campaign>("startDate", "Campaign Start Date", "date"),
      field<Campaign>("endDate", "Campaign End Date", "date"),
    ],
  },
  {
    key: "date",
    label: "Date",
    description:
      "Date dimension (marked as the date table in PBI). Usually not in the export — derived automatically from all mapped date values when left unmapped.",
    fields: [
      field<DateDim>("date", "Date", "date", { required: true, pk: true }),
      field<DateDim>("year", "Year", "number"),
      field<DateDim>("quarter", "Quarter", "string"),
      field<DateDim>("month", "Month", "number"),
      field<DateDim>("monthName", "Month Name", "string"),
      field<DateDim>("day", "Day", "number"),
    ],
  },
  {
    key: "geography",
    label: "Geography",
    description: "Country dimension — ISO 3166-1 numeric code + alpha-3 name.",
    fields: [
      field<Geography>("countryCode", "Country Code (ISO numeric)", "number", { required: true, pk: true }),
      field<Geography>("countryName", "Country Name (ISO alpha-3)", "string", { required: true }),
      field<Geography>("region", "Region", "string"),
    ],
  },
  {
    key: "aop",
    label: "AOP (Annual Operating Plan)",
    description: "Plan/target table — keyed by (BU, Date). No surrogate PK.",
    fields: [
      field<AOP>("buLvl2Id", "Business Unit ID", "number", { required: true, references: "bu" }),
      field<AOP>("date", "Date", "date", { required: true, references: "date" }),
      field<AOP>("targetValue", "Target Value", "number", { required: true }),
    ],
  },
];

/** Look up one target entity by key. */
export function targetEntity(key: string): TargetEntity | undefined {
  return TARGET_SCHEMA.find((entity) => entity.key === key);
}
