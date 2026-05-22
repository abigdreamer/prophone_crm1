import { createContext, useContext, useState, useEffect } from "react";
import { appThemes } from "../themes/theme";

const ThemeCtx       = createContext(appThemes.dark);
const ThemeNameCtx   = createContext("dark");
const ThemeToggleCtx = createContext(() => {});
const ThemeSetCtx    = createContext(() => {});

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() =>
    localStorage.getItem("prophone-theme") || "dark"
  );

  const theme = appThemes[themeName] || appThemes.dark;

  useEffect(() => {
    const bg = theme.bg;
    // gradients can't be set as background-color
    document.body.style.background = bg;
    document.body.style.color = theme.text;
    document.body.style.transition = "background 0.2s ease, color 0.2s ease";
  }, [theme]);

  function toggleTheme() {
    setThemeName(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("prophone-theme", next);
      return next;
    });
  }

  function selectTheme(name) {
    if (appThemes[name]) {
      localStorage.setItem("prophone-theme", name);
      setThemeName(name);
    }
  }

  return (
    <ThemeCtx.Provider value={theme}>
      <ThemeNameCtx.Provider value={themeName}>
        <ThemeToggleCtx.Provider value={toggleTheme}>
          <ThemeSetCtx.Provider value={selectTheme}>
            {children}
          </ThemeSetCtx.Provider>
        </ThemeToggleCtx.Provider>
      </ThemeNameCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export function useTheme()       { return useContext(ThemeCtx);       }
export function useThemeName()   { return useContext(ThemeNameCtx);   }
export function useThemeToggle() { return useContext(ThemeToggleCtx); }
export function useSetTheme()    { return useContext(ThemeSetCtx);    }

// Named re-exports for any legacy imports
export const darkTheme    = appThemes.dark;
export const lightTheme   = appThemes.light;
export const polarTheme   = appThemes.nord;
