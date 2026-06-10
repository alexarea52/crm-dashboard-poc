import type { CSSProperties, ReactNode } from "react";
import { themeVars, type BusinessUnitTheme } from "@/lib/crm";

interface ThemeScopeProps {
  /** The business unit's palette (see lib/crm/data/business-units.ts). */
  theme: BusinessUnitTheme;
  /** Classes for the wrapper div the CSS variables are set on. */
  className?: string;
  children: ReactNode;
}

/**
 * Applies a business unit's theme by setting the CRM CSS variables on a
 * wrapper element. Every descendant `*-crm-*` token (and SVG `var(--color-crm-*)`)
 * resolves to these values, so swapping `theme` re-skins the whole subtree.
 */
export function ThemeScope({ theme, className, children }: ThemeScopeProps) {
  return (
    <div className={className} style={themeVars(theme) as CSSProperties}>
      {children}
    </div>
  );
}
