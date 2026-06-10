import { describe, expect, it } from "vitest";
import { canSeeFinancials, demoSessions, scopeDb } from "./auth";
import { crmDb } from "../data/mock-data";
import { selectDeals } from "../presentation/selectors";

describe("scopeDb", () => {
  it("filters opportunities to the visible business units", () => {
    const scoped = scopeDb(crmDb, ["betcher"]);
    expect(scoped.opportunities.every((o) => o.businessUnitId === "betcher")).toBe(true);
    // 5 Betcher seeds × (1 open + 1 booked) + 2 lost variants = 12.
    expect(scoped.opportunities).toHaveLength(12);
  });

  it("narrows the deal table for a single-BU user", () => {
    const scoped = scopeDb(crmDb, demoSessions.single.businessUnitIds);
    const openRows = selectDeals(scoped, "open");
    expect(openRows).toHaveLength(5);
    expect(openRows.every((r) => r[0] === "Betcher")).toBe(true);
  });

  it("leaves the full dataset for an admin", () => {
    const scoped = scopeDb(crmDb, demoSessions.admin.businessUnitIds);
    expect(scoped.opportunities).toHaveLength(crmDb.opportunities.length);
  });
});

describe("financial gating", () => {
  it("is admin-only", () => {
    expect(canSeeFinancials(demoSessions.admin)).toBe(true);
    expect(canSeeFinancials(demoSessions.multi)).toBe(false);
    expect(canSeeFinancials(demoSessions.single)).toBe(false);
  });
});
