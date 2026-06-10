import { describe, expect, it } from "vitest";
import { ROW_LIMIT, validateAndCap } from "./guard";
import { EXPOSED_VIEWS } from "./views";

const check = (sql: string) => validateAndCap(sql, EXPOSED_VIEWS);

describe("guard accepts", () => {
  it.each([
    "SELECT * FROM leads",
    "SELECT channel, COUNT(*) FROM leads GROUP BY channel ORDER BY 2 DESC",
    "SELECT l.channel, c.source_type FROM leads l JOIN channels c ON l.channel = c.channel",
    "WITH top AS (SELECT * FROM opportunities) SELECT * FROM top",
    "SELECT * FROM leads;",
    "SELECT * FROM (SELECT year FROM leads) GROUP BY year",
    "SELECT * FROM leads WHERE customer_name = 'O''Brien; DROP TABLE x'", // literal contents ignored
  ])("%s", (sql) => {
    expect(check(sql).ok).toBe(true);
  });

  it("wraps with a LIMIT cap", () => {
    const res = check("SELECT * FROM leads");
    if (!res.ok) throw new Error("expected ok");
    expect(res.cappedSql).toContain(`LIMIT ${ROW_LIMIT}`);
  });
});

describe("guard rejects", () => {
  it.each([
    ["PRAGMA table_info(leads)", /select/i],
    ["ATTACH DATABASE 'x' AS y", /select/i],
    ["INSERT INTO leads VALUES (1)", /select/i],
    ["SELECT * FROM leads; SELECT * FROM accounts", /single statement/i],
    ["SELECT * FROM raw_leads", /unknown table|base tables/i],
    ["SELECT * FROM sqlite_master", /disallowed keyword/i],
    ["SELECT * FROM main.raw_leads", /schema-qualified/i],
    ["SELECT * FROM leads -- sneaky", /comments/i],
    ["SELECT * FROM nonexistent", /unknown table/i],
    ["DELETE FROM leads", /select/i],
    ["SELECT * FROM leads WHERE 1 IN (SELECT 1 FROM raw_opportunities)", /unknown table|base tables/i],
    ["WITH x AS (SELECT * FROM leads) DELETE FROM x", /select|disallowed/i],
    ["SELECT load_extension('evil')", /disallowed keyword/i],
    ["", /empty/i],
  ])("%s", (sql, reason) => {
    const res = check(sql);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(reason);
  });
});
