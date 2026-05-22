import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Pill } from "./ui/Pill";
import { useTheme } from "../context/ThemeContext";
import { useClients } from "../context/ClientsContext";
import { Plus, Settings2 } from "lucide-react";
import fmt from "../utils/format";

export default function PoolSwitcher({
  pool,
  clientId,
  onSwitchPool,
  onSwitchClient,
  contactCounts = { prospect: 0, clients: {} }
}) {
  const T = useTheme();
  const navigate = useNavigate();
  const { clients } = useClients();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const client = clients.find(c => c.id === clientId) || clients[0] || null;
  const activeCol = pool === "prospect" ? T.accent : (client?.color || T.accent);

  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.pool-dropdown-portal')) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX
      });
    }
    setOpen(!open);
  };

  const handleAction = (e, targetId, action) => {
    e.stopPropagation();
    setOpen(false);
    navigate(`/settings?tab=clients&id=${targetId}&action=${action}`);
  };

  const handleAddNewClient = () => {
    setOpen(false);
    navigate("/settings?tab=clients&action=add");
  };

  const dropdownMenu = (
    <div
      className="pool-dropdown-portal"
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        background: T.navBg,
        border: `1px solid ${T.navBorder}`,
        borderRadius: 10,
        minWidth: 280,
        zIndex: 99999,
        overflow: "hidden",
        boxShadow: "0 12px 30px rgba(0,0,0,0.4)"
      }}
    >
      <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${T.navBorder}` }}>
        <div style={{ fontSize: 9, color: T.navMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7 }}>
          GeniusAI Lead Pools
        </div>
        {/* PROSPECT POOL - Information Only (Not Clickable) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 10px",
            borderRadius: 7,
            background: pool === "prospect" ? "rgba(255,255,255,0.08)" : "transparent",
            border: pool === "prospect" ? `1px solid ${T.accent}40` : "1px solid transparent",
            marginBottom: 4,
            cursor: "default"
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 6, background: T.accent + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.accent }}>P</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.navText }}>Prospect Pool</div>
            <div style={{ fontSize: 9, color: T.navMuted }}>{fmt.num(contactCounts.prospect)} leads · {clients.length} clients</div>
          </div>
          <Pill color={T.accent} small>GeniusAI</Pill>
        </div>
      </div>

      <div style={{ padding: "5px 12px 5px" }}>
        <div style={{ fontSize: 9, color: T.navMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 6 }}>
          Client Accounts
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {clients.map(c => {
            const active = pool === "client" && c.id === clientId;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3 }}>
                <button
                  onClick={() => { onSwitchPool("client"); onSwitchClient(c.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "7px 10px", borderRadius: 7,
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    border: active ? `1px solid ${T.accent}40` : "1px solid transparent",
                    cursor: "pointer", fontFamily: "inherit", color: T.navText, textAlign: "left"
                  }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 5, background: c.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: c.color, flexShrink: 0 }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: T.navMuted }}>{contactCounts.clients[c.id] || 0} leads · {c.plan}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.green || "#10b981", marginRight: 4 }}>{fmt.mrr(c.mrr)}</div>
                </button>
                <button
                  onClick={(e) => handleAction(e, c.id, "edit")}
                  style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: T.navMuted, transition: '0.2s' }}
                >
                  <Settings2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${T.navBorder}`, background: "rgba(0,0,0,0.15)" }}>
        <button
          onClick={handleAddNewClient}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "9px",
            borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px dashed ${T.navBorder}`,
            color: T.navText, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
          }}
        >
          <Plus size={14} style={{ color: T.accent }} />
          Add New Client
        </button>
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={handleToggle}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${T.navBorder}`,
          borderRadius: 7, padding: "5px 10px 5px 8px",
          cursor: "pointer", fontFamily: "inherit", minWidth: 190,
          transition: "all 0.15s ease", color: T.navText
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeCol }} />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.navText, lineHeight: 1 }}>
            {pool === "prospect" ? "Prospect Pool" : (client?.name || "Client")}
          </div>
          <div style={{ fontSize: 9, color: T.navMuted, marginTop: 1 }}>
            {pool === "prospect"
              ? `${fmt.num(contactCounts.prospect)} leads`
              : `${contactCounts.clients[clientId] || 0} leads · ${client?.plan || ""}`}
          </div>
        </div>
        <span style={{ fontSize: 9, color: T.navMuted, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && createPortal(dropdownMenu, document.body)}
    </div>
  );
}