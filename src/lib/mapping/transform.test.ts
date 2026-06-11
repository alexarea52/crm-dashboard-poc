import { describe, expect, it } from "vitest";
import { normalizeDate, parseNumber } from "./coerce";
import { distinctValues, parseCsv } from "./csv";
import {
  autoMap,
  fieldMapping,
  rebaseMapping,
  setFieldMapping,
  unmappedRequired,
  type EntityMapping,
} from "./mapping";
import { targetEntity } from "./target-schema";
import { shredModel, transformRows, type ShredInput } from "./transform";

describe("parseCsv", () => {
  it("parses headers + rows keyed by header", () => {
    const { headers, rows } = parseCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("handles quoted fields with commas, escaped quotes, and CRLF", () => {
    const { rows } = parseCsv('name,note\r\n"Acme, Inc.","say ""hi"""\r\n');
    expect(rows[0]).toEqual({ name: "Acme, Inc.", note: 'say "hi"' });
  });

  it("drops fully-blank lines", () => {
    const { rows } = parseCsv("a\n1\n\n2\n");
    expect(rows).toEqual([{ a: "1" }, { a: "2" }]);
  });

  it("renames duplicate headers instead of collapsing them", () => {
    const { headers, rows } = parseCsv("Name,Created,Name\nlead,2026,opp\n");
    expect(headers).toEqual(["Name", "Created", "Name (2)"]);
    expect(rows[0]).toEqual({ Name: "lead", Created: "2026", "Name (2)": "opp" });
  });
});

describe("distinctValues", () => {
  it("returns sorted, de-duped, non-empty values", () => {
    const rows = [{ s: "b" }, { s: "a" }, { s: "" }, { s: "b" }];
    expect(distinctValues(rows, "s")).toEqual(["a", "b"]);
  });
});

describe("parseNumber", () => {
  it("strips export formatting", () => {
    expect(parseNumber("$1,200.50")).toBe(1200.5);
    expect(parseNumber("(300)")).toBe(-300);
    expect(parseNumber("12.5%")).toBe(12.5);
    expect(parseNumber("1 200")).toBe(1200);
  });

  it("returns NaN for non-numbers", () => {
    expect(Number.isNaN(parseNumber("abc"))).toBe(true);
    expect(Number.isNaN(parseNumber("$"))).toBe(true);
  });
});

describe("normalizeDate", () => {
  it("keeps ISO dates and trims datetimes", () => {
    expect(normalizeDate("2026-01-15")).toBe("2026-01-15");
    expect(normalizeDate("2026-1-5T14:30:00Z")).toBe("2026-01-05");
  });

  it("parses slashy dates, defaulting month-first", () => {
    expect(normalizeDate("1/15/2026")).toBe("2026-01-15");
    expect(normalizeDate("01/02/2026")).toBe("2026-01-02");
    expect(normalizeDate("1/5/26")).toBe("2026-01-05");
  });

  it("an unambiguous part wins over the hint; dmy resolves the rest", () => {
    expect(normalizeDate("15/01/2026")).toBe("2026-01-15");
    expect(normalizeDate("01/02/2026", "dmy")).toBe("2026-02-01");
  });

  it("falls back to Date.parse for month names; rejects garbage", () => {
    expect(normalizeDate("January 15, 2026")).toBe("2026-01-15");
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("13/13/2026")).toBeNull();
  });
});

describe("autoMap", () => {
  it("fuzzy-matches headers to target fields", () => {
    const mapping = autoMap("source", ["Source Name", "src type", "unrelated"]);
    const byTarget = Object.fromEntries(mapping.fields.map((field) => [field.target, field.sourceColumn]));
    expect(byTarget.name).toBe("Source Name");
    expect(byTarget.type).toBe("src type");
    expect(byTarget.id).toBeNull();
  });

  it("prefers the exact header even when a looser match comes first", () => {
    const mapping = autoMap("lead", ["Customer Name", "Lead Name"]);
    const byTarget = Object.fromEntries(mapping.fields.map((field) => [field.target, field.sourceColumn]));
    expect(byTarget.name).toBe("Lead Name");
    expect(byTarget.customerName).toBe("Customer Name");
  });

  it("leaves weak substring matches unmapped rather than guessing", () => {
    const mapping = autoMap("lead", ["OppId"]);
    expect(fieldMapping(mapping, "id")!.sourceColumn).toBeNull();
  });

  it("marks suggestions with auto: true", () => {
    const mapping = autoMap("source", ["Source Name"]);
    expect(fieldMapping(mapping, "name")!.auto).toBe(true);
    expect(fieldMapping(mapping, "id")!.auto).toBeUndefined();
  });
});

describe("rebaseMapping", () => {
  it("keeps manual mappings whose column still exists, re-suggests the rest", () => {
    const manual = setFieldMapping(autoMap("source", ["Source Name", "Cost"]), {
      target: "totalCost",
      sourceColumn: "Cost",
    });
    const after = rebaseMapping(manual, "source", ["Source Name", "Cost", "Source ID"]);
    expect(fieldMapping(after, "totalCost")!.sourceColumn).toBe("Cost");
    expect(fieldMapping(after, "id")!.sourceColumn).toBe("Source ID");
  });

  it("drops manual mappings whose column disappeared", () => {
    const manual = setFieldMapping(autoMap("source", ["Cost"]), {
      target: "totalCost",
      sourceColumn: "Cost",
    });
    const after = rebaseMapping(manual, "source", ["Spend"]);
    expect(fieldMapping(after, "totalCost")!.sourceColumn).toBeNull();
  });
});

describe("unmappedRequired", () => {
  it("lists required fields with no column or constant", () => {
    const entity = targetEntity("source")!;
    const mapping = autoMap("source", ["Source Name"]);
    // name maps, id (required PK) does not
    expect(unmappedRequired(entity, mapping)).toContain("id");
    expect(unmappedRequired(entity, mapping)).not.toContain("name");
  });

  it("treats an empty constant as unmapped", () => {
    const entity = targetEntity("source")!;
    let mapping = setFieldMapping(autoMap("source", []), {
      target: "id",
      sourceColumn: null,
      constant: "",
    });
    expect(unmappedRequired(entity, mapping)).toContain("id");
    mapping = setFieldMapping(mapping, { target: "id", sourceColumn: null, constant: "1" });
    expect(unmappedRequired(entity, mapping)).not.toContain("id");
  });
});

describe("transformRows", () => {
  const rows = [
    { sid: "1", sname: "Webinar", stype: "Paid", cost: "1200" },
    { sid: "2", sname: "Referral", stype: "Organic", cost: "0" },
  ];
  const base: EntityMapping = {
    entity: "source",
    fields: [
      { target: "id", sourceColumn: "sid" },
      { target: "name", sourceColumn: "sname" },
      { target: "type", sourceColumn: "stype" },
      { target: "totalCost", sourceColumn: "cost" },
    ],
  };

  it("coerces numbers and passes strings through", () => {
    const { records, errors } = transformRows(base, rows);
    expect(errors).toEqual([]);
    expect(records[0]).toEqual({ id: 1, name: "Webinar", type: "Paid", totalCost: 1200 });
    expect(records[1].totalCost).toBe(0);
  });

  it("parses formatted numbers in non-key fields", () => {
    const { records, errors } = transformRows(base, [
      { sid: "1", sname: "Webinar", stype: "Paid", cost: "$1,200.50" },
    ]);
    expect(errors).toEqual([]);
    expect(records[0].totalCost).toBe(1200.5);
  });

  it("flags non-numeric non-key values with a 1-based row number", () => {
    const { errors } = transformRows(base, [
      { sid: "1", sname: "A", stype: "", cost: "lots" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 1, field: "totalCost" });
  });

  it("interns non-numeric ids instead of erroring", () => {
    const { records, errors } = transformRows(base, [
      { sid: "SRC-A", sname: "Webinar", stype: "", cost: "" },
      { sid: "SRC-B", sname: "Referral", stype: "", cost: "" },
      { sid: "SRC-A", sname: "Webinar dup", stype: "", cost: "" },
    ]);
    expect(errors).toEqual([]);
    expect(records.map((record) => record.id)).toEqual([1, 2]);
  });

  it("assigns interned ids around natively numeric ones", () => {
    const { records } = transformRows(base, [
      { sid: "1", sname: "A", stype: "", cost: "" },
      { sid: "SRC-X", sname: "B", stype: "", cost: "" },
      { sid: "2", sname: "C", stype: "", cost: "" },
    ]);
    expect(records.map((record) => record.id)).toEqual([1, 3, 2]);
  });

  it("normalizes dates to ISO and honors the day-first hint", () => {
    const mapping: EntityMapping = {
      entity: "campaign",
      fields: [
        { target: "id", sourceColumn: "cid" },
        { target: "name", sourceColumn: "cnm" },
        { target: "startDate", sourceColumn: "sd", dateFormat: "dmy" },
        { target: "endDate", sourceColumn: "ed" },
      ],
    };
    const { records, errors } = transformRows(mapping, [
      { cid: "1", cnm: "Launch", sd: "01/02/2026", ed: "3/15/2026" },
    ]);
    expect(errors).toEqual([]);
    expect(records[0].startDate).toBe("2026-02-01");
    expect(records[0].endDate).toBe("2026-03-15");
  });

  it("applies a value map and validates enums", () => {
    const mapping: EntityMapping = {
      entity: "opportunity",
      fields: [
        { target: "id", sourceColumn: "oid" },
        { target: "leadId", sourceColumn: "lid" },
        { target: "buLvl2Id", sourceColumn: "bu" },
        { target: "name", sourceColumn: "nm" },
        { target: "stage", sourceColumn: "stg" },
        { target: "creationDate", sourceColumn: "cd" },
        {
          target: "oemOrAfter",
          sourceColumn: "seg",
          valueMap: { OEM: "OEM", AM: "Aftermarket" },
        },
      ],
    };
    const result = transformRows(mapping, [
      { oid: "1", lid: "5", bu: "3", nm: "Deal", stg: "Quoting", cd: "2026-01-15", seg: "AM" },
      { oid: "2", lid: "6", bu: "3", nm: "Deal2", stg: "Quoting", cd: "2026-02-15", seg: "??" },
    ]);
    expect(result.records[0].oemOrAfter).toBe("Aftermarket");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 2, field: "oemOrAfter" });
  });

  it("a valueMap entry targeting empty string blanks the value", () => {
    const mapping = setFieldMapping(base, {
      target: "type",
      sourceColumn: "stype",
      valueMap: { Paid: "" },
    });
    const { records } = transformRows(mapping, rows);
    expect(records[0].type).toBeUndefined();
    expect(records[1].type).toBe("Organic");
  });

  it("supports constant values", () => {
    const mapping = setFieldMapping(base, {
      target: "type",
      sourceColumn: null,
      constant: "Paid",
    });
    const { records } = transformRows(mapping, rows);
    expect(records.every((record) => record.type === "Paid")).toBe(true);
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const dupRows = [
      { sid: "1", sname: "Webinar", stype: "Paid", cost: "1200" },
      { sid: "1", sname: "Webinar (again)", stype: "Paid", cost: "1200" },
    ];
    const { records } = transformRows(base, dupRows);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Webinar");
  });

  it("reports a cell problem once per entity instance, not per repeated row", () => {
    const dupRows = [
      { sid: "1", sname: "Webinar", stype: "Paid", cost: "lots" },
      { sid: "1", sname: "Webinar", stype: "Paid", cost: "lots" },
      { sid: "1", sname: "Webinar", stype: "Paid", cost: "lots" },
    ];
    const { records, errors } = transformRows(base, dupRows);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it("skips rows where the entity's key is absent (not an error)", () => {
    const partial: EntityMapping = {
      entity: "source",
      fields: [
        { target: "id", sourceColumn: "sid" },
        { target: "name", sourceColumn: "sname" },
      ],
    };
    const result = transformRows(partial, [
      { sid: "", sname: "no key here" },
      { sid: "7", sname: "Trade Show" },
    ]);
    expect(result.records).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it("dedupes AOP by its composite FK key", () => {
    const mapping: EntityMapping = {
      entity: "aop",
      fields: [
        { target: "buLvl2Id", sourceColumn: "bu" },
        { target: "date", sourceColumn: "d" },
        { target: "targetValue", sourceColumn: "v" },
      ],
    };
    const { records } = transformRows(mapping, [
      { bu: "5", d: "2026-01-01", v: "100" },
      { bu: "5", d: "2026-01-01", v: "999" },
      { bu: "5", d: "2026-02-01", v: "200" },
    ]);
    expect(records).toHaveLength(2);
    expect(records[0].targetValue).toBe(100);
  });
});

describe("shredModel (wide denormalized file)", () => {
  // One Salesforce-style row per opportunity; lead + BU attributes repeat.
  const rows = [
    { OppId: "100", LeadId: "1", LeadName: "Acme inquiry", BUId: "5", BUName: "Wyma", BUDiv: "Equipment", OppName: "Acme line", Stage: "Quoting", Created: "2026-01-10" },
    { OppId: "101", LeadId: "1", LeadName: "Acme inquiry", BUId: "5", BUName: "Wyma", BUDiv: "Equipment", OppName: "Acme spares", Stage: "Quoting", Created: "2026-02-10" },
    { OppId: "102", LeadId: "2", LeadName: "Globex inquiry", BUId: "6", BUName: "Betcher", BUDiv: "Equipment", OppName: "Globex line", Stage: "Quoting", Created: "2026-03-10" },
  ];
  const mappings: EntityMapping[] = [
    {
      entity: "lead",
      fields: [
        { target: "id", sourceColumn: "LeadId" },
        { target: "name", sourceColumn: "LeadName" },
        { target: "buLvl2Id", sourceColumn: "BUId" },
        { target: "sourceId", sourceColumn: null, constant: "1" },
        { target: "creationDate", sourceColumn: "Created" },
        { target: "customerName", sourceColumn: "LeadName" },
      ],
    },
    {
      entity: "opportunity",
      fields: [
        { target: "id", sourceColumn: "OppId" },
        { target: "leadId", sourceColumn: "LeadId" },
        { target: "buLvl2Id", sourceColumn: "BUId" },
        { target: "name", sourceColumn: "OppName" },
        { target: "stage", sourceColumn: "Stage" },
        { target: "creationDate", sourceColumn: "Created" },
      ],
    },
    {
      entity: "bu",
      fields: [
        { target: "lvl2Id", sourceColumn: "BUId" },
        { target: "lvl2Name", sourceColumn: "BUName" },
        { target: "lvl1Name", sourceColumn: "BUDiv" },
      ],
    },
  ];
  const inputs: ShredInput[] = mappings.map((mapping) => ({ mapping, rows }));

  it("shreds one wide file into deduplicated tables", () => {
    const { counts, model, errors } = shredModel(inputs);
    expect(errors).toEqual([]);
    expect(counts.opportunity).toBe(3); // one per row
    expect(counts.lead).toBe(2); // lead 1 appears twice -> collapsed
    expect(counts.bu).toBe(2); // two distinct BUs
    expect(model.bu).toContainEqual({ lvl2Id: 5, lvl2Name: "Wyma", lvl1Name: "Equipment" });
  });

  it("leaves unmapped entities empty without erroring", () => {
    const { counts, errors } = shredModel(inputs);
    expect(counts.source ?? 0).toBe(0);
    expect(counts.geography ?? 0).toBe(0);
    expect(errors).toEqual([]);
  });

  it("derives the Date dimension from mapped date values", () => {
    const { counts, model, derived } = shredModel(inputs);
    expect(derived).toContain("date");
    expect(counts.date).toBe(3);
    expect(model.date[0]).toEqual({
      date: "2026-01-10",
      year: 2026,
      quarter: "Q1",
      month: 1,
      monthName: "January",
      day: 10,
    });
  });

  it("interns alphanumeric ids consistently across entities", () => {
    const sfRows = [
      { OppId: "006-X", LeadId: "00Q-A", OppName: "A line", Stage: "Quoting" },
      { OppId: "006-Y", LeadId: "00Q-B", OppName: "B line", Stage: "Quoting" },
      { OppId: "006-Z", LeadId: "00Q-A", OppName: "A spares", Stage: "Quoting" },
    ];
    const sfInputs: ShredInput[] = [
      {
        mapping: {
          entity: "lead",
          fields: [
            { target: "id", sourceColumn: "LeadId" },
            { target: "name", sourceColumn: "LeadId" },
          ],
        },
        rows: sfRows,
      },
      {
        mapping: {
          entity: "opportunity",
          fields: [
            { target: "id", sourceColumn: "OppId" },
            { target: "leadId", sourceColumn: "LeadId" },
            { target: "name", sourceColumn: "OppName" },
            { target: "stage", sourceColumn: "Stage" },
          ],
        },
        rows: sfRows,
      },
    ];
    const { model, errors, keyAssignments, integrity } = shredModel(sfInputs);
    expect(errors).toEqual([]);
    const leadIds = model.lead.map((record) => record.id);
    expect(leadIds).toEqual([1, 2]);
    // opportunity.leadId resolves through the same "lead" domain
    expect(model.opportunity.map((record) => record.leadId)).toEqual([1, 2, 1]);
    expect(keyAssignments.lead).toHaveLength(2);
    expect(keyAssignments.opportunity).toHaveLength(3);
    expect(integrity).toEqual([]);
  });

  it("reports orphaned foreign keys", () => {
    const orphanInputs: ShredInput[] = [
      {
        mapping: {
          entity: "lead",
          fields: [{ target: "id", sourceColumn: "LeadId" }],
        },
        rows: [{ LeadId: "1" }],
      },
      {
        mapping: {
          entity: "opportunity",
          fields: [
            { target: "id", sourceColumn: "OppId" },
            { target: "leadId", sourceColumn: "Ref" },
          ],
        },
        rows: [
          { OppId: "10", Ref: "1" },
          { OppId: "11", Ref: "9" },
        ],
      },
    ];
    const { integrity } = shredModel(orphanInputs);
    expect(integrity).toContainEqual({
      entity: "opportunity",
      field: "leadId",
      references: "lead",
      missing: 1,
      samples: ["9"],
    });
  });
});
