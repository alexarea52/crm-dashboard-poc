// SQL guard: validates generated SQL before execution. This is layer 3 of the
// defense-in-depth stack (see views.ts for layers 1–2) — never assume the
// generator (stub or LLM) is well-behaved.
//
// Rules:
//   1. No comments; at most one statement (no interior `;`).
//   2. Must start with SELECT or WITH.
//   3. Token denylist (DDL/DML, pragma/attach, sqlite internals, …).
//   4. FROM/JOIN identifier allowlist — only the exposed views (plus names the
//      query itself defines via WITH … AS).
//   5. Row cap: the statement is wrapped in `SELECT * FROM (…) LIMIT N`.

/** Hard cap on returned rows; applied by wrapping the statement. */
export const ROW_LIMIT = 200;

/** Outcome of validation: the wrapped, capped SQL — or a rejection reason. */
export type GuardResult =
  | { ok: true; cappedSql: string }
  | { ok: false; reason: string };

const DENYLIST = new Set([
  "pragma", "attach", "detach", "insert", "update", "delete", "drop",
  "create", "alter", "replace", "vacuum", "reindex", "analyze", "begin",
  "commit", "rollback", "savepoint", "trigger", "load_extension", "readfile",
  "writefile", "fts5", "dbstat", "sqlite_master", "sqlite_temp_master",
  "sqlite_schema", "sqlite_temp_schema", "randomblob", "zeroblob",
]);

/** Replace string literals with empty ones so their contents can't trip (or
 * hide from) keyword checks. Handles '' escapes. */
function stripStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

/** Validate untrusted SQL against the rules above and apply the row cap. */
export function validateAndCap(
  sql: string,
  allowedTables: ReadonlySet<string>,
): GuardResult {
  const trimmed = sql.trim().replace(/;\s*$/, ""); // one trailing ; is fine

  if (trimmed.length === 0) return { ok: false, reason: "Empty statement." };

  if (/--|\/\*/.test(trimmed)) {
    return { ok: false, reason: "Comments are not allowed." };
  }

  const stripped = stripStrings(trimmed);

  if (stripped.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed." };
  }

  if (!/^\s*(select|with)\b/i.test(stripped)) {
    return { ok: false, reason: "Only SELECT statements are allowed." };
  }

  // Tokenize the literal-stripped SQL for keyword checks.
  const tokens = stripped.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
  for (const token of tokens) {
    if (DENYLIST.has(token)) {
      return { ok: false, reason: `Disallowed keyword: ${token.toUpperCase()}.` };
    }
  }

  // Names defined by the query itself (WITH cte AS (...)) are allowed targets.
  const cteNames = new Set(
    [...stripped.matchAll(/\b(?:with|,)\s+([a-z_][a-z0-9_]*)\s+as\s*\(/gi)].map(
      (m) => m[1].toLowerCase(),
    ),
  );

  // Every FROM/JOIN target (including comma-separated lists) must be a known
  // view or a CTE. Dotted/schema-qualified names never match the pattern's
  // simple-identifier requirement and are caught by the explicit dot check.
  if (/\b(?:from|join)\s+[a-z_][a-z0-9_]*\s*\./i.test(stripped)) {
    return { ok: false, reason: "Schema-qualified table names are not allowed." };
  }

  const targetRe = /\b(?:from|join)\s+([a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*)/gi;
  for (const match of stripped.matchAll(targetRe)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().toLowerCase();
      if (name.length === 0) continue;
      // `FROM (subquery)` produces no identifier and never reaches here.
      if (!allowedTables.has(name) && !cteNames.has(name)) {
        return { ok: false, reason: `Unknown table: ${name}.` };
      }
    }
  }

  // Belt & braces: no raw_* base-table mention anywhere.
  if (tokens.some((t) => t.startsWith("raw_"))) {
    return { ok: false, reason: "Base tables are not accessible." };
  }

  return {
    ok: true,
    // SQLite preserves the inner ORDER BY of the wrapped subquery.
    cappedSql: `SELECT * FROM (\n${trimmed}\n) LIMIT ${ROW_LIMIT}`,
  };
}
