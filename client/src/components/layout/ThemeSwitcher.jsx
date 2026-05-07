import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTheme, useThemeName, useSetTheme } from "../../context/ThemeContext";
import { usePool } from "../../context/PoolContext"; 
import CLIENTS from "../../data/clients";

const THEMES = [
  { id: "dark",  label: "Default" },
  { id: "light", label: "Light"   },
  { id: "polar", label: "Polar"   },
];

export default function ThemeSwitcher() {
  const T         = useTheme();
  const themeName = useThemeName();
  const setTheme  = useSetTheme();
  const { pool, clientId } = usePool(); 
  
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = THEMES.find(t => t.id === themeName) || THEMES[0];

  // Dynamic color for the indicator based on pool/client context
  const client = CLIENTS.find(c => c.id === clientId);
  const activeCol = pool === "prospect" ? T.accent : (client?.color || T.accent);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid " + T.navBorder,
          borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
          color: T.navText,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      >
        {/* Status dot uses client/pool active color */}
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: activeCol,
          boxShadow: `0 0 8px ${activeCol}60`
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

      {/* Dropdown - Uses Nav Colors to avoid white blocks */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: T.navBg, 
          border: "1px solid " + T.navBorder,
          borderRadius: 10, minWidth: 150, zIndex: 600,
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)", 
          padding: "5px 0",
          overflow: "hidden",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: T.navMuted,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "8px 14px 4px",
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
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent", 
                  border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  color: isActive ? activeCol : T.navText,
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Circle indicator uses client/pool active color when selected */}
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? activeCol : "transparent",
                  border: isActive ? "none" : "1.5px solid " + T.navBorder,
                }}>
                  {isActive && <Check size={10} color="#fff" strokeWidth={4} />}
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