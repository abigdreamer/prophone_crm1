import { useState, useRef, useEffect } from "react";
import { Pill } from "./ui/Pill";
import T from "../theme";
import CLIENTS from "../data/clients";
import { PROSPECTS, CLIENT_DATA } from "../data/contacts";
import fmt from "../utils/format";

// ─── Pool / client switcher dropdown ─────────────────────────────────────────
export default function PoolSwitcher({ pool, clientId, onSwitchPool, onSwitchClient }) {
  const [open, setOpen] = useState(false);
  const ref    = useRef(null);
  const client = CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
  const col    = pool === "prospect" ? T.accent : client.color;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 7, padding: "5px 10px 5px 8px",
          cursor: "pointer", fontFamily: "inherit", minWidth: 190,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = col)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1 }}>
            {pool === "prospect" ? "Prospect Pool" : client.name}
          </div>
          <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>
            {pool === "prospect"
              ? fmt.num(PROSPECTS.length) + " prospects"
              : (CLIENT_DATA[clientId]?.length || 0) + " leads · " + client.plan}
          </div>
        </div>
        <span style={{ fontSize: 9, color: T.muted }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            background: T.card, border: "1px solid " + T.border,
            borderRadius: 10, minWidth: 280, zIndex: 500,
            overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          }}
        >
          {/* Prospect Pool */}
          <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid " + T.border }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7 }}>
              GeniusAI Lead Pools
            </div>
            <button
              onClick={() => { onSwitchPool("prospect"); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 10px", borderRadius: 7,
                background: pool === "prospect" ? T.accent + "14" : "transparent",
                border: pool === "prospect" ? "1px solid " + T.accent + "40" : "1px solid transparent",
                cursor: "pointer", fontFamily: "inherit", marginBottom: 4,
              }}
              onMouseEnter={e => { if (pool !== "prospect") e.currentTarget.style.background = T.surface; }}
              onMouseLeave={e => { if (pool !== "prospect") e.currentTarget.style.background = "transparent"; }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: T.accent + "20", border: "1px solid " + T.accent + "40",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: T.accent,
                }}
              >
                P
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: pool === "prospect" ? 700 : 500, color: pool === "prospect" ? T.accent : T.text }}>
                  Prospect Pool
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>GeniusAI pipeline · {fmt.num(PROSPECTS.length)} leads</div>
              </div>
              {pool === "prospect" && <Pill color={T.accent} small>Active</Pill>}
            </button>
          </div>

          {/* Client accounts */}
          <div style={{ padding: "5px 12px 8px" }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 6 }}>
              Client Accounts
            </div>
            {CLIENTS.map(c => {
              const active = pool === "client" && c.id === clientId;
              const leads  = CLIENT_DATA[c.id]?.length || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => { onSwitchPool("client"); onSwitchClient(c.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "7px 10px", borderRadius: 7, marginBottom: 3,
                    background: active ? c.color + "14" : "transparent",
                    border: active ? "1px solid " + c.color + "40" : "1px solid transparent",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.surface; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: 5,
                      background: c.color + "20", border: "1px solid " + c.color + "40",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, color: c.color, flexShrink: 0,
                    }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? c.color : T.text }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: T.muted }}>{leads} leads · {c.plan}</div>
                  </div>
                  {active && <Pill color={c.color} small>Active</Pill>}
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.green }}>{fmt.mrr(c.mrr)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
