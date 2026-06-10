// Lazy per-process SQLite singleton. globalThis-cached so it survives Next's
// dev-mode HMR module reloads instead of reseeding on every edit.
//
// Server-only: this module must never be imported from client components —
// it is intentionally NOT re-exported from "@/lib/crm" (the client barrel).

import type Database from "better-sqlite3";
import { buildCrmSqlite } from "./seed";

const g = globalThis as typeof globalThis & {
  __crmSqlDb?: Database.Database;
};

/** The process-wide database, built on first use. */
export function getSqlDb(): Database.Database {
  g.__crmSqlDb ??= buildCrmSqlite();
  return g.__crmSqlDb;
}
