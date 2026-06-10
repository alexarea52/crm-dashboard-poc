// Wire types for the text-to-SQL API — type-only (plus a constant array of
// example questions), safe to import from client components.

/** Discriminated response union of POST /api/ask. */
export type AskResult =
  | {
      kind: "ok";
      answer: string;
      sql: string;
      columns: string[];
      rows: unknown[][];
      /** Which SqlGenerator produced the SQL ("stub" | "anthropic"). */
      generator: string;
    }
  | { kind: "unsupported"; answer: string }
  | { kind: "guard_rejected"; reason: string; sql: string }
  | { kind: "execution_error"; message: string; sql: string };

/** Request body of POST /api/ask. */
export interface AskRequest {
  question: string;
  persona: "single" | "multi" | "admin";
}

/** Example chips for SQL mode — each is guaranteed to hit a stub pattern. */
export const sqlExampleQuestions = [
  "What's our largest open deal?",
  "What was the win rate in 2025?",
  "Bookings by year",
  "Which channel brings the most leads?",
  "Leads by campaign in 2025",
];
