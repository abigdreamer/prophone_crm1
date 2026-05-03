import { useState, useRef, useEffect } from "react";
import T from "../theme";

const NAV = [
  { label: "Dashboard", id: "dashboard" },
  { label: "Contacts",  id: "contacts"  },
  {
    label: "Marketing", id: "marketing",
    items: [
      { id: "domains",   label: "Domain"    },
      { id: "templates", label: "Templates" },
      { id: "campaigns", label: "Campaigns" },
      { id: "sequences", label: "Sequences" },
    ],
  },
  { label: "Clients", id: "clients", items: [{ id: "all-clients", label: "All Clients" }] },
];

export default function TopNav({ page, viewMode, setPage, setViewMode }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 1 }}>
      {NAV.map(g => {
        const hasDropdown = !!g.items?.length;
        const allIds = g.items?.map(i => i.id) ?? [];

        let active = false;
        if (g.id === "dashboard") active = page === "dashboard";
        else if (g.id === "contacts") active = page === "table";
        else if (hasDropdown) active = allIds.includes(page);

        return (
          <div key={g.id} style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (g.id === "contacts") { setPage("table"); setOpen(null); }
                else if (hasDropdown)    setOpen(open === g.id ? null : g.id);
                else                    { setPage(g.id); setOpen(null); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 10px",
                background: active ? T.accentLow : "transparent",
                border: "1px solid " + (active ? T.accent + "60" : "transparent"),
                borderRadius: 6, cursor: "pointer",
                color: active ? T.accent : T.muted,
                fontWeight: active ? 700 : 400,
                fontSize: 11, fontFamily: "inherit",
              }}
            >
              {g.label}
              {hasDropdown && <span style={{ fontSize: 8, opacity: 0.5 }}>{open === g.id ? "▲" : "▼"}</span>}
            </button>

            {hasDropdown && open === g.id && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                background: T.card, border: "1px solid " + T.border,
                borderRadius: 8, minWidth: 160, zIndex: 400,
                overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.7)",
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
