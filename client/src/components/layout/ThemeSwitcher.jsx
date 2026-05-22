import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTheme, useThemeName, useSetTheme } from "../../context/ThemeContext";

const THEMES = [
  { id: "dark", label: "Default", color: "#6366f1" },
  { id: "light", label: "Light", color: "#4f46e5" },
  { id: "midnight", label: "Midnight", color: "#3b82f6" },
  { id: "dracula", label: "Dracula", color: "#bd93f9" },
  { id: "nord", label: "Nord", color: "#88c0d0" },
  { id: "adapta", label: "Adapta", color: "#26c6da" },
  { id: "monokai", label: "Monokai", color: "#a6e22e" },
  { id: "rosepine", label: "Rosé Pine", color: "#eb6f92" },
  { id: "slack", label: "Slack", color: "#ecb22e" },
  { id: "foxtow", label: "Foxtow", color: "#d1130d" },
  { id: "macintosh", label: "Macintosh", color: "#0000aa" },
  { id: "classic", label: "Classic", color: "#0054e3" },
];

export default function ThemeSwitcher() {
  const T = useTheme();
  const themeName = useThemeName();
  const setTheme = useSetTheme();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const currentTheme = THEMES.find((t) => t.id === themeName) || THEMES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 10px",
          borderRadius: 8,
          border: `1px solid ${T.navBorder}`,
          background: T.navBg,
          color: T.navText,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: currentTheme.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={10} color="white" strokeWidth={3} />
        </div>

        <span>{currentTheme.label}</span>

        <ChevronDown
          size={14}
          style={{
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.15s",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 180,
            padding: "8px 0", // Added vertical padding for the "THEME" header space
            borderRadius: 12,
            background: T.navBg,
            border: `1px solid ${T.navBorder}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            zIndex: 500,
          }}
        >
          <div
            style={{
              padding: "4px 14px 8px",
              fontSize: 10,
              fontWeight: 800,
              color: T.navText,
              opacity: 0.4,
              letterSpacing: "0.05em",
            }}
          >
            THEME
          </div>

          {THEMES.map((theme) => {
            const active = theme.id === themeName;

            return (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  border: "none",
                  background: active ? "rgba(255,255,255,0.05)" : "transparent",
                  color: active ? theme.color : T.navText,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: active ? "none" : `2px solid ${T.navText}33`,
                    background: active ? theme.color : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {active && <Check size={12} color="white" strokeWidth={3} />}
                </div>

                <span style={{ flex: 1, textAlign: "left" }}>
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}