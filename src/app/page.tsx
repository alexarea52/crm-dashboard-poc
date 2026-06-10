import Link from "next/link";

/** Home page — a single entry link into the CRM dashboard. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CRM Dashboard</h1>
        <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Lead management and sales funnel dashboards over merged CRM data.
        </p>
      </div>
      <Link
        href="/crm-dashboard"
        className="rounded-lg bg-crm-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-crm-primary-hover"
      >
        View CRM dashboard →
      </Link>
    </main>
  );
}
