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
      { id: "domains",   label: "Domain"    },
      { id: "templates", label: "Templates" },
      { id: "campaigns", label: "Campaigns" },
      { id: "sequences", label: "Sequences" },
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
        const allIds = g.items?.map(i => i.id) ?? [];
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
                color: active ? T.text : T.muted,
                fontWeight: active ? 600 : 400,
                fontSize: 12, fontFamily: "inherit",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.dim; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.muted; }}
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
                {g.items.map(item => {
                  const a = item.id === page;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setPage(item.id); setOpen(null); }}
                      style={{
                        display: "flex", alignItems: "center",
                        width: "100%", padding: "10px 16px",
                        background: a ? T.accentLow : "transparent",
                        borderLeft: a ? "2px solid " + T.accent : "2px solid transparent",
                        border: "none", cursor: "pointer",
                        color: a ? T.accent : T.text,
                        fontSize: 12, fontWeight: a ? 600 : 400,
                        textAlign: "left", fontFamily: "inherit",
                      }}
                      onMouseEnter={e => { if (!a) e.currentTarget.style.background = T.surface; }}
                      onMouseLeave={e => { if (!a) e.currentTarget.style.background = "transparent"; }}
                    >
                      {item.label}
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
