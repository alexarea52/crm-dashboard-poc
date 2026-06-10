import { cn } from "@/lib/cn";
import { roleLabel, type DemoPersona, type Session } from "@/lib/crm";

const personas: { key: DemoPersona; label: string }[] = [
  { key: "single", label: "Single-BU user" },
  { key: "multi", label: "Multi-BU user" },
  { key: "admin", label: "Admin" },
];

interface ViewControlsProps {
  /** Active demo persona (drives the mock session). */
  persona: DemoPersona;
  /** Called with the newly selected persona. */
  onPersona: (p: DemoPersona) => void;
  /** The persona's resolved session — shown in the role banner. */
  session: Session;
}

/**
 * Demo control: a "View as" persona switch driving the mock auth session.
 * Business-unit selection lives in the dashboard header dropdown.
 */
export function ViewControls({ persona, onPersona, session }: ViewControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-crm-border bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">View as</span>
        <div className="inline-flex rounded-lg border border-crm-border bg-white p-1">
          {personas.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={persona === o.key}
              onClick={() => onPersona(o.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                persona === o.key
                  ? "bg-crm-primary text-white"
                  : "text-zinc-600 hover:text-crm-primary",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
        <span aria-hidden className="size-2 rounded-full bg-crm-accent" />
        <span className="font-medium text-crm-primary">{session.name}</span>
        <span>· {roleLabel[session.role]}</span>
        <span>· {session.businessUnitIds.length} BU(s)</span>
      </div>
    </div>
  );
}
