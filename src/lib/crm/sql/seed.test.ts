import { describe, expect, it } from "vitest";
import { buildCrmSqlite } from "./seed";
import { availableYears, databaseForYear } from "../data/datasets";
import { crmDb } from "../data/mock-data";

const db = buildCrmSqlite();

describe("buildCrmSqlite", () => {
  it("seeds every available year", () => {
    const years = db
      .prepare("SELECT DISTINCT year FROM raw_leads ORDER BY year")
      .all()
      .map((r) => (r as { year: number }).year);
    expect(years).toEqual(availableYears.map(Number));
  });

  it("seeds opportunities for all years", () => {
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM raw_opportunities")
      .get() as { n: number };
    expect(n).toBe(availableYears.length * crmDb.opportunities.length);
  });

  it("per-year lead counts match databaseForYear", () => {
    for (const year of availableYears) {
      const { n } = db
        .prepare("SELECT COUNT(*) AS n FROM raw_leads WHERE year = ?")
        .get(Number(year)) as { n: number };
      expect(n).toBe(databaseForYear(year).leads.length);
    }
  });

  it("scales values by the year factor (2024 < 2025 for the same deal)", () => {
    const quoted = (y: number) =>
      (db
        .prepare(
          "SELECT quoted_value AS v FROM raw_opportunities WHERE year = ? AND name = 'US Facility Buildout 2025' AND stage != 'Closed Won'",
        )
        .get(y) as { v: number }).v;
    expect(quoted(2024)).toBeLessThan(quoted(2025));
    expect(quoted(2024)).toBe(Math.round(7_000_000 * 0.82));
  });

  it("denormalizes account_name onto opportunities", () => {
    const row = db
      .prepare(
        "SELECT account_name FROM raw_opportunities WHERE account_id = 'acc-sysco' LIMIT 1",
      )
      .get() as { account_name: string };
    expect(row.account_name).toBe("Sysco");
  });
});
