import { useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { BarChart2, Mail, ChevronRight } from "lucide-react";

const ITEMS = [
  { id: "newsletter", label: "Newsletter",       Icon: Mail      },
  { id: "posthog",    label: "Posthog Analytics", Icon: BarChart2 },
];

export default function ReportsSubNav() {
  const T = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "newsletter";

  return (
    <div style={{
      flexShrink: 0, height: 44,
      background: T.surface, borderBottom: "1px solid " + T.border,
      display: "flex", alignItems: "center", padding: "0 18px", gap: 4,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginRight: 10, flexShrink: 0,
      }}>
        <span style={{ opacity: 0.6 }}>◁</span>
        <span>Reports</span>
        <ChevronRight size={10} style={{ opacity: 0.5 }} />
      </div>

      <div style={{ width: 1, height: 18, background: T.border, marginRight: 6, flexShrink: 0 }} />

      {ITEMS.map(({ id, label, Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => setSearchParams({ section: id })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 13px", borderRadius: 7, border: "none",
              background: active ? T.accent : "transparent",
              color: active ? "#fff" : T.dim,
              fontSize: 12, fontWeight: active ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              transition: "background 0.14s, color 0.14s",
            }}
            onMouseEnter={e => { if (active) return; e.currentTarget.style.background = T.accent + "14"; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { if (active) return; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; }}
          >
            <Icon size={13} strokeWidth={active ? 2.3 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
