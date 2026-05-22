import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function UserChip({ user, onSignOut }) {
  const T = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 10px 5px 6px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: user.color + "30", border: "1.5px solid " + user.color + "60",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: user.color,
        }}>
          {user.avatar || user.name[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
          {user.name.split(" ")[0]}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.50)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {user.role}
        </span>
        <ChevronDown
          size={12}
          color="rgba(255,255,255,0.50)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 10, minWidth: 190, zIndex: 500,
          overflow: "hidden", boxShadow: T.shadowLg,
        }}>
          {/* Profile header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{user.name}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{user.email}</div>
          </div>

          {/* My Profile */}
          <button
            onClick={() => { setOpen(false); navigate("/profile"); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "11px 16px",
              background: "transparent", border: "none",
              borderBottom: "1px solid " + T.border,
              cursor: "pointer", fontFamily: "inherit",
              color: T.text, fontSize: 13,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <User size={14} /> My Profile
          </button>

          {/* Sign out */}
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "11px 16px",
              background: "transparent", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              color: T.red, fontSize: 13,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.red + "12")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
