import { Platform } from 'react-native';

export const C = {
  // Backgrounds
  bg:           '#060D1F',
  surface:      '#0C1528',
  surfaceHigh:  '#101D30',
  card:         '#0F1929',
  cardBorder:   '#1A2B42',

  // Brand
  primary:      '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDim:   'rgba(59,130,246,0.12)',
  primaryDimMd: 'rgba(59,130,246,0.2)',

  // Text
  text:         '#EFF2FF',
  textSub:      '#8895B8',
  textMuted:    '#4A567A',
  textDim:      '#273245',

  // Status
  success:      '#10B981',
  successDim:   'rgba(16,185,129,0.12)',
  warning:      '#F59E0B',
  warningDim:   'rgba(245,158,11,0.12)',
  error:        '#EF4444',
  errorDim:     'rgba(239,68,68,0.12)',

  white:        '#FFFFFF',
  black:        '#000000',
  transparent:  'transparent',
};

export const STAGE: Record<string, { bg: string; color: string }> = {
  new:         { bg: '#0B2240', color: '#60A5FA' },
  contacted:   { bg: '#1A0F3F', color: '#A78BFA' },
  qualified:   { bg: '#042B1C', color: '#34D399' },
  proposal:    { bg: '#2B1200', color: '#FB923C' },
  negotiation: { bg: '#271600', color: '#FBBF24' },
  won:         { bg: '#031E0C', color: '#4ADE80' },
  lost:        { bg: '#280505', color: '#F87171' },
};

export function stageColors(s: string) {
  return STAGE[s?.toLowerCase()] ?? { bg: '#1A2B42', color: '#8895B8' };
}

export const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  android: { elevation: 6 },
  default: {},
});

export const SHADOW_SM = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  android: { elevation: 3 },
  default: {},
});
