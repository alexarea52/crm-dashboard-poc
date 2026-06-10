import { describe, expect, it } from "vitest";
import {
  selectDeals,
  selectFunnelKpis,
  selectLeadKpis,
  selectLeadsBySource,
  selectSourceDetails,
} from "./selectors";
import { crmDb } from "../data/mock-data";

describe("lead KPIs (aggregated from lead records)", () => {
  const kpis = selectLeadKpis(crmDb);
  const by = (label: string) => kpis.find((k) => k.label === label)!;

  it("counts MQLs as a positive number", () => {
    expect(Number(by("MQLs Created").value)).toBeGreaterThan(0);
  });

  it("formats conversion percentages", () => {
    expect(by("MQLs Converted to SQL").sub).toMatch(/^\(\d+%\)$/);
    expect(by("SQLs Converted to Opp").sub).toMatch(/^\(\d+%\)$/);
  });

  it("formats quoted value in $M", () => {
    expect(by("Quoted Value").value).toMatch(/^\$[\d.]+M$/);
  });
});

describe("leads by source", () => {
  const bars = selectLeadsBySource(crmDb);

  it("reflects the channel mix and sums to ~100%", () => {
    expect(bars.find((b) => b.label === "Bulk Upload")!.value).toBe(34);
    const total = bars.reduce((s, b) => s + b.value, 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });
});

describe("source details (financial gating)", () => {
  it("includes cost columns when permitted", () => {
    const { columns, rows } = selectSourceDetails(crmDb, true);
    expect(columns).toHaveLength(9);
    expect(columns.some((c) => c.header === "Cost per MQL")).toBe(true);
    expect(rows[0][3]).toBe("$500,000"); // Bulk Upload marketing cost
    expect(rows[0][4]).toMatch(/^\$/); // cost per MQL is a $ figure
  });

  it("drops cost columns when not permitted", () => {
    const { columns, rows } = selectSourceDetails(crmDb, false);
    expect(columns).toHaveLength(6);
    expect(columns.some((c) => c.header.startsWith("Cost"))).toBe(false);
    expect(rows[0]).toHaveLength(6);
  });
});

describe("deals", () => {
  it("returns the top 10 open deals, sorted by quoted value desc", () => {
    const rows = selectDeals(crmDb, "open");
    expect(rows).toHaveLength(10);
    expect(rows[0][1]).toBe("US Facility Buildout 2025");
    expect(rows[0][10]).toBe("$7,000,000");
    expect(rows.every((r) => r[7] !== "Closed Won")).toBe(true);
  });

  it("returns only Closed Won in the booked table", () => {
    const rows = selectDeals(crmDb, "booked");
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r[7] === "Closed Won")).toBe(true);
  });
});

describe("funnel KPIs", () => {
  it("formats rollups", () => {
    const kpis = selectFunnelKpis(crmDb);
    const by = (label: string) => kpis.find((k) => k.label === label)!;
    expect(by("Open Quotes Value").value).toBe("$33.0M");
    expect(by("Win Rate").value).toBe("60%");
  });
});
