/**
 * Design tokens — used throughout the app with inline styles.
 *
 * Source of truth: src/constants/theme.js  (COLORS, THEME)
 * This file provides the T shorthand that existing components already use,
 * and re-exports THEME + COLORS so new components can import from either place.
 */
import { COLORS, THEME } from './constants/theme.js';

const T = {
  bg:        COLORS.background,
  surface:   COLORS.surface,
  card:      COLORS.surface,
  panel:     COLORS.panel,
  header:    COLORS.header,
  border:    COLORS.border,
  borderHi:  COLORS.borderHi,
  accent:    COLORS.primary,
  accentLow: COLORS.primaryTint,
  green:     COLORS.success,
  amber:     COLORS.warning,
  red:       COLORS.danger,
  blue:      COLORS.secondary,
  purple:    COLORS.purple,
  teal:      COLORS.teal,
  orange:    COLORS.orange,
  muted:     COLORS.textMuted,
  dim:       COLORS.textDim,
  sub:       COLORS.textSub,
  text:      COLORS.text,
};

export { THEME, COLORS };
export default T;
