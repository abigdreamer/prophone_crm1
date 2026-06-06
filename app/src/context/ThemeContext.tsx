import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceHigh: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryLight: string;
  primaryDim: string;
  primaryDimMd: string;
  text: string;
  textSub: string;
  textMuted: string;
  textDim: string;
  success: string;
  successDim: string;
  warning: string;
  warningDim: string;
  error: string;
  errorDim: string;
  white: string;
  black: string;
  transparent: string;
};

const THEMES: Record<string, { label: string; colors: ThemeColors }> = {
  dark: {
    label: 'Dark',
    colors: {
      bg: '#0b0c10', surface: '#12151c', surfaceHigh: '#181d27',
      card: '#181d27', cardBorder: '#222836',
      primary: '#6366f1', primaryLight: '#818cf8',
      primaryDim: 'rgba(99,102,241,0.12)', primaryDimMd: 'rgba(99,102,241,0.22)',
      text: '#e2e8f0', textSub: '#94a3b8', textMuted: '#64748b', textDim: '#334155',
      success: '#22c55e', successDim: 'rgba(34,197,94,0.12)',
      warning: '#f59e0b', warningDim: 'rgba(245,158,11,0.12)',
      error: '#ef4444', errorDim: 'rgba(239,68,68,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  light: {
    label: 'Light',
    colors: {
      bg: '#f1f5f9', surface: '#ffffff', surfaceHigh: '#f8fafc',
      card: '#f8fafc', cardBorder: '#e2e8f0',
      primary: '#6366f1', primaryLight: '#4f46e5',
      primaryDim: 'rgba(99,102,241,0.10)', primaryDimMd: 'rgba(99,102,241,0.18)',
      text: '#0f172a', textSub: '#475569', textMuted: '#64748b', textDim: '#cbd5e1',
      success: '#15803d', successDim: 'rgba(21,128,61,0.10)',
      warning: '#b45309', warningDim: 'rgba(180,83,9,0.10)',
      error: '#b91c1c', errorDim: 'rgba(185,28,28,0.10)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  midnight: {
    label: 'Midnight',
    colors: {
      bg: '#060810', surface: '#0d1117', surfaceHigh: '#111827',
      card: '#111827', cardBorder: '#1e2736',
      primary: '#3b82f6', primaryLight: '#60a5fa',
      primaryDim: 'rgba(59,130,246,0.12)', primaryDimMd: 'rgba(59,130,246,0.22)',
      text: '#f9fafb', textSub: '#9ca3af', textMuted: '#4b5563', textDim: '#1f2937',
      success: '#10b981', successDim: 'rgba(16,185,129,0.12)',
      warning: '#f59e0b', warningDim: 'rgba(245,158,11,0.12)',
      error: '#f43f5e', errorDim: 'rgba(244,63,94,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  dracula: {
    label: 'Dracula',
    colors: {
      bg: '#1e1f29', surface: '#282a36', surfaceHigh: '#2e3040',
      card: '#2e3040', cardBorder: '#44475a',
      primary: '#bd93f9', primaryLight: '#caa9fa',
      primaryDim: 'rgba(189,147,249,0.12)', primaryDimMd: 'rgba(189,147,249,0.22)',
      text: '#f8f8f2', textSub: '#a9b1d6', textMuted: '#6272a4', textDim: '#44475a',
      success: '#50fa7b', successDim: 'rgba(80,250,123,0.12)',
      warning: '#f1fa8c', warningDim: 'rgba(241,250,140,0.12)',
      error: '#ff5555', errorDim: 'rgba(255,85,85,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  nord: {
    label: 'Nord',
    colors: {
      bg: '#2e3440', surface: '#3b4252', surfaceHigh: '#434c5e',
      card: '#434c5e', cardBorder: '#4c566a',
      primary: '#88c0d0', primaryLight: '#8fbcbb',
      primaryDim: 'rgba(136,192,208,0.14)', primaryDimMd: 'rgba(136,192,208,0.24)',
      text: '#eceff4', textSub: '#e5e9f0', textMuted: '#d8dee9', textDim: '#4c566a',
      success: '#a3be8c', successDim: 'rgba(163,190,140,0.14)',
      warning: '#ebcb8b', warningDim: 'rgba(235,203,139,0.14)',
      error: '#bf616a', errorDim: 'rgba(191,97,106,0.14)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  adapta: {
    label: 'Adapta',
    colors: {
      bg: '#1a1f24', surface: '#232c33', surfaceHigh: '#2c3840',
      card: '#2c3840', cardBorder: '#37474f',
      primary: '#26c6da', primaryLight: '#4dd0e1',
      primaryDim: 'rgba(38,198,218,0.12)', primaryDimMd: 'rgba(38,198,218,0.22)',
      text: '#eceff1', textSub: '#b0bec5', textMuted: '#546e7a', textDim: '#37474f',
      success: '#66bb6a', successDim: 'rgba(102,187,106,0.12)',
      warning: '#ffa726', warningDim: 'rgba(255,167,38,0.12)',
      error: '#ef5350', errorDim: 'rgba(239,83,80,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  slack: {
    label: 'Slack',
    colors: {
      bg: '#1a0d1b', surface: '#3d1040', surfaceHigh: '#4a154b',
      card: '#4a154b', cardBorder: '#5e2160',
      primary: '#ecb22e', primaryLight: '#f0c050',
      primaryDim: 'rgba(236,178,46,0.14)', primaryDimMd: 'rgba(236,178,46,0.24)',
      text: '#ffffff', textSub: '#c9a5ca', textMuted: '#7a5a7b', textDim: '#5e2160',
      success: '#2eb67d', successDim: 'rgba(46,182,125,0.14)',
      warning: '#ecb22e', warningDim: 'rgba(236,178,46,0.14)',
      error: '#e01e5a', errorDim: 'rgba(224,30,90,0.14)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  foxtow: {
    label: 'Foxtow',
    colors: {
      bg: '#00160a', surface: '#00280f', surfaceHigh: '#003d18',
      card: '#003d18', cardBorder: '#005420',
      primary: '#d1130d', primaryLight: '#e84040',
      primaryDim: 'rgba(209,19,13,0.14)', primaryDimMd: 'rgba(209,19,13,0.24)',
      text: '#f0fdf4', textSub: '#bbf7d0', textMuted: '#6aab7e', textDim: '#005420',
      success: '#22c55e', successDim: 'rgba(34,197,94,0.14)',
      warning: '#f4c430', warningDim: 'rgba(244,196,48,0.14)',
      error: '#d1130d', errorDim: 'rgba(209,19,13,0.14)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  macintosh: {
    label: 'Macintosh',
    colors: {
      bg: '#c0c0c0', surface: '#d4d0c8', surfaceHigh: '#ddd9d1',
      card: '#e0ddd6', cardBorder: '#888888',
      primary: '#0000aa', primaryLight: '#1515bb',
      primaryDim: 'rgba(0,0,170,0.12)', primaryDimMd: 'rgba(0,0,170,0.20)',
      text: '#000000', textSub: '#333333', textMuted: '#666666', textDim: '#aaaaaa',
      success: '#008000', successDim: 'rgba(0,128,0,0.12)',
      warning: '#cc6600', warningDim: 'rgba(204,102,0,0.12)',
      error: '#cc0000', errorDim: 'rgba(204,0,0,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  classic: {
    label: 'Classic',
    colors: {
      bg: '#eaeaea', surface: '#d4d0c8', surfaceHigh: '#ece9d8',
      card: '#ece9d8', cardBorder: '#aca899',
      primary: '#0054e3', primaryLight: '#1465f0',
      primaryDim: 'rgba(0,84,227,0.10)', primaryDimMd: 'rgba(0,84,227,0.18)',
      text: '#000000', textSub: '#2a2a2a', textMuted: '#6b6b6b', textDim: '#c0bcb3',
      success: '#007700', successDim: 'rgba(0,119,0,0.10)',
      warning: '#c06800', warningDim: 'rgba(192,104,0,0.10)',
      error: '#cc0000', errorDim: 'rgba(204,0,0,0.10)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  rosepine: {
    label: 'Rosé Pine',
    colors: {
      bg: '#191724', surface: '#1f1d2e', surfaceHigh: '#26233a',
      card: '#26233a', cardBorder: '#403d52',
      primary: '#eb6f92', primaryLight: '#f087a8',
      primaryDim: 'rgba(235,111,146,0.12)', primaryDimMd: 'rgba(235,111,146,0.22)',
      text: '#e0def4', textSub: '#908caa', textMuted: '#6e6a86', textDim: '#403d52',
      success: '#31748f', successDim: 'rgba(49,116,143,0.12)',
      warning: '#f6c177', warningDim: 'rgba(246,193,119,0.12)',
      error: '#eb6f92', errorDim: 'rgba(235,111,146,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
  monokai: {
    label: 'Monokai',
    colors: {
      bg: '#1e1e1e', surface: '#272822', surfaceHigh: '#2f3029',
      card: '#2f3029', cardBorder: '#3e3d32',
      primary: '#a6e22e', primaryLight: '#b9f53c',
      primaryDim: 'rgba(166,226,46,0.12)', primaryDimMd: 'rgba(166,226,46,0.22)',
      text: '#f8f8f2', textSub: '#cfcfc2', textMuted: '#8f908a', textDim: '#3e3d32',
      success: '#a6e22e', successDim: 'rgba(166,226,46,0.12)',
      warning: '#e6db74', warningDim: 'rgba(230,219,116,0.12)',
      error: '#f92672', errorDim: 'rgba(249,38,114,0.12)',
      white: '#ffffff', black: '#000000', transparent: 'transparent',
    },
  },
};

export const THEME_LIST = Object.entries(THEMES).map(([id, { label }]) => ({ id, label }));

export function getThemeColors(id: string): ThemeColors {
  return THEMES[id]?.colors ?? THEMES.dark.colors;
}

export function isLightTheme(id: string): boolean {
  return id === 'light' || id === 'macintosh' || id === 'classic';
}

type ThemeContextValue = {
  themeId: string;
  setThemeId: (id: string) => void;
  C: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'dark',
  setThemeId: () => {},
  C: THEMES.dark.colors,
});

const THEME_STORAGE_KEY = 'prophone_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState('dark');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY).then((saved) => {
      if (saved && THEMES[saved]) setThemeIdState(saved);
    });
  }, []);

  const setThemeId = useCallback((id: string) => {
    if (!THEMES[id]) return;
    setThemeIdState(id);
    SecureStore.setItemAsync(THEME_STORAGE_KEY, id);
  }, []);

  const C = useMemo(() => THEMES[themeId]?.colors ?? THEMES.dark.colors, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
