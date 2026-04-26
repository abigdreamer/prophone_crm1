import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Megaphone, Mail, Globe, Settings } from "lucide-react";

const H = {
  text:   "#ffffff",
  sub:    "rgba(255,255,255,0.65)",
  hover:  "rgba(255,255,255,0.08)",
  active: "rgba(255,255,255,0.14)",
};

const NAV = [
  { label: "Dashboard",     path: "/dashboard",      icon: LayoutDashboard },
  { label: "Contacts",      path: "/contacts",        icon: Users           },
  { label: "Marketing",     path: "/marketing",       icon: Megaphone       },
  { label: "Template",      path: "/email-templates", icon: Mail            },
  { label: "Domains",       path: "/domains",         icon: Globe           },
  { label: "Settings",      path: "/settings",        icon: Settings        },
];

function NavBtn({ path, icon: Icon, label }) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink
      to={path}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px",
        background: isActive ? H.active : hov ? H.hover : "transparent",
        borderRadius: 6,
        color: isActive ? H.text : hov ? H.text : H.sub,
        fontWeight: isActive ? 600 : 400,
        fontSize: 13, fontFamily: "inherit",
        textDecoration: "none",
        transition: "background 0.12s, color 0.12s",
        whiteSpace: "nowrap",
      })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Icon size={13} />
      {label}
    </NavLink>
  );
}

export default function TopNav() {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 1 }}>
      {NAV.map(g => <NavBtn key={g.path} {...g} />)}
    </nav>
  );
}
