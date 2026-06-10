import { cn } from "@/lib/cn";

/** A dropdown option. */
export interface SelectOption {
  /** Machine value passed to `onChange`. */
  value: string;
  /** Human-readable option text. */
  label: string;
}

/** A header filter dropdown. `disabled` renders it locked (e.g. a single-BU user). */
export interface HeaderFilter {
  /** Small caption above the control (e.g. "Creation Date"). */
  label: string;
  /** Currently selected option value. */
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Locked: rendered muted and non-interactive. */
  disabled?: boolean;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: HeaderFilter) {
  return (
    <div className="min-w-[112px]">
      <span className="block text-[10px] font-medium text-zinc-500">{label}</span>
      <div
        className={cn(
          "relative mt-0.5 border-b-2",
          disabled ? "border-zinc-300" : "border-crm-primary/60",
        )}
      >
        <select
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none bg-transparent pb-1 pr-4 text-xs font-medium outline-none",
            disabled
              ? "cursor-default text-zinc-700"
              : "cursor-pointer text-crm-primary",
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-0 top-1/2 -translate-y-1/2",
            disabled ? "text-zinc-400" : "text-crm-primary",
          )}
        >
          ⌄
        </span>
      </div>
    </div>
  );
}

interface DashboardHeaderProps {
  title: string;
  filters: HeaderFilter[];
  /** Logo mark for the active business unit (e.g. "W", "B", "F"). */
  logoText?: string;
}

/**
 * Header band (themed by the active business unit): logo + title on the left,
 * a filter panel of dropdowns on the right.
 */
export function DashboardHeader({
  title,
  filters,
  logoText = "F",
}: DashboardHeaderProps) {
  return (
    <div className="rounded-xl bg-crm-primary p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crm-accent text-lg font-bold text-white">
            {logoText}
          </span>
          <h1 className="text-lg font-semibold leading-tight text-white">
            {title}
          </h1>
        </div>
        <div className="rounded-lg bg-white p-3 lg:max-w-3xl lg:flex-1">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {filters.map((filter) => (
              <SelectField key={filter.label} {...filter} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
