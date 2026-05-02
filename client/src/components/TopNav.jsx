import { useState, useRef, useEffect } from "react";
import T from "../theme";

// ─── Navigation items ─────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",    id: "dashboard",    viewMode: null                                          },
  { label: "All Contacts", id: "all-contacts", viewMode: "all"                                         },
  { label: "Leads",        id: "leads",        viewMode: "leads"                                       },
  { label: "Customers",    id: "customers",    viewMode: "customers"                                   },
  { label: "Lost",         id: "lost",         viewMode: "lost"                                        },
  { label: "Marketing",    id: "marketing",    items: [{ id: "campaigns", label: "Campaigns" }, { id: "sequences", label: "Sequences" }] },
  { label: "Clients",      id: "clients",      items: [{ id: "all-clients", label: "All Clients" }]    },
];

// ─── Top nav bar ──────────────────────────────────────────────────────────────
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
        const vmatch = g.viewMode && g.viewMode === viewMode;
        const pmatch = !g.viewMode && (g.id === page || (g.items || []).some(i => i.id === page));
        const active  = vmatch || pmatch;
        const tabCol  =
          g.viewMode === "leads"     ? T.blue  :
          g.viewMode === "customers" ? T.green :
          g.viewMode === "lost"      ? T.red   : T.accent;
        const hasItems = (g.items || []).length > 0;

        return (
          <div key={g.id} style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (g.viewMode) { setViewMode(g.viewMode); setPage("table"); setOpen(null); }
                else if (hasItems) { setOpen(open === g.id ? null : g.id); }
                else { setPage(g.id); setViewMode("all"); setOpen(null); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 10px",
                background: active ? (g.viewMode ? tabCol + "18" : T.accentLow) : "transparent",
                border: "1px solid " + (active ? (g.viewMode ? tabCol + "60" : T.accent + "60") : "transparent"),
                borderRadius: 6, cursor: "pointer",
                color: active ? (g.viewMode ? tabCol : T.accent) : T.muted,
                fontWeight: active ? 700 : 400,
                fontSize: 11, fontFamily: "inherit",
              }}
            >
              {g.viewMode === "leads"     && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue,  display: "inline-block" }} />}
              {g.viewMode === "customers" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />}
              {g.viewMode === "lost"      && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red,   display: "inline-block" }} />}
              {g.label}
              {hasItems && <span style={{ fontSize: 8, opacity: 0.5 }}>{open === g.id ? "▲" : "▼"}</span>}
            </button>

            {/* Dropdown */}
            {hasItems && open === g.id && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0,
                  background: T.card, border: "1px solid " + T.border,
                  borderRadius: 8, minWidth: 160, zIndex: 400,
                  overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.7)",
                }}
              >
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
