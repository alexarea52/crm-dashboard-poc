// Business-unit registry + per-BU themes.
//
// A business unit is the unit of branding *and* of data scoping (see auth.ts).
// Its `theme` maps onto the CRM CSS tokens declared in globals.css; ThemeScope
// applies it at runtime, so re-skinning the whole dashboard for a BU is a
// data change here — no component edits.

/** Per-BU palette mapped onto the --crm-* CSS variables by ThemeScope. */
export interface BusinessUnitTheme {
  primary: string;
  primaryHover: string;
  accent: string;
  series2: string;
  target: string;
  warn: string;
  muted: string;
}

/** A business unit: the unit of branding AND of data scoping. */
export interface BusinessUnit {
  id: string;
  name: string;
  /** Single-letter mark shown in the header logo. */
  logoText: string;
  theme: BusinessUnitTheme;
}

/** Default "all business units" view — the corporate navy/green theme. */
export const corporateBusinessUnit: BusinessUnit = {
  id: "all",
  name: "All Business Units",
  logoText: "F",
  theme: {
    primary: "#1c2b4a",
    primaryHover: "#16294a",
    accent: "#27ae60",
    series2: "#7ea8d8",
    target: "#4f86d6",
    warn: "#ef8b2c",
    muted: "#cbd3df",
  },
};

/** All concrete business units (excludes the corporate "all" pseudo-unit). */
export const businessUnits: BusinessUnit[] = [
  {
    id: "wyma",
    name: "Wyma",
    logoText: "W",
    theme: {
      primary: "#1d4e89",
      primaryHover: "#163c6b",
      accent: "#2e9e5b",
      series2: "#79a8d6",
      target: "#3b82f6",
      warn: "#f0922b",
      muted: "#c7d2e0",
    },
  },
  {
    id: "betcher",
    name: "Betcher",
    logoText: "B",
    theme: {
      primary: "#0f5e5a",
      primaryHover: "#0a4744",
      accent: "#e08a1e",
      series2: "#7cc4bf",
      target: "#14b8a6",
      warn: "#ef6b3c",
      muted: "#cdd6d4",
    },
  },
];

const byId: Record<string, BusinessUnit> = Object.fromEntries(
  [corporateBusinessUnit, ...businessUnits].map((bu) => [bu.id, bu]),
);

/** Look up a unit by id; unknown ids fall back to the corporate unit. */
export function businessUnitById(id: string): BusinessUnit {
  return byId[id] ?? corporateBusinessUnit;
}

/** Maps a BU theme to the inline CSS-variable overrides ThemeScope applies. */
export function themeVars(theme: BusinessUnitTheme): Record<string, string> {
  return {
    "--crm-primary": theme.primary,
    "--crm-primary-hover": theme.primaryHover,
    "--crm-accent": theme.accent,
    "--crm-series-2": theme.series2,
    "--crm-target": theme.target,
    "--crm-warn": theme.warn,
    "--crm-muted": theme.muted,
  };
}
