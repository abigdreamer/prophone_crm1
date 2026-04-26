/**
 * Global UI theme constants.
 *
 * Change values here to update the entire UI globally.
 * All components should import from this file — no hardcoded colors anywhere.
 */

export const COLORS = {
  // Base palette
  primary:    '#6366f1',   // Indigo — CTAs, active states
  secondary:  '#0284c7',   // Blue — secondary actions
  success:    '#16a34a',   // Green
  warning:    '#d97706',   // Amber
  danger:     '#dc2626',   // Red — destructive actions
  purple:     '#9333ea',
  teal:       '#0d9488',
  orange:     '#ea580c',

  // Backgrounds
  background: '#f1f5f9',   // Page background
  surface:    '#ffffff',   // Card / panel surface
  panel:      '#f8fafc',   // Slightly off-white inner panels
  header:     '#1a3560',   // Dark blue nav/header bar

  // Borders
  border:     '#e2e8f0',
  borderHi:   '#cbd5e1',

  // Text
  text:       '#0f172a',   // Primary text
  textSub:    '#475569',   // Secondary text
  textMuted:  '#64748b',   // Muted / placeholder
  textDim:    '#94a3b8',   // Disabled / very muted

  // Accent tints
  primaryTint: '#eef2ff',  // Light indigo background (e.g. active nav item)
};

export const THEME = {
  colors: COLORS,

  components: {
    button: {
      primary:   { background: COLORS.primary,   color: '#ffffff' },
      secondary: { background: COLORS.secondary, color: '#ffffff' },
      danger:    { background: COLORS.danger,     color: '#ffffff' },
      outline:   { background: 'transparent',    color: COLORS.primary,  border: `1px solid ${COLORS.primary}` },
      ghost:     { background: 'transparent',    color: COLORS.textSub,  border: `1px solid ${COLORS.border}` },
    },

    navbar: {
      background: COLORS.header,
      text:       '#ffffff',
      textMuted:  'rgba(255,255,255,0.65)',
      active:     'rgba(255,255,255,0.15)',
    },

    dropdown: {
      background: COLORS.surface,
      border:     COLORS.border,
      text:       COLORS.text,
      hoverBg:    COLORS.background,
      shadow:     '0 4px 16px rgba(0,0,0,0.10)',
    },

    input: {
      background: COLORS.surface,
      border:     COLORS.border,
      borderFocus: COLORS.primary,
      text:       COLORS.text,
      placeholder: COLORS.textDim,
      borderRadius: 8,
    },

    card: {
      background: COLORS.surface,
      border:     COLORS.border,
      shadow:     '0 1px 4px rgba(0,0,0,0.06)',
      borderRadius: 12,
    },

    modal: {
      background: COLORS.surface,
      overlay:    'rgba(0,0,0,0.45)',
      borderRadius: 14,
      shadow:     '0 8px 32px rgba(0,0,0,0.16)',
    },

    badge: {
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
    },
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    xxl: 32,
  },

  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: {
      xs:   11,
      sm:   12,
      base: 13,
      md:   14,
      lg:   16,
      xl:   18,
      xxl:  22,
    },
    fontWeight: {
      normal:   400,
      medium:   500,
      semibold: 600,
      bold:     700,
    },
  },

  radii: {
    sm:   4,
    md:   8,
    lg:  12,
    xl:  16,
    full: 9999,
  },
};

export default THEME;
