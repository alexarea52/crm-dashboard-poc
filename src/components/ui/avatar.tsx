import { cn } from "@/lib/cn";

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface AvatarProps {
  name: string;
  /** Override the derived initials. */
  initials?: string;
  size?: "sm" | "md";
  className?: string;
}

/** Initials avatar — circular, brand-tinted. */
export function Avatar({ name, initials, size = "md", className }: AvatarProps) {
  const label = initials ?? initialsFrom(name);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
        "dark:bg-brand-900/50 dark:text-brand-200",
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
