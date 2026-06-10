import { describe, expect, it } from "vitest";
import { databaseForYear } from "./datasets";
import {
  emptyDealFilter,
  emptyLeadFilter,
  filterLeads,
  filterOpportunities,
} from "../access/filters";
import { selectFunnelKpis, selectLeadKpis } from "../presentation/selectors";

const quotedM = (y: "2024" | "2025" | "2026") =>
  Number(
    selectLeadKpis(databaseForYear(y))
      .find((k) => k.label === "Quoted Value")!
      .value.replace(/[$M]/g, ""),
  );

describe("databaseForYear", () => {
  it("scales quoted value up with later years", () => {
    expect(quotedM("2024")).toBeLessThan(quotedM("2025"));
    expect(quotedM("2025")).toBeLessThan(quotedM("2026"));
  });

  it("varies win rate by year", () => {
    const wr = (y: "2024" | "2025" | "2026") =>
      selectFunnelKpis(databaseForYear(y)).find((k) => k.label === "Win Rate")!
        .value;
    expect(wr("2024")).toBe("54%");
    expect(wr("2025")).toBe("60%");
    expect(wr("2026")).toBe("63%");
  });

  it("anchors deal + lead creation to the selected year", () => {
    const db = databaseForYear("2024");
    expect(db.opportunities.every((o) => o.createdAt.startsWith("2024"))).toBe(true);
    expect(db.leads.every((l) => l.createdAt.startsWith("2024"))).toBe(true);
  });
});

describe("filters", () => {
  const db = databaseForYear("2025");

  it("filterLeads narrows by source name", () => {
    const only = filterLeads(db, { ...emptyLeadFilter, sourceName: "Website" });
    expect(only.leads.length).toBeGreaterThan(0);
    expect(only.leads.every((l) => l.channel === "Website")).toBe(true);
  });

  it("filterLeads narrows by campaign", () => {
    const only = filterLeads(db, { ...emptyLeadFilter, campaign: "Trade Show" });
    expect(only.leads.every((l) => l.campaign === "Trade Show")).toBe(true);
  });

  it("filterOpportunities narrows by segment", () => {
    const oem = filterOpportunities(db, { ...emptyDealFilter, segment: "OEM" });
    expect(oem.opportunities.length).toBeGreaterThan(0);
    expect(oem.opportunities.every((o) => o.segment === "OEM")).toBe(true);
  });
});
