import { useEffect } from "react";
import {
  Globe, LayoutTemplate, Megaphone, GitBranch,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const SECTIONS = [
  {
    label: "Setup",
    items: [
      { id: "domains",   label: "Domain Verification", Icon: Globe },
      { id: "templates", label: "Templates",           Icon: LayoutTemplate },
    ],
  },
  {
    label: "Send",
    items: [
      { id: "campaigns", label: "Campaigns", Icon: Megaphone },
    ],
  },
  {
    label: "Automate",
    items: [
      { id: "sequences", label: "Sequences", Icon: GitBranch, soon: true },
    ],
  },
];

const W_OPEN       = 216;
const W_COLLAPSED  = 52;
const NAV_H        = 50; // must match top bar height in App.jsx

function isPageActive(itemId, page) {
  return page === itemId || page.startsWith(itemId + "/");
}

function NavList({ page, onNavigate, collapsed, forMobile }) {
  const T = useTheme();
  const slim = !forMobile && collapsed;

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
      {SECTIONS.map((section, si) => (
        <div key={section.label}>
          {slim ? (
            si > 0 && (
              <div style={{
                height: 1, background: T.border,
                margin: "8px 12px",
              }} />
            )
          ) : (
            <div style={{
              fontSize: 9, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.09em",
              padding: si === 0 ? "6px 16px 4px" : "14px 16px 4px",
            }}>
              {section.label}
            </div>
          )}

          {section.items.map(item => {
            const active = isPageActive(item.id, page);
            const { Icon } = item;
            return (
              <button
                key={item.id}
                title={slim ? item.label : undefined}
                disabled={item.soon}
                onClick={() => {
                  if (!item.soon) {
                    onNavigate(item.id);
                    if (forMobile) onNavigate("__close__");
                  }
                }}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: slim ? "9px 0" : "9px 16px",
                  justifyContent: slim ? "center" : "flex-start",
                  background: active ? T.accent + "1a" : "transparent",
                  borderLeft: active ? `2px solid ${T.accent}` : "2px solid transparent",
                  border: "none",
                  cursor: item.soon ? "default" : "pointer",
                  color: active ? T.accent : item.soon ? T.muted : T.text,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  fontFamily: "inherit",
                  textAlign: "left",
                  opacity: item.soon ? 0.7 : 1,
                  transition: "background 0.12s",
                  boxSizing: "border-box",
                }}
                onMouseEnter={e => { if (!active && !item.soon) e.currentTarget.style.background = T.card; }}
                onMouseLeave={e => { if (!active && !item.soon) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                {!slim && (
                  <>
                    <span style={{
                      flex: 1, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {item.label}
                    </span>
                    {item.soon && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: T.amber,
                        background: T.amber + "20",
                        border: "1px solid " + T.amber + "50",
                        borderRadius: 4, padding: "1px 5px",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        flexShrink: 0,
                      }}>
                        SOON
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function MarketingSidebar({
  page,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}) {
  const T = useTheme();

  useEffect(() => {
    if (!mobileOpen) return;
    const h = (e) => { if (e.key === "Escape") onMobileClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [mobileOpen, onMobileClose]);

  // Wrap onNavigate so NavList can signal mobile close
  function handleNav(id) {
    if (id === "__close__") { onMobileClose(); return; }
    onNavigate(id);
  }

  const headerStyle = {
    height: 48,
    display: "flex", alignItems: "center",
    borderBottom: "1px solid " + T.border,
    flexShrink: 0,
  };

  const toggleBtnStyle = {
    background: "none", border: "none", color: T.muted,
    cursor: "pointer", padding: 6,
    display: "flex", alignItems: "center", borderRadius: 5,
    transition: "color 0.15s, background 0.15s",
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div
        className="mktg-sidebar-desktop"
        style={{
          width: collapsed ? W_COLLAPSED : W_OPEN,
          minWidth: collapsed ? W_COLLAPSED : W_OPEN,
          height: "100%",
          background: T.surface,
          borderRight: "1px solid " + T.border,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.22s ease, min-width 0.22s ease",
          flexShrink: 0,
        }}
      >
        <div style={{
          ...headerStyle,
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 8px 0 16px",
        }}>
          {!collapsed && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.dim,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
              Marketing
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand" : "Collapse"}
            style={toggleBtnStyle}
            onMouseEnter={e => {
              e.currentTarget.style.color = T.text;
              e.currentTarget.style.background = T.card;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = T.muted;
              e.currentTarget.style.background = "transparent";
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <NavList
          page={page}
          onNavigate={handleNav}
          collapsed={collapsed}
          forMobile={false}
        />
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      <div className="mktg-sidebar-mobile">
        {/* Backdrop */}
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1400,
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.22s ease",
          }}
        />
        {/* Drawer panel */}
        <div style={{
          position: "fixed", top: NAV_H, left: 0, bottom: 0,
          width: 240, zIndex: 1500,
          background: T.surface,
          borderRight: "1px solid " + T.border,
          display: "flex", flexDirection: "column",
          boxShadow: T.shadowLg,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        }}>
          <div style={{
            ...headerStyle,
            justifyContent: "space-between",
            padding: "0 10px 0 16px",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.dim,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
              Marketing
            </span>
            <button
              onClick={onMobileClose}
              style={toggleBtnStyle}
              onMouseEnter={e => e.currentTarget.style.color = T.text}
              onMouseLeave={e => e.currentTarget.style.color = T.muted}
            >
              <X size={15} />
            </button>
          </div>

          <NavList
            page={page}
            onNavigate={handleNav}
            collapsed={false}
            forMobile={true}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mktg-sidebar-desktop { display: none !important; }
          .mktg-sidebar-mobile  { display: block; }
        }
        @media (min-width: 769px) {
          .mktg-sidebar-mobile { display: none; }
        }
      `}</style>
    </>
  );
}
