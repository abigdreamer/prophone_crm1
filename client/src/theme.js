// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const darkTheme = {
  bg:        "#0b0c10",
  surface:   "#12151c",
  card:      "#181d27",
  border:    "#222836",
  borderHi:  "#2e3a50",
  accent:    "#6366f1",
  accentLow: "rgba(99,102,241,0.10)",
  green:     "#22c55e",
  amber:     "#f59e0b",
  red:       "#ef4444",
  blue:      "#38bdf8",
  purple:    "#c084fc",
  teal:      "#2dd4bf",
  orange:    "#fb923c",
  muted:     "#64748b",
  dim:       "#94a3b8",
  text:      "#e2e8f0",
  shadow:    "0 1px 4px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.25)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.50)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.60)",
  // Navbar-specific tokens (navbar is always dark in both themes)
  navBg:     "#12151c",
  navBorder: "#222836",
  navText:   "#e2e8f0",
  navMuted:  "#64748b",
  navDim:    "#94a3b8",
};

// ─── Light Theme ──────────────────────────────────────────────────────────────
export const lightTheme = {
  bg:        "#f1f5f9",
  surface:   "#ffffff",
  card:      "#f8fafc",
  border:    "#e2e8f0",
  borderHi:  "#cbd5e1",
  accent:    "#6366f1",
  accentLow: "rgba(99,102,241,0.10)",
  green:     "#15803d",
  amber:     "#b45309",
  red:       "#b91c1c",
  blue:      "#1d4ed8",
  purple:    "#7c3aed",
  teal:      "#0f766e",
  orange:    "#c2410c",
  muted:     "#64748b",
  dim:       "#475569",
  text:      "#0f172a",
  shadow:    "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.10)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.14)",
  // Navbar-specific tokens — dark navy bar in light mode
  navBg:     "#173256",
  navBorder: "rgba(255,255,255,0.10)",
  navText:   "#ffffff",
  navMuted:  "rgba(255,255,255,0.50)",
  navDim:    "rgba(255,255,255,0.75)",
};

// ─── Nord Theme ───────────────────────────────────────────────────────────────
export const polarTheme = {
  bg:        "#2e3440", // Polar Night (base)
  surface:   "#3b4252", // Polar Night (brighter)
  card:      "#434c5e", // Polar Night (brightest)
  border:    "#4c566a", // Polar Night (highlight)
  borderHi:  "#81a1c1", // Frost (blue-ish)
  accent:    "#88c0d0", // Frost (cyan)
  accentLow: "rgba(136, 192, 208, 0.10)",
  green:     "#a3be8c", // Aurora (green)
  amber:     "#ebcb8b", // Aurora (yellow)
  red:       "#bf616a", // Aurora (red)
  blue:      "#81a1c1", // Frost (blue)
  purple:    "#b48ead", // Aurora (purple)
  teal:      "#8fbcbb", // Frost (teal)
  orange:    "#d08770", // Aurora (orange)
  muted:     "#d8dee9", // Snow Storm (base)
  dim:       "#e5e9f0", // Snow Storm (brighter)
  text:      "#eceff4", // Snow Storm (brightest)
  shadow:    "0 1px 4px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.40)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.50)",
  // Navbar-specific tokens 
  navBg:     "#2e3440",
  navBorder: "#3b4252",
  navText:   "#eceff4",
  navMuted:  "#d8dee9",
  navDim:    "#e5e9f0",
};

// Default export kept for any static/non-component usage
export default darkTheme;
