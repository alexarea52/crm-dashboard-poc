// Public entry point for the CRM data layer. Client components import from
// "@/lib/crm". Color/theme decisions are NOT here — selectors emit semantic
// roles and components resolve them to CSS tokens (see globals.css).
//
// Layout:
//   data/          canonical model, mock data, per-year datasets, registries
//   access/        sessions, roles, scoping, financial gating, filters
//   presentation/  view types + selectors/queries deriving render-ready data
//   assistant/     the mock keyword assistant + glossary content
//   sql/           text-to-SQL pipeline — SERVER-ONLY, deliberately not
//                  re-exported here (only sql/types.ts is client-safe)

export * from "./data/model";
export * from "./data/connectors";
export * from "./data/business-units";
export * from "./data/datasets";
export { crmDb } from "./data/mock-data";

export * from "./access/auth";
export * from "./access/filters";

export * from "./presentation/view";
export * from "./presentation/queries";
export * as selectors from "./presentation/selectors";

export * from "./assistant/assistant";
export * from "./assistant/glossary";
