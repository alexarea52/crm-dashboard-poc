"use client";

import { useEffect, useState } from "react";
import { glossary } from "@/lib/crm";

interface GlossaryModalProps {
  /** Whether the modal renders; closed renders nothing. */
  open: boolean;
  /** Called on backdrop click, the ✕ button, or Escape. */
  onClose: () => void;
}

/** Accessible, filterable glossary modal for the dashboard's funnel terms. */
export function GlossaryModal({ open, onClose }: GlossaryModalProps) {
  const [query, setQuery] = useState("");

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const needle = query.trim().toLowerCase();
  const groups = glossary
    .map((g) => ({
      ...g,
      terms: g.terms.filter(
        (t) =>
          !needle ||
          t.term.toLowerCase().includes(needle) ||
          (t.full ?? "").toLowerCase().includes(needle) ||
          t.definition.toLowerCase().includes(needle),
      ),
    }))
    .filter((g) => g.terms.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Glossary"
    >
      {/* Decorative scrim; keyboard users dismiss via Escape or the ✕ button. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-crm-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-crm-primary">Glossary</h2>
            <p className="text-xs text-zinc-500">
              What the funnel &amp; sales terms on this dashboard mean
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-crm-primary"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-crm-border px-5 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter terms…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-crm-primary placeholder:text-zinc-400 outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary"
          />
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No terms match “{query}”.
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.title} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {g.title}
                </h3>
                <dl className="space-y-3">
                  {g.terms.map((t) => (
                    <div key={t.term}>
                      <dt className="text-sm font-semibold text-crm-primary">
                        {t.term}
                        {t.full ? (
                          <span className="font-normal text-zinc-500">
                            {" "}
                            — {t.full}
                          </span>
                        ) : null}
                      </dt>
                      <dd className="mt-0.5 text-sm text-zinc-600">
                        {t.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
