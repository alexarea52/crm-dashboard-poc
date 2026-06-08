import type { Metadata } from "next";

import { BarChart } from "@/components/charts/bar-chart";
import { BarList } from "@/components/charts/bar-list";
import { DonutChart } from "@/components/charts/donut-chart";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { SegmentedBarChart } from "@/components/charts/segmented-bar";
import { StatCard } from "@/components/charts/stat-card";
import { ActionQueue } from "@/components/movers/action-queue";
import { MoverCard } from "@/components/movers/mover-card";
import { MoversTable } from "@/components/movers/movers-table";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  companySizeMix,
  headlineMetrics,
  movers,
  outreachByOwner,
  outreachRateByType,
  pipelineFunnel,
  pipelineSource,
  topAccounts,
} from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Component demo · Area52",
  description: "Showcase of the Area52 dashboard components with mock data.",
};

function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 mt-2 flex items-baseline gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {children}
      </h2>
      {hint ? <span className="text-xs text-zinc-400">· {hint}</span> : null}
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Brand header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              A52
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Area52</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Relationship intelligence — turn job changes into pipeline
              </p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Component demo · mock data
          </span>
        </header>

        {/* Headline metrics */}
        <section>
          <SectionTitle hint="StatCard">Overview</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {headlineMetrics.map((metric) => (
              <StatCard key={metric.label} metric={metric} />
            ))}
          </div>
        </section>

        {/* Funnel + proportion donuts */}
        <section className="mt-8">
          <SectionTitle hint="PipelineFunnel · DonutChart">
            Pipeline composition
          </SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Pipeline funnel"
                subtitle="Sum of amount by stage · this quarter"
              />
              <CardBody>
                <PipelineFunnel stages={pipelineFunnel} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Where pipeline came from"
                subtitle="By account type"
              />
              <CardBody>
                <DonutChart data={pipelineSource} centerLabel="15K" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Company size mix" subtitle="Movers by segment" />
              <CardBody>
                <DonutChart data={companySizeMix} centerLabel="15K" />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Top accounts + movers table */}
        <section className="mt-8">
          <SectionTitle hint="BarList · MoversTable">
            Accounts &amp; movers
          </SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Top target accounts by tracked movers"
                subtitle="Where your network is strongest"
              />
              <CardBody>
                <BarList items={topAccounts} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="New movers to act on"
                subtitle="Contacts who just changed jobs into a target account"
              />
              <CardBody>
                <MoversTable movers={movers.slice(0, 5)} />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Outreach charts */}
        <section className="mt-8">
          <SectionTitle hint="BarChart · SegmentedBarChart">
            Team outreach
          </SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Outreach by owner"
                subtitle="Activities logged · last 30 days"
              />
              <CardBody>
                <BarChart data={outreachByOwner} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Outreach rate by account type"
                subtitle="% of movers contacted"
              />
              <CardBody>
                <SegmentedBarChart data={outreachRateByType} />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Mover cards */}
        <section className="mt-8">
          <SectionTitle hint="MoverCard">People to reach out to now</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {movers.map((mover) => (
              <MoverCard key={mover.id} mover={mover} />
            ))}
          </div>
        </section>

        {/* Action queue */}
        <section className="mt-8">
          <SectionTitle hint="ActionQueue">Action queue</SectionTitle>
          <div className="max-w-md">
            <ActionQueue movers={movers.slice(0, 4)} />
          </div>
        </section>

        <footer className="mt-12 border-t border-zinc-200 pt-5 text-center text-xs text-zinc-400 dark:border-zinc-800">
          Rough wireframes · placeholder data · Area52 is a placeholder name for
          this exploration
        </footer>
      </div>
    </div>
  );
}
