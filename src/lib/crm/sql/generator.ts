// The text-to-SQL generator contract. The pipeline depends only on this
// interface; today's implementation is the deterministic stub
// (stub-generator.ts), and the production one will be an Anthropic-API
// implementation (anthropic-generator.ts) — a drop-in new file.

/** Input to a generator: the question + the session's visible schema. */
export interface SqlGenerationRequest {
  question: string;
  /**
   * Markdown description of the views/columns THIS session can query
   * (from schema.describeSchemaFor) — gated columns are absent, so a correct
   * generator never references them.
   */
  schemaDescription: string;
}

/** Generator output: SQL to run (plus optional summarizer) or a refusal. */
export type SqlGenerationResult =
  | {
      kind: "sql";
      sql: string;
      /**
       * Optional question-specific phrasing of the result. The pipeline falls
       * back to a generic summary when absent (the LLM impl won't provide one).
       */
      summarize?: (columns: string[], rows: Record<string, unknown>[]) => string;
    }
  | { kind: "unsupported"; message: string };

/** The swappable text-to-SQL engine contract (stub today, LLM later). */
export interface SqlGenerator {
  /** Identifier echoed in API responses for debugging ("stub" | "anthropic"). */
  readonly name: string;
  generate(req: SqlGenerationRequest): Promise<SqlGenerationResult>;
}
