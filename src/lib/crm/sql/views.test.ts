import { describe, expect, it } from "vitest";
import { buildCrmSqlite } from "./seed";
import { withSessionViews } from "./views";
import { demoSessions } from "../access/auth";

const db = buildCrmSqlite();

describe("withSessionViews scoping", () => {
  it("a single-BU session only sees its own business unit", () => {
    const bus = withSessionViews(db, demoSessions.single, () =>
      db
        .prepare("SELECT DISTINCT business_unit_id AS bu FROM leads")
        .all()
        .map((r) => (r as { bu: string }).bu),
    );
    expect(bus).toEqual(["betcher"]);
  });

  it("hand-written SQL targeting another BU returns nothing", () => {
    const rows = withSessionViews(db, demoSessions.single, () =>
      db
        .prepare("SELECT * FROM opportunities WHERE business_unit_id = 'wyma'")
        .all(),
    );
    expect(rows).toEqual([]);
  });

  it("an admin sees all business units", () => {
    const bus = withSessionViews(db, demoSessions.admin, () =>
      db
        .prepare("SELECT DISTINCT business_unit_id AS bu FROM leads ORDER BY bu")
        .all()
        .map((r) => (r as { bu: string }).bu),
    );
    expect(bus).toEqual(["betcher", "wyma"]);
  });
});

describe("withSessionViews financial gating", () => {
  it("non-admin views have no margin or cost columns", () => {
    withSessionViews(db, demoSessions.single, () => {
      expect(() => db.prepare("SELECT margin_value FROM opportunities")).toThrow(
        /no such column/i,
      );
      expect(() => db.prepare("SELECT cost FROM channels")).toThrow(
        /no such column/i,
      );
    });
  });

  it("admin views include financial columns", () => {
    const row = withSessionViews(db, demoSessions.admin, () =>
      db
        .prepare("SELECT margin_value FROM opportunities ORDER BY margin_value DESC LIMIT 1")
        .get(),
    ) as { margin_value: number };
    expect(row.margin_value).toBeGreaterThan(0);
  });
});

describe("withSessionViews lifecycle", () => {
  it("drops the views afterwards", () => {
    withSessionViews(db, demoSessions.admin, () => null);
    expect(() => db.prepare("SELECT * FROM leads")).toThrow(/no such table/i);
  });

  it("drops the views even when fn throws", () => {
    expect(() =>
      withSessionViews(db, demoSessions.admin, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(() => db.prepare("SELECT * FROM leads")).toThrow(/no such table/i);
  });
});
