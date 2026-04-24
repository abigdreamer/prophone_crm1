import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import Avatar from "./ui/Avatar";
import T from "../theme";

const HDR = T.header;

export default function ProfileDropdown({ user, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const firstName = (user?.name || "User").split(" ")[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, padding: "5px 10px 5px 6px",
          cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.12s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
      >
        <Avatar user={user} size={22} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1 }}>{firstName}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginLeft: 1 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 10, minWidth: 200, zIndex: 700,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: HDR, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <Avatar user={user} size={36} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3, textTransform: "capitalize" }}>{user?.role}</div>
            </div>
          </div>

          <div style={{ padding: "6px" }}>
            <MenuBtn icon={<User size={13} />} label="My Profile" onClick={() => { onProfile(); setOpen(false); }} />
            <MenuBtn icon={<LogOut size={13} />} label="Logout" onClick={() => { onLogout(); setOpen(false); }} danger />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }) {
  const [hov, setHov] = useState(false);
  const color = danger ? "#dc2626" : "#1e293b";
  const hovBg = danger ? "#fef2f2" : "#f8fafc";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "9px 10px",
        background: hov ? hovBg : "transparent",
        border: "none", borderRadius: 6,
        cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 500, color,
        textAlign: "left", transition: "background 0.1s",
      }}
    >
      <span style={{ color, opacity: 0.8 }}>{icon}</span>
      {label}
    </button>
  );
}
