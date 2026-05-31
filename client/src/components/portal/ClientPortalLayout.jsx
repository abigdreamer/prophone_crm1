import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { LayoutDashboard, Users, Mail, BarChart2, User, LogOut, Building2, ChevronRight } from "lucide-react";
import ThemeSwitcher from "../layout/ThemeSwitcher";

const NAV_ITEMS = [
  { path: "/portal/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { path: "/portal/leads",     label: "My Leads",   icon: Users            },
  { path: "/portal/campaigns", label: "Campaigns",  icon: Mail             },
  { path: "/portal/reports",   label: "Reports",    icon: BarChart2        },
  { path: "/portal/profile",   label: "Profile",    icon: User             },
];

export default function ClientPortalLayout({ clientUser, onSignOut, children }) {
  const T = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const activeColor = clientUser?.clientColor || "#6366f1";

  function handleSignOut() {
    onSignOut();
    navigate("/client-login", { replace: true });
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: T.bg, color: T.text,
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", fontSize: 13,
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        background: T.surface, borderRight: "1px solid " + T.border,
      }}>
        {/* Brand */}
        <div style={{
          height: 50, flexShrink: 0, padding: "0 16px",
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid " + T.border,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: activeColor, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff",
            boxShadow: `0 2px 6px ${activeColor}44`,
          }}>
            {(clientUser?.clientName || "C").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {clientUser?.clientName || "Client Portal"}
            </div>
            <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Client Portal
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + "/");
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 7, textDecoration: "none",
                  background: active ? activeColor + "18" : "transparent",
                  color: active ? activeColor : T.dim,
                  fontWeight: active ? 700 : 500,
                  transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; } }}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                <span style={{ fontSize: 12 }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid " + T.border }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 10px", borderRadius: 7,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: activeColor + "22", border: "1px solid " + activeColor + "44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: activeColor,
            }}>
              {(clientUser?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clientUser?.name || "Client User"}
              </div>
              <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clientUser?.username}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 7, background: "none",
              border: "none", cursor: "pointer", color: T.muted, fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", marginTop: 2,
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.muted; }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          height: 50, flexShrink: 0,
          background: T.navBg || T.surface, borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 10,
        }}>
          <Building2 size={15} color={T.muted} />
          <span style={{ fontSize: 12, color: T.muted }}>
            {clientUser?.clientName}
          </span>
          <ChevronRight size={12} color={T.border} />
          <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
            {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || "Portal"}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              padding: "3px 10px", borderRadius: 20,
              background: activeColor + "18", border: "1px solid " + activeColor + "30",
              fontSize: 10, fontWeight: 700, color: activeColor, letterSpacing: "0.05em",
            }}>
              Read Only
            </div>
            <ThemeSwitcher />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
