// POST /api/ask — the text-to-SQL endpoint.
//
// Body: { question: string, persona: "single" | "multi" | "admin" }
// The persona maps to a mock Session (demo auth); a real deployment derives
// the session from the authenticated request instead. Scoping and financial
// gating are enforced server-side in the SQL layer regardless of what the
// client sends.

import { demoSessions } from "@/lib/crm/access/auth";
import { askSql } from "@/lib/crm/sql/pipeline";

const MAX_QUESTION_LENGTH = 500;

function isPersona(v: unknown): v is keyof typeof demoSessions {
  return typeof v === "string" && v in demoSessions;
}

/** Validate the body, resolve the persona to a session, run the pipeline. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const question = body?.question;
  const persona = body?.persona;

  if (
    typeof question !== "string" ||
    question.trim().length === 0 ||
    question.length > MAX_QUESTION_LENGTH ||
    !isPersona(persona)
  ) {
    return Response.json(
      {
        error: "bad_request",
        message: `Expected { question: string (1–${MAX_QUESTION_LENGTH} chars), persona: "single" | "multi" | "admin" }.`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await askSql(question.trim(), demoSessions[persona]);
    // Guard rejections / execution errors are expected in-band outcomes the
    // chat UI renders — they return 200 with a discriminating `kind`.
    return Response.json(result);
  } catch {
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
