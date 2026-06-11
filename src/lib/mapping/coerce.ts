// =============================================================================
// Value coercion — raw CSV strings -> typed semantic-model values
// =============================================================================
// Tolerant of the formatting real CRM exports actually contain:
//   numbers — currency symbols, US-style thousands separators, "%" suffixes,
//             parenthesized negatives ("(1,200)") — note: EU-style decimal
//             commas ("1.200,50") are NOT handled;
//   dates   — always normalized to ISO YYYY-MM-DD so DateId joins compare
//             equal; slashy dates take a month-first/day-first hint because
//             "01/02/2026" is ambiguous and Date.parse is US-biased;
//   ids     — number-typed PK/FK fields go through a KeyInterner, so
//             alphanumeric Salesforce/HubSpot ids become stable small ints
//             instead of NaN-ing every row.

import { type TargetField } from "./target-schema";

/** Day/month order for ambiguous slashy dates ("01/02/2026"). */
export type DateOrder = "mdy" | "dmy";

/** Per-call options for {@link coerce}. */
export interface CoerceContext {
  /** Disambiguates 01/02/2026-style dates. Default: month-first (US). */
  dateOrder?: DateOrder;
  /** Resolver for number-typed key fields (PKs/FKs); interns non-numeric ids. */
  internKey?: (raw: string) => number;
}

/** Outcome of coercing one raw value. */
export interface Coerced {
  ok: boolean;
  /** Present when ok; `undefined` means "omit this field". */
  value?: unknown;
  message?: string;
}

const TRUTHY = new Set(["true", "t", "yes", "y", "1"]);
const FALSY = new Set(["false", "f", "no", "n", "0"]);

/**
 * Parse a number out of common export formatting: "$1,200.50" -> 1200.5,
 * "(300)" -> -300, "12.5%" -> 12.5. Returns NaN when nothing numeric remains.
 */
export function parseNumber(raw: string): number {
  let text = raw.trim();
  let negative = false;
  const parens = /^\((.*)\)$/.exec(text);
  if (parens) {
    negative = true;
    text = parens[1];
  }
  text = text.replace(/[$€£\s]/g, "").replace(/,/g, "");
  if (text.endsWith("%")) text = text.slice(0, -1);
  if (text === "") return NaN;
  const parsed = Number(text);
  return negative ? -parsed : parsed;
}

/** English month names, indexed by month-1 (shared with Date-dim derivation). */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Normalize a date string to ISO YYYY-MM-DD, or null if unrecognizable.
 * Handles ISO date/datetime, slashy/dotted dates (with `order` resolving the
 * ambiguous both-parts-≤-12 case; an unambiguous part wins over the hint), and
 * falls back to Date.parse for month-name formats.
 */
export function normalizeDate(raw: string, order: DateOrder = "mdy"): string | null {
  const text = raw.trim();

  // ISO date or datetime — keep the date part.
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})([T ].*)?$/.exec(text);
  if (match) return buildIso(+match[1], +match[2], +match[3]);

  // Slashy/dotted/dashed: 1/15/2026, 15.01.2026, 01-02-26 …
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})([T ].*)?$/.exec(text);
  if (match) {
    const first = +match[1];
    const second = +match[2];
    let year = +match[3];
    if (match[3].length <= 2) year += year < 70 ? 2000 : 1900;
    const dayFirst = first > 12 ? true : second > 12 ? false : order === "dmy";
    const [month, day] = dayFirst ? [second, first] : [first, second];
    return buildIso(year, month, day);
  }

  // Fallback: whatever Date.parse understands (e.g. "January 15, 2026").
  // Such strings parse as local time, so read back local components.
  const parsedTime = Date.parse(text);
  if (Number.isNaN(parsedTime)) return null;
  const parsedDate = new Date(parsedTime);
  return buildIso(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
}

/** Coerce one raw string to a target field's type (valueMap already applied). */
export function coerce(field: TargetField, raw: string, ctx: CoerceContext = {}): Coerced {
  const value = raw.trim();

  if (value === "") {
    if (field.required) return { ok: false, message: "required value is empty" };
    return { ok: true, value: undefined };
  }

  switch (field.type) {
    case "number": {
      // Key fields intern: any id shape (e.g. "006Ax000001a2bC") resolves to a
      // stable number instead of failing coercion.
      if (ctx.internKey) return { ok: true, value: ctx.internKey(value) };
      const parsed = parseNumber(value);
      if (Number.isNaN(parsed)) return { ok: false, message: `"${value}" is not a number` };
      return { ok: true, value: parsed };
    }
    case "boolean": {
      const lower = value.toLowerCase();
      if (TRUTHY.has(lower)) return { ok: true, value: true };
      if (FALSY.has(lower)) return { ok: true, value: false };
      return { ok: false, message: `"${value}" is not a boolean (map it to true/false)` };
    }
    case "enum": {
      if (field.options?.includes(value)) return { ok: true, value };
      return {
        ok: false,
        message: `"${value}" is not one of: ${field.options?.join(", ")}`,
      };
    }
    case "date": {
      const iso = normalizeDate(value, ctx.dateOrder);
      if (iso === null) return { ok: false, message: `"${value}" is not a recognizable date` };
      return { ok: true, value: iso };
    }
    default:
      return { ok: true, value };
  }
}

// =============================================================================
// Key interning — source ids of any shape -> stable numeric keys
// =============================================================================
// Each key *domain* (the entity a PK/FK identifies, e.g. "lead" covers both
// lead.id and opportunity.leadId) keeps one raw -> number table, so the same
// source id resolves to the same number everywhere. Numeric source ids keep
// their value; non-numeric ids get sequential ints that skip every natively
// numeric id (reserve them all up front via `reserve` before resolving).

/** One non-identity id assignment (original source id ↔ assigned key). */
export interface KeyAssignment {
  key: number;
  source: string;
}

/** Shared raw-id -> numeric-key intern tables, one per key domain. */
export interface KeyInterner {
  /** Pre-register a raw id so sequential assignment never collides with it. */
  reserve(domain: string, raw: string): void;
  /** Resolve a raw id to its stable numeric key (assigning if new). */
  resolve(domain: string, raw: string): number;
  /** domain -> assignments made for non-numeric source ids. */
  assignments(): Record<string, KeyAssignment[]>;
}

const NUMERIC_ID = /^-?\d+$/;

function nativeNumeric(raw: string): number | null {
  if (!NUMERIC_ID.test(raw)) return null;
  const numeric = Number(raw);
  // 18-digit HubSpot-style ids overflow double precision — intern those too.
  return Number.isSafeInteger(numeric) ? numeric : null;
}

interface InternDomain {
  map: Map<string, number>;
  used: Set<number>;
  next: number;
  assigned: KeyAssignment[];
}

/** Create an empty {@link KeyInterner}. */
export function createKeyInterner(): KeyInterner {
  const domains = new Map<string, InternDomain>();

  function domainState(domain: string): InternDomain {
    let state = domains.get(domain);
    if (!state) {
      state = { map: new Map(), used: new Set(), next: 1, assigned: [] };
      domains.set(domain, state);
    }
    return state;
  }

  return {
    reserve(domain, raw) {
      const native = nativeNumeric(raw);
      if (native !== null) domainState(domain).used.add(native);
    },
    resolve(domain, raw) {
      const state = domainState(domain);
      const hit = state.map.get(raw);
      if (hit !== undefined) return hit;
      const native = nativeNumeric(raw);
      let key: number;
      if (native !== null) {
        key = native;
      } else {
        while (state.used.has(state.next)) state.next++;
        key = state.next++;
        state.assigned.push({ key, source: raw });
      }
      state.map.set(raw, key);
      state.used.add(key);
      return key;
    },
    assignments() {
      const out: Record<string, KeyAssignment[]> = {};
      for (const [domain, state] of domains) {
        if (state.assigned.length > 0) out[domain] = state.assigned;
      }
      return out;
    },
  };
}
