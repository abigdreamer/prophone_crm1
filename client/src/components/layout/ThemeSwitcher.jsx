import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTheme, useThemeName, useSetTheme } from "../../context/ThemeContext";

const THEMES = [
  { id: "dark",  label: "Default" },
  { id: "light", label: "Light"   },
];

export default function ThemeSwitcher() {
  const T         = useTheme();
  const themeName = useThemeName();
  const setTheme  = useSetTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = THEMES.find(t => t.id === themeName) || THEMES[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 8px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
          color: T.navText,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: "#f59e0b",
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{current.label}</span>
        <ChevronDown
          size={11}
          style={{
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 10, minWidth: 170, zIndex: 600,
          boxShadow: T.shadowLg, padding: "5px 0",
          overflow: "hidden",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: T.muted,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "6px 14px 4px",
          }}>
            Theme
          </div>
          {THEMES.map(theme => {
            const isActive = theme.id === themeName;
            return (
              <button
                key={theme.id}
                onClick={() => { setTheme(theme.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 14px",
                  background: "transparent", border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  color: isActive ? T.accent : T.text,
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Circle indicator */}
                <span style={{
                  width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? "#f59e0b" : "transparent",
                  border: isActive ? "none" : "1.5px solid " + T.muted,
                }}>
                  {isActive && <Check size={8} color="#fff" strokeWidth={3} />}
                </span>
                {theme.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
