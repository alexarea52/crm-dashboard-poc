import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { rowsFromMatrix } from "./csv";
import { isSpreadsheet, parseWorkbook } from "./parse-file";

/** Build an .xlsx buffer from one or more named sheets (matrix of cells). */
function workbookBuffer(sheets: Record<string, string[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, matrix] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), name);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("isSpreadsheet", () => {
  it("matches .xlsx/.xls, not .csv", () => {
    expect(isSpreadsheet("export.xlsx")).toBe(true);
    expect(isSpreadsheet("EXPORT.XLS")).toBe(true);
    expect(isSpreadsheet("export.csv")).toBe(false);
  });
});

describe("rowsFromMatrix", () => {
  it("de-duplicates repeated headers", () => {
    const { headers, rows } = rowsFromMatrix([
      ["Name", "Country", "Name"],
      ["Acme", "USA", "Globex"],
    ]);
    expect(headers).toEqual(["Name", "Country", "Name (2)"]);
    expect(rows[0]).toEqual({ Name: "Acme", Country: "USA", "Name (2)": "Globex" });
  });
});

describe("parseWorkbook", () => {
  it("reads a single sheet, keeping the file name", async () => {
    const buf = workbookBuffer({ Leads: [["Lead ID", "Name"], ["1", "Acme"], ["2", "Globex"]] });
    const sheets = await parseWorkbook(buf, "export.xlsx");
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe("export.xlsx");
    expect(sheets[0].csv.headers).toEqual(["Lead ID", "Name"]);
    expect(sheets[0].csv.rows).toEqual([
      { "Lead ID": "1", Name: "Acme" },
      { "Lead ID": "2", Name: "Globex" },
    ]);
  });

  it("expands a multi-tab workbook into one source per sheet", async () => {
    const buf = workbookBuffer({
      Leads: [["Lead ID"], ["1"]],
      Opportunities: [["Opp ID"], ["100"]],
    });
    const sheets = await parseWorkbook(buf, "crm.xlsx");
    expect(sheets.map((sheet) => sheet.name)).toEqual(["crm.xlsx — Leads", "crm.xlsx — Opportunities"]);
  });

  it("skips empty sheets", async () => {
    const buf = workbookBuffer({ Leads: [["Lead ID"], ["1"]], Blank: [] });
    const sheets = await parseWorkbook(buf, "crm.xlsx");
    expect(sheets.map((sheet) => sheet.name)).toEqual(["crm.xlsx"]);
  });
});
