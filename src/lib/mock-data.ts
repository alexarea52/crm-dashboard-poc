import type {
  FunnelStage,
  Metric,
  Mover,
  RankedItem,
  SegmentPoint,
  SeriesPoint,
  Slice,
} from "./types";

// All figures lifted from the Area52 wireframes — placeholder data only.

export const headlineMetrics: Metric[] = [
  {
    label: "Pipeline created",
    value: "$5.1M",
    delta: "+18% vs last Q",
    trend: "up",
  },
  {
    label: "Opportunities created",
    value: "298",
    delta: "+24 this month",
    trend: "up",
  },
  {
    label: "Closed-won",
    value: "$1.3M",
    caption: "45 deals · 15% win",
  },
  {
    label: "Job-change leads tracked",
    value: "15.2K",
    delta: "+1.4K new movers",
    trend: "up",
    emphasis: true,
  },
];

export const pipelineFunnel: FunnelStage[] = [
  { label: "Initial contact", amount: 383_000, tone: "brand" },
  { label: "1 · Discovery", amount: 155_000, tone: "brand" },
  { label: "2 · Business validation", amount: 96_000, tone: "muted" },
  { label: "3 · Technical validation", amount: 74_000, tone: "dark" },
  { label: "4 · Confirm intent", amount: 63_000, tone: "accent" },
];

export const pipelineSource: Slice[] = [
  { label: "Customer", value: 38, color: "var(--color-brand-600)" },
  { label: "Open opp", value: 26, color: "var(--color-brand-300)" },
  { label: "Target acct", value: 18, color: "var(--color-accent-500)" },
  { label: "Regular", value: 18, color: "#cbd0dd" },
];

export const companySizeMix: Slice[] = [
  { label: "Enterprise", value: 32, color: "var(--color-brand-600)" },
  { label: "Mid-market", value: 28, color: "var(--color-brand-300)" },
  { label: "SMB", value: 40, color: "#cbd0dd" },
];

export const topAccounts: RankedItem[] = [
  { label: "Salesforce.com", value: 110 },
  { label: "Amazon Web Services", value: 66 },
  { label: "Snowflake", value: 47, highlight: true },
  { label: "Rippling", value: 46 },
  { label: "Navan", value: 35 },
  { label: "Gartner", value: 34 },
  { label: "Adobe", value: 34 },
];

export const movers: Mover[] = [
  {
    id: "m1",
    name: "Gabrielle Reyes",
    title: "Dir, Marketing Ops",
    fromCompany: "Acme Co",
    toCompany: "Databricks",
    signal: "hot",
  },
  {
    id: "m2",
    name: "Alek Milovidov",
    title: "VP Business Dev",
    fromCompany: "Northwind",
    toCompany: "Datadog",
    signal: "hot",
  },
  {
    id: "m3",
    name: "Ryan Murray",
    title: "Dir, BizDev",
    fromCompany: "Globex",
    toCompany: "Workday",
    signal: "warm",
  },
  {
    id: "m4",
    name: "Shya Rajakrishnan",
    title: "Dir, BizDev",
    fromCompany: "Initech",
    toCompany: "Outreach",
    signal: "warm",
  },
  {
    id: "m5",
    name: "Erik Taylor",
    title: "Head of BizDev",
    fromCompany: "Umbrella",
    toCompany: "Autodesk",
    signal: "new",
  },
  {
    id: "m6",
    name: "Patrick Santiago",
    title: "Head of BizDev",
    fromCompany: "Soylent",
    toCompany: "Topcoder",
    signal: "new",
  },
];

export const outreachByOwner: SeriesPoint[] = [
  { label: "Alex", value: 18 },
  { label: "Caleb", value: 34 },
  { label: "Courtney", value: 47 },
  { label: "Emily", value: 12 },
  { label: "Jake", value: 29 },
  { label: "Jasen", value: 41 },
  { label: "Leah", value: 52 },
  { label: "Marcel", value: 38 },
  { label: "Noah", value: 31 },
  { label: "Roberta", value: 44 },
];

export const outreachRateByType: SegmentPoint[] = [
  { label: "Customer", value: 82, total: 100 },
  { label: "Open opp", value: 61, total: 100 },
  { label: "Regular", value: 47, total: 100 },
  { label: "Target", value: 73, total: 100 },
];
