import { useTheme } from "../context/ThemeContext";
import { Globe, LayoutTemplate, Megaphone, GitBranch, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  { id: "domains",   label: "Domain Verification", Icon: Globe         },
  { id: "templates", label: "Templates",            Icon: LayoutTemplate },
  { id: "campaigns", label: "Campaigns",            Icon: Megaphone     },
  { id: "sequences", label: "Sequences",            Icon: GitBranch, soon: true },
];

export default function MarketingSubNav({ page, onNavigate }) {
  const T = useTheme();

  return (
    <div style={{
      flexShrink: 0,
      height: 44,
      background: T.surface,
      borderBottom: "1px solid " + T.border,
      display: "flex",
      alignItems: "center",
      padding: "0 18px",
      gap: 4,
      overflowX: "auto",
    }}>
      {/* Breadcrumb label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginRight: 10, flexShrink: 0,
      }}>
        <span style={{ opacity: 0.6 }}>◁</span>
        <span>Marketing</span>
        <ChevronRight size={10} style={{ opacity: 0.5 }} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: T.border, marginRight: 6, flexShrink: 0 }} />

      {/* Tab items */}
      {NAV_ITEMS.map(({ id, label, Icon, soon }) => {
        const active = page === id || page.startsWith(id + "/");
        return (
          <button
            key={id}
            onClick={() => !soon && onNavigate(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 13px", borderRadius: 7,
              border: active ? "none" : "1px solid transparent",
              background: active ? T.accent : "transparent",
              color: active ? "#fff" : soon ? T.muted : T.dim,
              fontSize: 12, fontWeight: active ? 700 : 500,
              cursor: soon ? "default" : "pointer",
              fontFamily: "inherit", flexShrink: 0,
              transition: "background 0.14s, color 0.14s",
              position: "relative",
              opacity: soon ? 0.55 : 1,
            }}
            onMouseEnter={e => {
              if (active || soon) return;
              e.currentTarget.style.background = T.accent + "14";
              e.currentTarget.style.color = T.text;
            }}
            onMouseLeave={e => {
              if (active || soon) return;
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.dim;
            }}
            title={soon ? "Coming soon" : label}
          >
            <Icon size={13} strokeWidth={active ? 2.3 : 1.8} />
            <span>{label}</span>
            {soon && (
              <span style={{
                fontSize: 8, fontWeight: 800, letterSpacing: "0.05em",
                background: T.muted + "30", color: T.muted,
                borderRadius: 4, padding: "1px 5px", marginLeft: 2,
              }}>
                SOON
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
