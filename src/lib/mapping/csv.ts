// =============================================================================
// CSV parsing — dependency-free, RFC-4180-ish
// =============================================================================
// Handles quoted fields, escaped quotes (""), embedded commas/newlines, and
// CRLF. Values are trimmed; fully-blank lines are dropped. Good enough for the
// hand-exported CRM files this tool ingests; not a streaming parser.
//
// `rowsFromMatrix` is the shared "rows-of-cells -> ParsedCsv" step, reused by
// the XLSX reader (see parse-file.ts) so both formats get identical header
// de-duplication and row keying.

/** Parsed CSV: the header row plus data rows keyed by header. */
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Split raw CSV text into rows of string cells. */
function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  // Flush the trailing field/row (file may not end in a newline).
  if (field !== "" || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}

/**
 * Disambiguate duplicate header names ("Name", "Name (2)", …). Wide CRM joins
 * routinely repeat column names across entities; keying rows by header would
 * otherwise silently keep only the last duplicate.
 */
function uniqueHeaders(raw: string[]): string[] {
  const counts = new Map<string, number>();
  return raw.map((header) => {
    const trimmed = header.trim();
    const count = (counts.get(trimmed) ?? 0) + 1;
    counts.set(trimmed, count);
    return count === 1 ? trimmed : `${trimmed} (${count})`;
  });
}

/**
 * Build a ParsedCsv from a matrix of string cells (first row = headers).
 * Shared by `parseCsv` and the XLSX reader so both formats de-duplicate
 * headers and key rows the same way.
 */
export function rowsFromMatrix(records: string[][]): ParsedCsv {
  if (records.length === 0) return { headers: [], rows: [] };

  const headers = uniqueHeaders(records[0]);
  const rows = records
    .slice(1)
    .filter((record) => record.some((cell) => cell.trim() !== ""))
    .map((record) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = (record[index] ?? "").trim();
      });
      return obj;
    });

  return { headers, rows };
}

/** Parse CSV text into headers + objects keyed by header. */
export function parseCsv(text: string): ParsedCsv {
  return rowsFromMatrix(parseRecords(text));
}

/** Distinct non-empty values in one column (for value-mapping UIs). */
export function distinctValues(
  rows: Record<string, string>[],
  column: string,
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[column];
    if (value !== undefined && value !== "") seen.add(value);
  }
  return [...seen].sort((left, right) => left.localeCompare(right));
}
