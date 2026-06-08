/** Tiny classnames joiner — keeps falsy values out, no extra deps. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
