// The ask pipeline: question → generator → guard → scoped execution → answer.
// Server-only. The generator is swappable (see generator.ts); everything after
// it treats the SQL as untrusted regardless of who produced it.

import { getSqlDb } from "./db";
import type { SqlGenerator } from "./generator";
import { validateAndCap } from "./guard";
import { describeSchemaFor } from "./schema";
import { StubSqlGenerator } from "./stub-generator";
import type { AskResult } from "./types";
import { EXPOSED_VIEWS, withSessionViews } from "./views";
import type { Session } from "../access/auth";

// Swap point: replace with an AnthropicSqlGenerator (or select via env) once
// an API key is available. Nothing else in the pipeline changes.
const defaultGenerator: SqlGenerator = new StubSqlGenerator();

function genericSummary(columns: string[], rows: unknown[][]): string {
  if (rows.length === 0) return "No matching rows in your scope.";
  const plural = rows.length === 1 ? "row" : "rows";
  return `${rows.length} ${plural} · columns: ${columns.join(", ")}.`;
}

/** Run one plain-English question through generate → guard → scoped query. */
export async function askSql(
  question: string,
  session: Session,
  generator: SqlGenerator = defaultGenerator,
): Promise<AskResult> {
  const schemaDescription = describeSchemaFor(session);
  const generated = await generator.generate({ question, schemaDescription });

  if (generated.kind === "unsupported") {
    return { kind: "unsupported", answer: generated.message };
  }

  const guard = validateAndCap(generated.sql, EXPOSED_VIEWS);
  if (!guard.ok) {
    return { kind: "guard_rejected", reason: guard.reason, sql: generated.sql };
  }

  try {
    const db = getSqlDb();
    // The callback is synchronous by contract (see withSessionViews).
    const { columns, objects } = withSessionViews(db, session, () => {
      const stmt = db.prepare(guard.cappedSql);
      if (!stmt.reader) {
        throw new Error("Statement does not return rows.");
      }
      const objects = stmt.all() as Record<string, unknown>[];
      const columns = stmt.columns().map((c) => c.name);
      return { columns, objects };
    });

    const rows = objects.map((o) => columns.map((c) => o[c]));
    const answer =
      generated.summarize?.(columns, objects) ?? genericSummary(columns, rows);

    return {
      kind: "ok",
      answer,
      sql: generated.sql, // display the generated SQL, not the LIMIT wrapper
      columns,
      rows,
      generator: generator.name,
    };
  } catch (err) {
    return {
      kind: "execution_error",
      message: err instanceof Error ? err.message : "Query failed.",
      sql: generated.sql,
    };
  }
}
