// Build the in-memory SQLite database from the mock datasets — all available
// years, warehouse-style. In production this whole module is replaced by a
// connection to the real warehouse.

import Database from "better-sqlite3";
import { DDL } from "./schema";
import { availableYears, databaseForYear } from "../data/datasets";
import { crmDb } from "../data/mock-data";

/** Create + seed the in-memory database (all years, all tables). */
export function buildCrmSqlite(): Database.Database {
  const db = new Database(":memory:");
  db.exec(DDL);

  const insertAccount = db.prepare(
    `INSERT INTO raw_accounts (id, name, country, segment, is_customer)
     VALUES (@id, @name, @country, @segment, @isCustomer)`,
  );
  const insertChannel = db.prepare(
    `INSERT INTO raw_channel_meta (channel, source_type, cost)
     VALUES (@channel, @sourceType, @cost)`,
  );
  const insertOpp = db.prepare(
    `INSERT INTO raw_opportunities (
       id, year, name, account_id, account_name, business_unit_id,
       customer_country, segment, end_user, end_user_country, stage,
       created_at, projected_close_at, quoted_value, margin_value, margin_pct
     ) VALUES (
       @id, @year, @name, @accountId, @accountName, @businessUnitId,
       @customerCountry, @segment, @endUser, @endUserCountry, @stage,
       @createdAt, @projectedCloseAt, @quotedValue, @marginValue, @marginPct
     )`,
  );
  const insertLead = db.prepare(
    `INSERT INTO raw_leads (
       id, year, business_unit_id, segment, channel, source_type, campaign,
       customer_name, customer_country, customer_type, stage, created_at,
       quoted_value, projected_quote_value, booked_value
     ) VALUES (
       @id, @year, @businessUnitId, @segment, @channel, @sourceType, @campaign,
       @customerName, @customerCountry, @customerType, @stage, @createdAt,
       @quotedValue, @projectedQuoteValue, @bookedValue
     )`,
  );

  const seedAll = db.transaction(() => {
    // Reference data is year-invariant — insert once from the base dataset.
    const accountName = new Map(crmDb.accounts.map((a) => [a.id, a.name]));
    for (const a of crmDb.accounts) {
      insertAccount.run({ ...a, isCustomer: a.isCustomer ? 1 : 0 });
    }
    for (const c of crmDb.channelMeta) {
      insertChannel.run(c);
    }

    for (const year of availableYears) {
      const yearDb = databaseForYear(year);
      const y = Number(year);
      for (const o of yearDb.opportunities) {
        insertOpp.run({
          ...o,
          year: y,
          accountName: accountName.get(o.accountId) ?? "—",
          endUser: o.endUser ?? null,
          endUserCountry: o.endUserCountry ?? null,
        });
      }
      for (const l of yearDb.leads) {
        insertLead.run({ ...l, year: y });
      }
    }
  });

  seedAll();
  return db;
}
