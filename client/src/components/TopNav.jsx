import { useState, useRef, useEffect } from "react";
import { Globe, LayoutTemplate, Send, RefreshCw } from "lucide-react";
import T from "../theme";

// ─── Navigation items ─────────────────────────────────────────────────────────
// Items with `sections` render a grouped dropdown; items with flat `items` render as before.
const NAV = [
  { label: "Dashboard",    id: "dashboard",    viewMode: null                                       },
  { label: "All Contacts", id: "all-contacts", viewMode: "all"                                      },
  { label: "Leads",        id: "leads",        viewMode: "leads"                                    },
  { label: "Customers",    id: "customers",    viewMode: "customers"                                },
  { label: "Lost",         id: "lost",         viewMode: "lost"                                     },
  {
    label: "Marketing",
    id: "marketing",
    sections: [
      {
        label: "SETUP",
        items: [
          { id: "domains",   label: "Domain",    sub: "Verify sending domains",  badge: "Step 1", badgeColor: "#F09595", Icon: Globe,          iconBg: "rgba(93,202,165,0.15)" },
          { id: "templates", label: "Templates", sub: "Design email layouts",    badge: "Step 2", badgeColor: "#6366f1", Icon: LayoutTemplate, iconBg: "rgba(99,102,241,0.15)" },
        ],
      },
      {
        label: "SEND",
        items: [
          { id: "campaigns", label: "Campaigns", sub: "Send to contact lists",   badge: "Step 3", badgeColor: "#6366f1", Icon: Send,           iconBg: "rgba(99,102,241,0.15)" },
        ],
      },
      {
        label: "AUTOMATE",
        items: [
          { id: "sequences", label: "Sequences", sub: "Auto follow-up rules",    badge: "Soon",   badgeColor: "#5DCAA5", Icon: RefreshCw,      iconBg: "rgba(251,146,60,0.15)" },
        ],
      },
    ],
  },
  { label: "Clients", id: "clients", items: [{ id: "all-clients", label: "All Clients" }] },
];

// Collect all leaf page IDs from a nav entry (handles both sections and flat items)
function allPageIds(g) {
  if (g.sections) return g.sections.flatMap(s => s.items.map(i => i.id));
  if (g.items)    return g.items.map(i => i.id);
  return [];
}

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
        const hasDropdown = !!(g.sections || g.items);
        const vmatch = g.viewMode && g.viewMode === viewMode;
        const pmatch = !g.viewMode && (g.id === page || allPageIds(g).includes(page));
        const active  = vmatch || pmatch;
        const tabCol  =
          g.viewMode === "leads"     ? T.blue  :
          g.viewMode === "customers" ? T.green :
          g.viewMode === "lost"      ? T.red   : T.accent;

        return (
          <div key={g.id} style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (g.viewMode)    { setViewMode(g.viewMode); setPage("table"); setOpen(null); }
                else if (hasDropdown) { setOpen(open === g.id ? null : g.id); }
                else               { setPage(g.id); setViewMode("all"); setOpen(null); }
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
              {hasDropdown && <span style={{ fontSize: 8, opacity: 0.5 }}>{open === g.id ? "▲" : "▼"}</span>}
            </button>

            {/* ── Dropdown ─────────────────────────────────────────────────── */}
            {hasDropdown && open === g.id && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0,
                  background: "#1a1d26",
                  border: "0.5px solid rgba(255,255,255,0.10)",
                  borderRadius: 10, minWidth: g.sections ? 260 : 160,
                  zIndex: 400, overflow: "hidden",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                }}
              >
                {/* ── Sectioned dropdown (Marketing) ───────────────────────── */}
                {g.sections && g.sections.map((section, si) => (
                  <div key={section.label}>
                    {si > 0 && <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />}
                    <div style={{
                      padding: "10px 14px 4px",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                    }}>
                      {section.label}
                    </div>
                    {section.items.map(item => {
                      const a = item.id === page;
                      const { Icon, iconBg } = item;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setPage(item.id); setOpen(null); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            width: "100%", padding: "9px 14px",
                            background: a ? "rgba(93,202,165,0.07)" : "transparent",
                            border: "none", cursor: "pointer",
                            textAlign: "left", fontFamily: "inherit",
                          }}
                          onMouseEnter={e => { if (!a) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { if (!a) e.currentTarget.style.background = "transparent"; }}
                        >
                          {/* Icon container */}
                          <div style={{
                            width: 34, height: 34, borderRadius: 8,
                            background: iconBg || "rgba(255,255,255,0.07)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {Icon && <Icon size={16} color="rgba(255,255,255,0.7)" />}
                          </div>

                          {/* Label + subtitle */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: a ? "#fff" : "rgba(255,255,255,0.8)", lineHeight: 1.2 }}>
                              {item.label}
                            </div>
                            {item.sub && (
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                                {item.sub}
                              </div>
                            )}
                          </div>

                          {/* Step badge */}
                          {item.badge && (
                            <span style={{
                              padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                              background: item.badgeColor + "22", color: item.badgeColor,
                              border: `1px solid ${item.badgeColor}44`,
                              flexShrink: 0,
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* ── Flat dropdown (Clients) ──────────────────────────────── */}
                {!g.sections && g.items && g.items.map(item => {
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
