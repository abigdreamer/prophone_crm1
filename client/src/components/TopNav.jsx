import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Users, Megaphone, FolderOpen,
  BarChart2, Settings, ChevronDown,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const NAV = [
  { label: "Dashboard", id: "dashboard", Icon: LayoutDashboard },
  { label: "Contacts",  id: "contacts",  Icon: Users            },
  {
    label: "Marketing", id: "marketing", Icon: Megaphone,
    items: [
      { group: "Setup" },
      { id: "domains",   label: "Domain verification" },
      { id: "templates", label: "Templates" },
      { group: "Send" },
      { id: "campaigns", label: "Campaigns" },
      { group: "Automate" },
      { id: "sequences", label: "Sequences", soon: true },
    ],
  },
  { label: "Clients",  id: "clients",  Icon: FolderOpen },
  { label: "Reports",  id: "reports",  Icon: BarChart2  },
  { label: "Settings", id: "settings", Icon: Settings   },
];

export default function TopNav({ page, viewMode, setPage, setViewMode }) {
  const T = useTheme();
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "stretch", height: "100%", gap: 0 }}>
      {NAV.map(g => {
        const hasDropdown = !!g.items?.length;
        const allIds = g.items?.filter(i => !i.group).map(i => i.id) ?? [];
        const Icon = g.Icon;

        let active = false;
        if (g.id === "dashboard") active = page === "dashboard";
        else if (g.id === "contacts") active = page === "contacts";
        else if (hasDropdown) active = allIds.includes(page);
        else active = page === g.id;

        return (
          <div key={g.id} style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
            <button
              onClick={() => {
                if (g.id === "contacts") { setPage("contacts"); setOpen(null); }
                else if (hasDropdown)    setOpen(open === g.id ? null : g.id);
                else                    { setPage(g.id); setOpen(null); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 12px",
                background: "transparent",
                border: "none",
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                borderTop: "2px solid transparent",
                cursor: "pointer",
                color: active ? T.navText : T.navMuted,
                fontWeight: active ? 600 : 400,
                fontSize: 12, fontFamily: "inherit",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.navDim; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.navMuted; }}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {g.label}
              {hasDropdown && (
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  style={{
                    opacity: 0.5,
                    transform: open === g.id ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              )}
            </button>

            {hasDropdown && open === g.id && (
              <div style={{
                position: "absolute", top: "calc(100% + 2px)", left: 0,
                background: T.card, border: "1px solid " + T.border,
                borderRadius: 8, minWidth: 160, zIndex: 400,
                overflow: "hidden", boxShadow: T.shadowLg,
              }}>
                {g.items.map((item, idx) => {
                  if (item.group) {
                    return (
                      <div key={item.group + idx} style={{
                        fontSize: 9, fontWeight: 700, color: T.muted,
                        textTransform: "uppercase", letterSpacing: "0.09em",
                        padding: idx === 0 ? "8px 16px 4px" : "12px 16px 4px",
                      }}>
                        {item.group}
                      </div>
                    );
                  }
                  const a = item.id === page;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { if (!item.soon) { setPage(item.id); setOpen(null); } }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "9px 16px",
                        background: a ? T.accentLow : "transparent",
                        borderLeft: a ? "2px solid " + T.accent : "2px solid transparent",
                        border: "none", cursor: item.soon ? "default" : "pointer",
                        color: a ? T.accent : item.soon ? T.muted : T.text,
                        fontSize: 12, fontWeight: a ? 600 : 400,
                        textAlign: "left", fontFamily: "inherit",
                        opacity: item.soon ? 0.75 : 1,
                      }}
                      onMouseEnter={e => { if (!a && !item.soon) e.currentTarget.style.background = T.surface; }}
                      onMouseLeave={e => { if (!a && !item.soon) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{item.label}</span>
                      {item.soon && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, color: T.amber,
                          background: T.amber + "20", border: "1px solid " + T.amber + "50",
                          borderRadius: 4, padding: "1px 5px", letterSpacing: "0.06em",
                          textTransform: "uppercase", flexShrink: 0,
                        }}>
                          SOON
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
