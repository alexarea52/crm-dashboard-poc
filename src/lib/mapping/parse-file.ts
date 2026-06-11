// =============================================================================
// File parsing — CSV and XLSX -> ParsedCsv
// =============================================================================
// One uploaded file can yield several "source sheets": a CSV is always one;
// an .xlsx workbook is one per non-empty sheet (a workbook with a tab per
// object — Leads / Opportunities / Accounts — slots straight into the
// per-entity file picker). XLSX is binary, so it can't go through the text
// CSV path; SheetJS (`xlsx`) is loaded lazily so it only ships to clients that
// actually open a workbook.

import { parseCsv, rowsFromMatrix, type ParsedCsv } from "./csv";

/** A named tabular source extracted from an upload (a CSV, or one XLSX sheet). */
export interface NamedSheet {
  name: string;
  csv: ParsedCsv;
}

/** True for filenames the XLSX reader should handle (.xlsx / .xls). */
export function isSpreadsheet(fileName: string): boolean {
  return /\.xlsx?$/i.test(fileName);
}

/** Parse an .xlsx/.xls workbook buffer into one NamedSheet per non-empty sheet. */
export async function parseWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<NamedSheet[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const populated: { sheetName: string; csv: ParsedCsv }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    // header:1 -> array-of-arrays; raw:false formats dates/numbers as the
    // strings the user sees in Excel; defval keeps blank cells aligned.
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    const csv = rowsFromMatrix(matrix.map((row) => row.map((cell) => String(cell ?? ""))));
    if (csv.headers.length === 0) continue; // empty sheet
    populated.push({ sheetName, csv });
  }

  // Only qualify sheet names when more than one tab actually has data.
  const multiSheet = populated.length > 1;
  return populated.map(({ sheetName, csv }) => ({
    name: multiSheet ? `${fileName} — ${sheetName}` : fileName,
    csv,
  }));
}

/**
 * Parse one uploaded file into its source sheets. CSV/TSV-ish text files yield
 * a single sheet; spreadsheets yield one per tab.
 */
export async function parseUpload(file: File): Promise<NamedSheet[]> {
  if (isSpreadsheet(file.name)) {
    return parseWorkbook(await file.arrayBuffer(), file.name);
  }
  return [{ name: file.name, csv: parseCsv(await file.text()) }];
}
