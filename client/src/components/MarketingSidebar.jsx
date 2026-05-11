import { useEffect } from "react";
import {
  Globe,
  LayoutTemplate,
  Megaphone,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { id: "domains", label: "Domain Verification", Icon: Globe },
  { id: "templates", label: "Templates", Icon: LayoutTemplate },
  { id: "campaigns", label: "Campaigns", Icon: Megaphone },
  { id: "sequences", label: "Sequences", Icon: GitBranch },
];

const W_OPEN = 216;
const W_COLLAPSED = 52;
const NAV_H = 50;

function isPageActive(itemId, page) {
  return page === itemId || page.startsWith(itemId + "/");
}

function NavList({ page, onNavigate, collapsed, forMobile }) {
  const T = useTheme();
  const slim = !forMobile && collapsed;

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
      {NAV_ITEMS.map((item) => {
        const active = isPageActive(item.id, page);
        const { Icon } = item;

        return (
          <button
            key={item.id}
            title={slim ? item.label : undefined}
            onClick={() => {
              onNavigate(item.id);
              if (forMobile) onNavigate("__close__");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: slim ? "10px 0" : "11px 18px",
              justifyContent: slim ? "center" : "flex-start",
              background: active ? T.accent + "1a" : "transparent",
              border: "none",
              cursor: "pointer",
              color: active ? T.accent : T.text,
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              fontFamily: "inherit",
              textAlign: "left",
              transition: "background 0.12s",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = T.card;
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />

            {!slim && (
              <span
                style={{
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </span>
            )}
          </button>
        );
      })}
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
    const h = (e) => {
      if (e.key === "Escape") onMobileClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [mobileOpen, onMobileClose]);

  function handleNav(id) {
    if (id === "__close__") {
      onMobileClose();
      return;
    }
    onNavigate(id);
  }

  const toggleBtnStyle = {
    background: "none",
    border: "none",
    color: T.muted,
    cursor: "pointer",
    padding: 6,
    display: "flex",
    alignItems: "center",
    borderRadius: 6,
  };

  return (
    <>
      {/* Desktop sidebar */}
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
    overflow: "visible", // ✅ IMPORTANT
    transition: "width 0.22s ease, min-width 0.22s ease",
    flexShrink: 0,
    position: "relative",
    zIndex: 9999, // ✅ sidebar itself also above
  }}
>
  {/* Middle Line */}
  <div
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: 1,
      background: T.border,
      opacity: 0.7,
      zIndex: 1,
    }}
  />

  {/* Collapse Button */}
  <button
    onClick={onToggleCollapse}
    title={collapsed ? "Expand" : "Collapse"}
    style={{
      ...toggleBtnStyle,
      position: "absolute",
      top: 18,
      right: -14,
      width: 28,
      height: 28,
      borderRadius: 999,
      background: T.surface,
      border: "1px solid " + T.border,
      boxShadow: T.shadowMd,
      justifyContent: "center",
      zIndex: 99999, // ✅ SUPER HIGH
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = T.text;
      e.currentTarget.style.background = T.card;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = T.muted;
      e.currentTarget.style.background = T.surface;
    }}
  >
    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
  </button>

  <NavList
    page={page}
    onNavigate={handleNav}
    collapsed={collapsed}
    forMobile={false}
  />
</div>

      {/* Mobile drawer */}
      <div className="mktg-sidebar-mobile">
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1400,
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.22s ease",
          }}
        />

        <div
          style={{
            position: "fixed",
            top: NAV_H,
            left: 0,
            bottom: 0,
            width: 240,
            zIndex: 1500,
            background: T.surface,
            borderRight: "1px solid " + T.border,
            display: "flex",
            flexDirection: "column",
            boxShadow: T.shadowLg,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          }}
        >
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 10px",
              borderBottom: "1px solid " + T.border,
              flexShrink: 0,
            }}
          >
            <button
              onClick={onMobileClose}
              style={toggleBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
            >
              <X size={15} />
            </button>
          </div>

          <NavList page={page} onNavigate={handleNav} collapsed={false} forMobile={true} />
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