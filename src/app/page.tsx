import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CRM Dashboard</h1>
        <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Area52 — relationship intelligence that turns job changes into pipeline.
        </p>
      </div>
      <Link
        href="/demo"
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        View component demo →
      </Link>
    </main>
  );
}
