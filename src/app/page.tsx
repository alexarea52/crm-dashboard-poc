import Link from "next/link";

/** Home page — entry links into the CRM dashboard and the data mapper. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CRM Dashboard</h1>
        <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Lead management and sales funnel dashboards over merged CRM data.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/crm-dashboard"
          className="rounded-lg bg-crm-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-crm-primary-hover"
        >
          View CRM dashboard →
        </Link>
        <Link
          href="/data-mapper"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Data Mapper →
        </Link>
      </div>
    </main>
  );
}
