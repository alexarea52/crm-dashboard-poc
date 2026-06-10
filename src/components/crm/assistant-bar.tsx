"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { createAssistant, type CrmDatabase, type Session } from "@/lib/crm";
import type { AskResult } from "@/lib/crm/sql/types"; // type-only: no server code
import { sqlExampleQuestions } from "@/lib/crm/sql/types";

type Engine = "mock" | "sql";

/** One bubble in the chat thread. */
interface Message {
  role: "user" | "assistant";
  /** Main bubble text (question or answer). */
  text: string;
  /** Optional list items rendered under the text (mock-engine answers). */
  bullets?: string[];
  /** SQL-mode: the generated query, shown in a collapsible block. */
  sql?: string;
  /** SQL-mode: result column names (paired with `rows`). */
  columns?: string[];
  /** SQL-mode: result rows, row-major, same order as `columns`. */
  rows?: unknown[][];
  /** Render with error styling (guard rejection, execution/network failure). */
  isError?: boolean;
}

interface AssistantBarProps {
  /** Scoped database for MOCK mode — answers respect visible business units. */
  db: CrmDatabase;
  /** Drives the mock engine's financial gating. */
  session: Session;
  /** Demo persona key, sent to /api/ask so the server derives the session. */
  persona: "single" | "multi" | "admin";
}

/**
 * Plain-English ask bar with two engines:
 *  - "mock": the local keyword matcher (lib/crm/assistant.ts) — demo only.
 *  - "sql": the real text-to-SQL pipeline via POST /api/ask (stub generator
 *    for now; swaps to an LLM later). Note: SQL mode scopes to the session's
 *    full BU set server-side — the header BU dropdown is not consulted, since
 *    scope must be derived server-side from the (mock) auth session.
 */
export function AssistantBar({ db, session, persona }: AssistantBarProps) {
  const [engine, setEngine] = useState<Engine>("mock");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  const assistant = useMemo(() => createAssistant(db, session), [db, session]);

  function pushAssistant(message: Omit<Message, "role">) {
    setMessages((prev) => [...prev, { role: "assistant", ...message }]);
    setPending(false);
  }

  function askMock(q: string) {
    // Simulate model latency.
    window.setTimeout(() => {
      const a = assistant.answer(q);
      pushAssistant({ text: a.text, bullets: a.bullets });
    }, 450);
  }

  async function askSqlApi(q: string) {
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, persona }),
      });
      if (!res.ok) {
        pushAssistant({
          text: `The query service returned an error (HTTP ${res.status}).`,
          isError: true,
        });
        return;
      }
      const result = (await res.json()) as AskResult;
      switch (result.kind) {
        case "ok":
          pushAssistant({
            text: result.answer,
            sql: result.sql,
            columns: result.columns,
            rows: result.rows,
          });
          break;
        case "unsupported":
          pushAssistant({ text: result.answer });
          break;
        case "guard_rejected":
          pushAssistant({
            text: `That query was blocked by the SQL guard: ${result.reason}`,
            sql: result.sql,
            isError: true,
          });
          break;
        case "execution_error":
          pushAssistant({
            text: `The query failed: ${result.message}`,
            sql: result.sql,
            isError: true,
          });
          break;
      }
    } catch {
      pushAssistant({
        text: "Couldn't reach the query service. Is the dev server running?",
        isError: true,
      });
    }
  }

  function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setPending(true);
    if (engine === "mock") {
      askMock(q);
    } else {
      void askSqlApi(q);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setPending(false);
  }

  const examples = engine === "mock" ? assistant.examples : sqlExampleQuestions;

  return (
    <div className="rounded-xl border border-crm-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-crm-accent text-sm text-white">
          ✦
        </span>
        <h2 className="text-sm font-semibold text-crm-primary">Ask your CRM</h2>

        {/* Engine toggle */}
        <div className="inline-flex rounded-md border border-crm-border p-0.5">
          {(["mock", "sql"] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={engine === e}
              onClick={() => setEngine(e)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                engine === e
                  ? "bg-crm-primary text-white"
                  : "text-zinc-500 hover:text-crm-primary",
              )}
            >
              {e === "mock" ? "Mock" : "SQL"}
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-zinc-500 sm:inline">
          {engine === "mock"
            ? "· keyword demo over mock data"
            : "· text-to-SQL over the warehouse (stub generator)"}
        </span>

        {messages.length > 0 ? (
          <button
            type="button"
            onClick={clearChat}
            className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-crm-primary"
          >
            Clear chat
          </button>
        ) : null}
      </div>

      {messages.length > 0 ? (
        <div className="mb-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-crm-primary text-white"
                    : m.isError
                      ? "bg-red-50 text-red-800"
                      : "bg-zinc-100 text-crm-primary",
                )}
              >
                <p>{m.text}</p>
                {m.bullets ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] text-zinc-700">
                    {m.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}

                {m.sql ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-crm-primary">
                      Generated SQL
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-zinc-900 p-2 text-[11px] leading-relaxed text-zinc-100">
                      {m.sql}
                    </pre>
                  </details>
                ) : null}

                {m.columns && m.rows && m.rows.length > 0 ? (
                  <div className="mt-2 max-h-48 overflow-auto rounded border border-crm-table-border">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {m.columns.map((c) => (
                            <th
                              key={c}
                              className="whitespace-nowrap border-b border-crm-table-border bg-crm-table-head px-2 py-1 text-left font-semibold text-crm-primary"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.rows.map((row, r) => (
                          <tr key={r} className="even:bg-crm-row-alt">
                            {row.map((cell, c) => (
                              <td
                                key={c}
                                className="whitespace-nowrap px-2 py-1 text-zinc-700 tabular-nums"
                              >
                                {cell === null || cell === undefined
                                  ? "–"
                                  : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
                {engine === "mock" ? "Thinking…" : "Querying…"}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your pipeline…"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-crm-primary placeholder:text-zinc-400 outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-lg bg-crm-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crm-primary-hover disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      {messages.length === 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition-colors hover:border-crm-primary hover:text-crm-primary"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
