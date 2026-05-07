import { useState, useEffect } from "react";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import CLIENTS from "../data/clients";
import { STAGE_DEF, LEAD_STAGES } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";
import { VIEW_MODE } from "../constants/index";

import DashboardStatusCount from "../components/DashboardStatusCount";

export default function DashboardPage({ pool, clientId, viewMode, setViewMode, setPage, contacts, currentUser }) {
  const T = useTheme();
  const client = CLIENTS.find(c => c.id === clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);

  const [summary, setSummary] = useState({ counts: {}, recentContacts: [] });

  useEffect(() => {
    db.getDashboardSummary()
      .then(data => setSummary({
        counts: data.counts || {},
        recentContacts: data.recentContacts || [],
      }))
      .catch(() => {});
  }, [pool, clientId]);

  // Active Leads breakdown
  const leads = contacts.filter(c => LEAD_STAGES.includes(c.lifecycleStage));
  const stageMap = {};
  contacts.forEach(c => { stageMap[c.lifecycleStage] = (stageMap[c.lifecycleStage] || 0) + 1; });

  const navItems = [
    { id: VIEW_MODE.ALL,        label: "All",        dot: T.dim    },
    { id: VIEW_MODE.PROSPECTS,  label: "Prospects",  dot: T.amber  },
    { id: VIEW_MODE.LEADS,      label: "Leads",      dot: T.blue   },
    { id: VIEW_MODE.WARM,       label: "Warm",       dot: T.orange },
    { id: VIEW_MODE.HOT,        label: "Hot",        dot: T.purple },
    { id: VIEW_MODE.CUSTOMER,   label: "Customer",   dot: T.green  },
    { id: VIEW_MODE.BACKBURNER, label: "Backburner", dot: T.teal   },
    { id: VIEW_MODE.LOST,       label: "Lost",       dot: T.red    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── Filter Navigation ─── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, background: T.bg,
        padding: "6px", borderRadius: 12, border: "1px solid " + T.border, alignSelf: "flex-start"
      }}>
        {navItems.map((item) => {
          const isActive = viewMode === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setViewMode(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8,
                border: "none", cursor: "pointer", background: isActive ? T.surface : "transparent",
                transition: "all 0.2s ease",
              }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.dot, boxShadow: isActive ? `0 0 8px ${item.dot}80` : "none" }} />
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? T.text : T.muted }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Banner */}
      <div style={{ background: col + "0a", border: "1px solid " + col + "28", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: col + "20", border: "1px solid " + col + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: col }}>
            {pool === "prospect" ? "P" : (client?.name || "C").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{pool === "prospect" ? "Prospect Pool — GeniusAI" : client?.name}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{pool === "prospect" ? "General sales pipeline" : `${client?.domain} · ${client?.industry}`}</div>
          </div>
        </div>
      </div>

      {/* Main Status Grid (Click logic removed) */}
      <DashboardStatusCount data={summary.counts} />

      {/* Detailed Cards Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 20, background: T.surface, border: "1px solid " + T.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.blue }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Active Leads</span>
          </div>
          {LEAD_STAGES.map(s => {
            const cnt = stageMap[s] || 0;
            const sd = STAGE_DEF[s];
            const pct = leads.length ? (cnt / leads.length) * 100 : 0;
            return (
              <div key={s} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{sd.label}</span>
                  <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{cnt}</span>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: pct + "%", background: sd.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ padding: 20, background: T.surface, border: "1px solid " + T.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recent Contacts</span>
          </div>
          {summary.recentContacts.length === 0 ? (
            <div style={{ fontSize: 12, color: T.muted }}>No contacts yet.</div>
          ) : (
            summary.recentContacts.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px", background: T.card, borderRadius: 8, border: "1px solid " + T.border }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.green + "20", color: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  {(c.firstName?.[0] || "?")}{(c.lastName?.[0] || "")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.firstName} {c.lastName}</div>
                  <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company || c.lifecycleStage}</div>
                </div>
                <div style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{fmt.ago(c.lastActivityAt)}</div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Team Activity Section */}
      <Card style={{ padding: 20, background: T.surface, border: "1px solid " + T.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.purple, boxShadow: `0 0 10px ${T.purple}80` }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Team Activity</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {USERS_DB.map(u => {
            const myC = contacts.filter(c => c.addedBy === u.name || c.ownedBy === u.name);
            return (
              <div key={u.id} style={{
                background: T.card, border: "1px solid " + T.border,
                borderRadius: 10, padding: "12px 16px", display: "flex",
                alignItems: "center", gap: 12
              }}>
                <Avatar user={u} size={36} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: u.color || T.muted, fontWeight: 600 }}>{u.role}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{myC.length} managed contacts</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}