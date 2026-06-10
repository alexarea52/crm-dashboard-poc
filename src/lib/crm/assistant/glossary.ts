// Plain-English definitions for the funnel / sales terms used across the
// dashboard. Surfaced in-app via the Glossary modal so non-specialist users
// aren't left guessing what MQL, AOP, coverage ratio, etc. mean.

/** One glossary entry. */
export interface GlossaryTerm {
  term: string;
  /** Expansion of an acronym, e.g. "Marketing Qualified Lead". */
  full?: string;
  definition: string;
}

/** A titled section of related glossary terms. */
export interface GlossaryGroup {
  title: string;
  terms: GlossaryTerm[];
}

/** All glossary content rendered by the Glossary modal, in display order. */
export const glossary: GlossaryGroup[] = [
  {
    title: "The lead → revenue funnel",
    terms: [
      {
        term: "Lead",
        definition:
          "Any raw contact that came in. Most aren't ready to buy yet — this is the top of the funnel and the basis of the “Leads by Source” chart.",
      },
      {
        term: "MQL",
        full: "Marketing Qualified Lead",
        definition:
          "A lead that has shown enough interest or fits the target profile well enough that marketing thinks it's worth a salesperson's attention.",
      },
      {
        term: "SQL",
        full: "Sales Qualified Lead",
        definition:
          "An MQL that a salesperson has vetted and confirmed is a real, worth-pursuing prospect. The MQL→SQL step is the “is this actually viable?” filter.",
      },
      {
        term: "Opportunity (Opp)",
        definition:
          "An SQL that has become an active deal with real money attached — a number sitting in the pipeline.",
      },
    ],
  },
  {
    title: "Deal stages",
    terms: [
      {
        term: "Scoping → Concepting → Designing → Quoting → Negotiation",
        definition:
          "The milestones an opportunity moves through as it progresses toward an order.",
      },
      {
        term: "Closed Won / Closed Lost",
        definition:
          "Terminal stages: the deal was either signed (Won) or didn't happen (Lost).",
      },
    ],
  },
  {
    title: "Money",
    terms: [
      {
        term: "Quoted Value",
        definition: "Total dollar value of quotes put in front of customers.",
      },
      {
        term: "Booked Value",
        definition: "Quotes that turned into actual orders — revenue won.",
      },
      {
        term: "Lost Order Value",
        definition: "Total value of deals that were quoted but ultimately lost.",
      },
      {
        term: "Win Rate",
        definition:
          "Share of decided deals you won — won ÷ (won + lost). Higher is better.",
      },
      {
        term: "Margin Value / Margin %",
        definition:
          "The profit portion of a deal, shown in dollars and as a percentage of the quote.",
      },
      {
        term: "Bookings",
        definition:
          "Orders won in a period. “Bookings vs PY” compares this period to the prior year.",
      },
    ],
  },
  {
    title: "Planning & efficiency",
    terms: [
      {
        term: "AOP",
        full: "Annual Operating Plan",
        definition:
          "The company's budget / revenue target for the year. “% AOP Target” over 100% means you're ahead of plan.",
      },
      {
        term: "Coverage Ratio",
        definition:
          "Open pipeline ÷ remaining target. A rule of thumb is ~3× coverage to comfortably hit quota.",
      },
      {
        term: "Cost per MQL / Cost per SQL",
        definition:
          "Marketing spend divided by the leads it produced — acquisition efficiency per channel.",
      },
      {
        term: "PY",
        full: "Prior Year",
        definition: "The equivalent period one year earlier, used for comparison.",
      },
    ],
  },
  {
    title: "Segmentation",
    terms: [
      {
        term: "OEM",
        full: "Original Equipment Manufacturer",
        definition:
          "Selling into a new build or original machine — large, slower capital deals (e.g. the “Facility Buildout” deals).",
      },
      {
        term: "Aftermarket",
        definition:
          "Parts, consumables and service for equipment already in the field — smaller, faster, often recurring (e.g. blades & handsets).",
      },
      {
        term: "Customer vs End User",
        definition:
          "The Customer is who you sell to and invoice (e.g. an integrator); the End User is who actually operates the equipment. They differ on reseller/channel deals.",
      },
    ],
  },
];
