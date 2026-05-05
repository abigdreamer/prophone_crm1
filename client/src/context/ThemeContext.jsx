import { createContext, useContext, useState, useEffect } from "react";
import { darkTheme, lightTheme } from "../theme";

const ThemeCtx      = createContext(darkTheme);
const ThemeNameCtx  = createContext("dark");
const ThemeToggleCtx = createContext(() => {});
const ThemeSetCtx   = createContext(() => {});

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() =>
    localStorage.getItem("prophone-theme") || "dark"
  );

  const theme = themeName === "light" ? lightTheme : darkTheme;

  useEffect(() => {
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
  }, [theme]);

  function toggleTheme() {
    setThemeName(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("prophone-theme", next);
      return next;
    });
  }

  function selectTheme(name) {
    localStorage.setItem("prophone-theme", name);
    setThemeName(name);
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
