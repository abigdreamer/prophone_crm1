import { useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { LayoutGrid, FolderOpen, Users, ChevronRight } from "lucide-react";

const ITEMS = [
  { id: "contact_fields", label: "Contact Fields", Icon: LayoutGrid },
  { id: "clients",        label: "Clients",        Icon: FolderOpen },
  { id: "user_settings",  label: "User Settings",  Icon: Users      },
];

export default function SettingsSubNav() {
  const T = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "contact_fields";

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
        <span>Settings</span>
        <ChevronRight size={10} style={{ opacity: 0.5 }} />
      </div>

      <div style={{ width: 1, height: 18, background: T.border, marginRight: 6, flexShrink: 0 }} />

      {ITEMS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setSearchParams({ tab: id })}
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
