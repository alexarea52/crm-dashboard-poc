import { describe, expect, it } from "vitest";
import { createAssistant } from "./assistant";
import { demoSessions, scopeDb } from "../access/auth";
import { crmDb } from "../data/mock-data";

const admin = createAssistant(crmDb, demoSessions.admin);

describe("assistant intents", () => {
  it("answers win rate", () => {
    expect(admin.answer("What's our win rate?").text).toContain("60%");
  });

  it("answers largest open deal", () => {
    expect(admin.answer("what's the largest open deal?").text).toContain(
      "US Facility",
    );
  });

  it("falls back for unknown questions", () => {
    expect(admin.answer("what's the weather?").bullets).toEqual(admin.examples);
  });
});

describe("assistant respects gating", () => {
  it("hides cost figures from non-admins", () => {
    const buUser = createAssistant(crmDb, demoSessions.single);
    expect(buUser.answer("what is the cost per mql?").text.toLowerCase()).toContain(
      "restricted",
    );
  });

  it("shows cost figures to admins", () => {
    expect(admin.answer("what is the cost per mql?").text).toContain("$");
  });
});

describe("assistant respects scope", () => {
  it("reports the scoped largest deal for a single-BU user", () => {
    const scoped = scopeDb(crmDb, demoSessions.single.businessUnitIds);
    const buUser = createAssistant(scoped, demoSessions.single);
    // Betcher's largest open deal is "5 handsets, 50 blades" ($50,000),
    // not Wyma's $7M facility build.
    expect(buUser.answer("largest open deal").text).not.toContain("US Facility");
  });
});
