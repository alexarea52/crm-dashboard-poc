// Mock "ask in plain English" engine.
//
// NOT a real LLM — a keyword-intent matcher over the (scoped) canonical data,
// standing in for an eventual model + retrieval layer. It's built per session
// via `createAssistant(db, session)` so answers respect business-unit scoping
// and financial gating. Swap `answer` for a real model call (tools = the
// selectors) later.

import { canSeeFinancials, type Session } from "../access/auth";
import { connectors } from "../data/connectors";
import type { CrmDatabase } from "../data/model";
import { formatPct, formatUsd, formatUsdM } from "../presentation/format";
import { aggregateChannels, selectDeals } from "../presentation/selectors";

/** A mock-engine reply: main sentence plus optional bullet details. */
export interface AssistantAnswer {
  text: string;
  bullets?: string[];
}

/** Example chips shown in the (mock-mode) chat before any messages. */
export const exampleQuestions = [
  "What's our win rate?",
  "How big is the open pipeline?",
  "Which source brings the most revenue?",
  "What's the largest open deal?",
  "Which systems is this data coming from?",
];

interface Intent {
  keywords: string[];
  answer: () => AssistantAnswer;
}

/** A session-bound mock assistant: answer questions, list example chips. */
export interface Assistant {
  answer: (question: string) => AssistantAnswer;
  examples: string[];
}

/** Build an assistant bound to a scoped database + session. */
export function createAssistant(db: CrmDatabase, session: Session): Assistant {
  const f = db.funnelRollups;
  const ch = aggregateChannels(db);
  const sum = (g: (c: (typeof ch)[number]) => number) =>
    ch.reduce((a, c) => a + g(c), 0);

  const totalLeads = sum((c) => c.leads);
  const mqls = sum((c) => c.mqls);
  const sqls = sum((c) => c.sqls);
  const opps = sum((c) => c.opportunities);
  const quoted = sum((c) => c.quotedValue);

  const byBookings = [...ch].sort((a, b) => b.bookedValue - a.bookedValue);
  const topOpen = selectDeals(db, "open");
  const overTarget = db.leadRollups.avgTimeByStage.filter(
    (s) => s.actualDays > s.targetDays,
  );
  const showFinancials = canSeeFinancials(session);

  // Ordered: earlier intents win ties. Most specific phrasings first.
  const intents: Intent[] = [
    {
      keywords: ["connected", "connector", "integration", "data from", "data source", "which system", "systems", "syncing", "sync"],
      answer: () => ({
        text: `This dashboard merges ${connectors.length} connected systems into one view.`,
        bullets: connectors.map((c) => `${c.name} (${c.kind}) — ${c.status}`),
      }),
    },
    {
      keywords: ["win rate", "close rate", "win %"],
      answer: () => ({
        text: `Win rate is ${formatPct(f.winRatePct)} this period.`,
        bullets: [`Booked: ${formatUsdM(f.bookedValue)}`, `Lost: ${formatUsdM(f.lostOrderValue)}`],
      }),
    },
    {
      keywords: ["largest open", "top open", "open deal", "largest deal", "biggest deal", "top deal", "biggest", "largest"],
      answer: () => {
        const d = topOpen[0];
        return {
          text: d
            ? `Largest open deal: "${d[1]}" with ${d[2]} (${d[3]}) — ${d[10]} quoted, stage ${d[7]}.`
            : "No open deals are visible in your current scope.",
        };
      },
    },
    {
      keywords: ["open pipeline", "open quote", "pipeline", "outstanding", "open"],
      answer: () => ({
        text: `Open quotes total ${formatUsdM(f.openQuotesValue)} across the pipeline.`,
        bullets: topOpen[0] ? [`Largest open deal: ${topOpen[0][1]} — ${topOpen[0][10]}`] : undefined,
      }),
    },
    {
      keywords: ["booked", "bookings", "revenue", "won value"],
      answer: () => ({
        text: `Booked value is ${formatUsdM(f.bookedValue)} — ${formatPct(f.aopAttainmentPct)} of the AOP target.`,
      }),
    },
    {
      keywords: ["lost", "loss", "losses"],
      answer: () => ({ text: `Lost order value is ${formatUsdM(f.lostOrderValue)} this period.` }),
    },
    {
      keywords: ["aop", "target", "attainment", "quota"],
      answer: () => ({ text: `You're at ${formatPct(f.aopAttainmentPct)} of the AOP target.` }),
    },
    {
      keywords: ["best source", "which source", "top source", "best channel", "which channel", "acquisition", "source", "channel"],
      answer: () => ({
        text: byBookings[0]
          ? `${byBookings[0].channel} drives the most booked revenue (${formatUsd(byBookings[0].bookedValue)}).`
          : "No channel data available.",
        bullets: byBookings.slice(0, 3).map((c) => `${c.channel}: ${formatUsd(c.bookedValue)} booked`),
      }),
    },
    {
      keywords: ["cost per", "cac", "cost", "spend", "expensive", "efficient", "cheapest", "margin"],
      answer: () => {
        if (!showFinancials) {
          return {
            text: "Cost & margin figures are restricted to administrators. Your role can't view them.",
          };
        }
        const paid = ch.filter((c) => c.cost > 0);
        const cpl = paid.map((c) => ({ channel: c.channel, cpm: c.cost / c.mqls }));
        cpl.sort((a, b) => a.cpm - b.cpm);
        return {
          text: cpl.length
            ? `Cost per MQL ranges from ${formatUsd(cpl[0].cpm)} (${cpl[0].channel}) to ${formatUsd(cpl[cpl.length - 1].cpm)} (${cpl[cpl.length - 1].channel}).`
            : "No paid channels in scope.",
          bullets: cpl.map((c) => `${c.channel}: ${formatUsd(c.cpm)} / MQL`),
        };
      },
    },
    {
      keywords: ["mql", "sql", "lead", "leads", "funnel", "conversion", "convert"],
      answer: () => ({
        text: `${mqls} MQLs created from ${totalLeads.toLocaleString()} leads; ${sqls} reached SQL (${formatPct((sqls / mqls) * 100)}), ${opps} became opportunities (${formatPct((opps / sqls) * 100)}). Quoted value: ${formatUsdM(quoted)}.`,
      }),
    },
    {
      keywords: ["new vs existing", "new customer", "existing customer", "customer mix", "logo"],
      answer: () => ({
        text: `${formatPct(db.leadRollups.newCustomerPct)} of leads are net-new customers; the rest are existing accounts.`,
      }),
    },
    {
      keywords: ["how long", "time by stage", "stage", "slow", "velocity", "cycle", "speed"],
      answer: () => ({
        text: overTarget.length
          ? `${overTarget.length} stage(s) are running over target: ${overTarget.map((s) => s.stage).join(", ")}.`
          : "Every stage is at or under its target time.",
        bullets: db.leadRollups.avgTimeByStage.map(
          (s) => `${s.stage}: ${s.actualDays}d (target ${s.targetDays}d)`,
        ),
      }),
    },
  ];

  const fallback: AssistantAnswer = {
    text: "I can answer questions about pipeline, bookings, lead conversion, sources, and the systems feeding this dashboard. Try one of the examples below.",
    bullets: exampleQuestions,
  };

  function answer(question: string): AssistantAnswer {
    const q = question.toLowerCase();
    let best: Intent | null = null;
    let bestScore = 0;
    for (const intent of intents) {
      const score = intent.keywords.reduce(
        (n, kw) => (q.includes(kw) ? n + 1 : n),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = intent;
      }
    }
    return best ? best.answer() : fallback;
  }

  return { answer, examples: exampleQuestions };
}
