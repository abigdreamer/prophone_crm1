import { useState, useRef, useEffect } from "react";
import { Pill } from "./ui/Pill";
import { useTheme } from "../context/ThemeContext";
import STATIC_CLIENTS from "../data/clients";
import fmt from "../utils/format";
import { getClients } from "../services/api";

export default function PoolSwitcher({
  pool,
  clientId,
  onSwitchPool,
  onSwitchClient,
  contactCounts = { prospect: 0, clients: {} }
}) {
  const T = useTheme();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState(STATIC_CLIENTS);
  const ref = useRef(null);

  // Dynamic active color based on context
  const client = clients.find(c => c.id === clientId) || clients[0] || STATIC_CLIENTS[0];
  const activeCol = pool === "prospect" ? T.accent : (client?.color || T.accent);

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) getClients().then(setClients).catch(() => {});
  }, [open]);

  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger Button - Blended with Nav */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.05)", // Transparent blend
          border: `1px solid ${T.navBorder}`, // Match Nav Border
          borderRadius: 7,
          padding: "5px 10px 5px 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          minWidth: 190,
          transition: "all 0.15s ease",
          color: T.navText
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeCol }} />

        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.navText, lineHeight: 1 }}>
            {pool === "prospect" ? "Prospect Pool" : client.name}
          </div>
          <div style={{ fontSize: 9, color: T.navMuted, marginTop: 1 }}>
            {pool === "prospect" 
              ? `${fmt.num(contactCounts.prospect)} leads` 
              : `${contactCounts.clients[clientId] || 0} leads · ${client.plan}`}
          </div>
        </div>

        <span style={{ fontSize: 9, color: T.navMuted, opacity: 0.6 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown Menu - FIX: Use T.navBg to avoid white blocks */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            background: T.navBg, // MATCH NAV BACKGROUND
            border: `1px solid ${T.navBorder}`, // MATCH NAV BORDER
            borderRadius: 10,
            minWidth: 280,
            zIndex: 500,
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(0,0,0,0.4)"
          }}
        >
          <div style={{ padding: "8px 12px 6px", borderBottom: `1px solid ${T.navBorder}` }}>
            <div
              style={{
                fontSize: 9,
                color: T.navMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 700,
                marginBottom: 7
              }}
            >
              GeniusAI Lead Pools
            </div>

            <button
              onClick={() => { onSwitchPool("prospect"); setOpen(false); }}
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
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left"
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: T.accent + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.accent
                }}
              >
                P
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.navText }}>
                  Prospect Pool
                </div>
                <div style={{ fontSize: 9, color: T.navMuted }}>
                  {fmt.num(contactCounts.prospect)} leads · {clients.length} clients
                </div>
              </div>

              <Pill color={T.accent} small>
                GeniusAI
              </Pill>
            </button>
          </div>

          <div style={{ padding: "5px 12px 8px" }}>
            <div
              style={{
                fontSize: 9,
                color: T.navMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 700,
                marginBottom: 6
              }}
            >
              Client Accounts
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {clients.map(c => {
                const active = pool === "client" && c.id === clientId;
                const leads = contactCounts.clients[c.id] || 0;

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSwitchPool("client");
                      onSwitchClient(c.id);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      marginBottom: 3,
                      background: active ? "rgba(255,255,255,0.08)" : "transparent",
                      border: active ? `1px solid ${T.accent}40` : "1px solid transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: T.navText
                    }}
                    onMouseEnter={e => {
                      if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={e => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 5,
                        background: c.color + "20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: c.color,
                        flexShrink: 0
                      }}
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 9, color: T.navMuted }}>
                        {leads} leads · {c.plan}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 600, color: T.green || "#10b981" }}>
                      {fmt.mrr(c.mrr)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}