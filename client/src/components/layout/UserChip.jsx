import { useState, useEffect, useRef } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import T from "../../theme";

export default function UserChip({ user, onSignOut }) {
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
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderHi)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: user.color + "30", border: "1.5px solid " + user.color + "60",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: user.color,
        }}>
          {user.avatar || user.name[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
          {user.name.split(" ")[0]}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: T.muted,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {user.role}
        </span>
        <ChevronDown size={12} color={T.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 8, minWidth: 150, zIndex: 500,
          overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.7)",
        }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid " + T.border }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{user.name}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "10px 14px",
              background: "transparent", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              color: T.red, fontSize: 12,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.red + "12")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
