import { describe, expect, it } from "vitest";
import type { SqlGenerator } from "./generator";
import { askSql } from "./pipeline";
import { demoSessions } from "../access/auth";

describe("askSql end-to-end (stub generator)", () => {
  it("answers the largest open deal for an admin (Wyma's $7M build)", async () => {
    const res = await askSql("What's our largest open deal?", demoSessions.admin);
    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") return;
    expect(res.generator).toBe("stub");
    expect(res.sql).toContain("opportunities");
    expect(res.answer).toContain("US Facility Buildout 2025");
    expect(res.rows.length).toBeGreaterThan(0);
  });

  it("scopes the same question to Betcher for a single-BU user", async () => {
    const res = await askSql("What's our largest open deal?", demoSessions.single);
    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") return;
    expect(res.answer).not.toContain("US Facility");
    const buColumn = res.columns.indexOf("business_unit_id");
    expect(res.rows.every((r) => r[buColumn] === "betcher")).toBe(true);
  });

  it("answers win rate grouped by year", async () => {
    const res = await askSql("What was the win rate in 2025?", demoSessions.admin);
    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") return;
    expect(res.columns).toContain("win_rate_pct");
    expect(res.rows).toHaveLength(1); // year filter applied
  });

  it("refuses cost questions for non-admins", async () => {
    const res = await askSql("What's the cost per MQL?", demoSessions.single);
    expect(res.kind).toBe("unsupported");
    if (res.kind !== "unsupported") return;
    expect(res.answer).toMatch(/restricted/i);
  });

  it("answers cost questions for admins", async () => {
    const res = await askSql("What's the cost per MQL?", demoSessions.admin);
    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") return;
    expect(res.columns).toContain("cost_per_mql");
  });

  it("returns unsupported for unmappable questions", async () => {
    const res = await askSql("What's the weather like?", demoSessions.admin);
    expect(res.kind).toBe("unsupported");
  });

  it("guards against a malicious generator", async () => {
    const malicious: SqlGenerator = {
      name: "malicious",
      generate: async () => ({ kind: "sql", sql: "DROP TABLE raw_leads" }),
    };
    const res = await askSql("anything", demoSessions.admin, malicious);
    expect(res.kind).toBe("guard_rejected");

    // And the table is still there.
    const ok = await askSql("bookings by year", demoSessions.admin);
    expect(ok.kind).toBe("ok");
  });

  it("guards against base-table access from a generator", async () => {
    const sneaky: SqlGenerator = {
      name: "sneaky",
      generate: async () => ({ kind: "sql", sql: "SELECT * FROM raw_opportunities" }),
    };
    const res = await askSql("anything", demoSessions.single, sneaky);
    expect(res.kind).toBe("guard_rejected");
  });

  it("surfaces execution errors for SQL referencing gated columns", async () => {
    const gated: SqlGenerator = {
      name: "gated",
      generate: async () => ({
        kind: "sql",
        sql: "SELECT margin_value FROM opportunities",
      }),
    };
    // Guard passes (opportunities is allowed); the non-admin view lacks the
    // column, so execution fails — defense layer 2 catching what 3 can't.
    const res = await askSql("anything", demoSessions.single, gated);
    expect(res.kind).toBe("execution_error");
    if (res.kind !== "execution_error") return;
    expect(res.message).toMatch(/no such column/i);
  });

  it("caps result size at the row limit", async () => {
    const wide: SqlGenerator = {
      name: "wide",
      generate: async () => ({ kind: "sql", sql: "SELECT * FROM leads" }),
    };
    const res = await askSql("anything", demoSessions.admin, wide);
    expect(res.kind).toBe("ok");
    if (res.kind !== "ok") return;
    expect(res.rows.length).toBeLessThanOrEqual(200);
  });
});
