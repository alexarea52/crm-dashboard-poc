// Deterministic SqlGenerator: an ordered pattern table mapping question shapes
// to SQL templates over the exposed views. This stands in for the LLM so the
// pipeline, guard, scoping, and UI are all real and testable today; swapping
// in the Anthropic implementation later changes nothing downstream.

import type {
  SqlGenerationRequest,
  SqlGenerationResult,
  SqlGenerator,
} from "./generator";

interface PatternContext {
  /** Year mentioned in the question, or null for "all years". */
  year: number | null;
}

interface StubPattern {
  match: RegExp;
  sql: (ctx: PatternContext) => string;
  summarize?: (columns: string[], rows: Record<string, unknown>[]) => string;
  /** Requires gated columns; refused when the schema doesn't expose them. */
  requiresFinancials?: boolean;
}

const OPEN_STAGES = "stage NOT IN ('Closed Won', 'Closed Lost')";

const usd = (n: unknown) =>
  typeof n === "number" ? `$${Math.round(n).toLocaleString("en-US")}` : String(n);

/** WHERE/AND year clause; empty string when the question spans all years. */
const yearEq = (ctx: PatternContext, prefix: "WHERE" | "AND") =>
  ctx.year === null ? "" : ` ${prefix} year = ${ctx.year}`;

// Ordered: first match wins — most specific phrasings first.
const PATTERNS: StubPattern[] = [
  {
    match: /largest|biggest|top.*(deal|opp)|deal.*largest/,
    sql: (ctx) => `
      SELECT name, account_name, business_unit_id, stage, year, quoted_value
      FROM opportunities
      WHERE ${OPEN_STAGES}${yearEq(ctx, "AND")}
      ORDER BY quoted_value DESC
      LIMIT 5`,
    summarize: (_, rows) =>
      rows.length
        ? `Largest open deal: "${rows[0].name}" with ${rows[0].account_name} — ${usd(rows[0].quoted_value)} (${rows[0].stage}, ${rows[0].year}).`
        : "No open deals in your scope.",
  },
  {
    match: /win rate|close rate/,
    sql: (ctx) => `
      SELECT year,
             ROUND(SUM(stage = 'Closed Won') * 100.0 / COUNT(*), 1) AS win_rate_pct,
             COUNT(*) AS decided_deals
      FROM opportunities
      WHERE stage IN ('Closed Won', 'Closed Lost')${yearEq(ctx, "AND")}
      GROUP BY year
      ORDER BY year`,
    summarize: (_, rows) =>
      rows.length
        ? rows
            .map((r) => `${r.year}: ${r.win_rate_pct}% of ${r.decided_deals} decided deals`)
            .join(" · ")
        : "No decided deals in your scope.",
  },
  {
    match: /open (pipeline|quote)|pipeline|outstanding/,
    sql: (ctx) => `
      SELECT year, COUNT(*) AS open_deals, SUM(quoted_value) AS open_quoted_value
      FROM opportunities
      WHERE ${OPEN_STAGES}${yearEq(ctx, "AND")}
      GROUP BY year
      ORDER BY year`,
    summarize: (_, rows) =>
      rows.length
        ? rows
            .map((r) => `${r.year}: ${usd(r.open_quoted_value)} across ${r.open_deals} open deals`)
            .join(" · ")
        : "No open pipeline in your scope.",
  },
  {
    match: /booked|bookings|revenue|won value/,
    sql: (ctx) => `
      SELECT year, SUM(booked_value) AS booked_value
      FROM leads
      ${ctx.year === null ? "" : `WHERE year = ${ctx.year}`}
      GROUP BY year
      ORDER BY year`,
    summarize: (_, rows) =>
      rows.length
        ? rows.map((r) => `${r.year}: ${usd(r.booked_value)} booked`).join(" · ")
        : "No bookings in your scope.",
  },
  {
    match: /campaign/,
    sql: (ctx) => `
      SELECT campaign, COUNT(*) AS leads, SUM(booked_value) AS booked_value
      FROM leads
      ${ctx.year === null ? "" : `WHERE year = ${ctx.year}`}
      GROUP BY campaign
      ORDER BY leads DESC`,
  },
  {
    match: /cost|cac|spend|margin/,
    requiresFinancials: true,
    sql: (ctx) => `
      SELECT c.channel, c.cost,
             COUNT(*) AS leads,
             ROUND(c.cost / NULLIF(SUM(l.stage IN ('mql', 'sql', 'opp')), 0), 0) AS cost_per_mql
      FROM channels c
      JOIN leads l ON l.channel = c.channel${yearEq(ctx, "AND").replace("year", "l.year")}
      GROUP BY c.channel, c.cost
      ORDER BY c.cost DESC`,
  },
  {
    match: /source|channel/,
    sql: (ctx) => `
      SELECT channel, COUNT(*) AS leads, SUM(booked_value) AS booked_value
      FROM leads
      ${ctx.year === null ? "" : `WHERE year = ${ctx.year}`}
      GROUP BY channel
      ORDER BY leads DESC`,
    summarize: (_, rows) =>
      rows.length
        ? `${rows[0].channel} leads with ${rows[0].leads} leads (${usd(rows[0].booked_value)} booked).`
        : "No leads in your scope.",
  },
  {
    match: /mql|sql\b|funnel|conversion|stage/,
    sql: (ctx) => `
      SELECT stage, COUNT(*) AS leads
      FROM leads
      ${ctx.year === null ? "" : `WHERE year = ${ctx.year}`}
      GROUP BY stage
      ORDER BY CASE stage WHEN 'lead' THEN 0 WHEN 'mql' THEN 1 WHEN 'sql' THEN 2 ELSE 3 END`,
  },
];

const UNSUPPORTED_MESSAGE =
  "I couldn't map that question to a query yet (stub generator). Try asking about deals, pipeline, win rate, bookings, channels, campaigns, or funnel stages.";

/** Deterministic pattern-table generator standing in for the LLM. */
export class StubSqlGenerator implements SqlGenerator {
  readonly name = "stub";

  async generate(req: SqlGenerationRequest): Promise<SqlGenerationResult> {
    const q = req.question.toLowerCase();
    const yearMatch = q.match(/\b(2024|2025|2026)\b/);
    const ctx: PatternContext = { year: yearMatch ? Number(yearMatch[1]) : null };

    for (const pattern of PATTERNS) {
      if (!pattern.match.test(q)) continue;
      if (pattern.requiresFinancials && !req.schemaDescription.includes("cost")) {
        return {
          kind: "unsupported",
          message:
            "Cost and margin figures are restricted to administrators — your role can't query them.",
        };
      }
      return {
        kind: "sql",
        sql: pattern.sql(ctx).trim(),
        summarize: pattern.summarize,
      };
    }
    return { kind: "unsupported", message: UNSUPPORTED_MESSAGE };
  }
}
