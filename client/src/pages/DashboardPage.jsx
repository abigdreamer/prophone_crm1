import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import CLIENTS from "../data/clients";
import { STAGE_DEF, LEAD_STAGES, LOST_STAGES } from "../data/stages";
import fmt from "../utils/format";

// ─── Dashboard overview page ──────────────────────────────────────────────────
export default function DashboardPage({ pool, clientId, viewMode, setViewMode, setPage, contacts }) {
  const T = useTheme();
  const client    = CLIENTS.find(c => c.id === clientId);
  const col       = pool === "prospect" ? T.accent : (client?.color || T.accent);

  const leads     = contacts.filter(c => LEAD_STAGES.includes(c.lifecycleStage));
  const customers = contacts.filter(c => c.lifecycleStage === "customer");
  const lost      = contacts.filter(c => LOST_STAGES.includes(c.lifecycleStage));
  const pipeline  = leads
    .filter(c => ["proposal_sent","negotiating"].includes(c.lifecycleStage))
    .reduce((s, c) => s + (c.contractValue || 0), 0);

  const stageMap = {};
  contacts.forEach(c => { stageMap[c.lifecycleStage] = (stageMap[c.lifecycleStage] || 0) + 1; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* View mode tabs */}
      <div
        style={{
          display: "flex", gap: 2,
          background: T.surface, borderRadius: 8,
          padding: 3, border: "1px solid " + T.border,
          alignSelf: "flex-start",
        }}
      >
        {[["all","All",T.dim],["leads","Leads",T.blue],["customers","Customers",T.green],["lost","Lost",T.red]].map(([mode,label,c]) => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setPage("table"); }}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "none",
              cursor: "pointer",
              background: viewMode === mode ? T.card : "transparent",
              color: viewMode === mode ? c : T.muted,
              fontWeight: viewMode === mode ? 700 : 400,
              fontSize: 11, fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pool / client banner */}
      <div
        style={{
          background: col + "0a", border: "1px solid " + col + "28",
          borderRadius: 8, padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: col + "20", border: "1px solid " + col + "40",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: col,
            }}
          >
            {pool === "prospect" ? "P" : (client?.name || "C").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
              {pool === "prospect" ? "Prospect Pool — GeniusAI" : client?.name}
            </div>
            <div style={{ fontSize: 10, color: T.muted }}>
              {pool === "prospect" ? "General pipeline" : `${client?.domain} · ${client?.industry}`}
            </div>
          </div>
        </div>
        {pool !== "prospect" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>{fmt.mrr(client?.mrr || 0)}</div>
            <div style={{ fontSize: 9, color: T.muted }}>MRR</div>
          </div>
        )}
      </div>

      {/* Leads & Customers cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Active Leads */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.blue }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.blue }}>Active Leads</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: T.muted }}>{leads.length} total</span>
          </div>

          {LEAD_STAGES.map(s => {
            const cnt = stageMap[s] || 0;
            const sd  = STAGE_DEF[s];
            const pct = leads.length ? (cnt / leads.length) * 100 : 0;
            return (
              <div key={s} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: sd.color, fontWeight: 600 }}>{sd.label}</span>
                  <span style={{ fontSize: 10, color: T.muted }}>{cnt}</span>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: sd.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}

          <div
            style={{
              marginTop: 10, padding: "6px 10px",
              background: T.amber + "10", border: "1px solid " + T.amber + "30",
              borderRadius: 5, fontSize: 10, color: T.amber,
            }}
          >
            Pipeline: ${Math.round(pipeline / 1000)}k
          </div>

          <button
            onClick={() => { setViewMode("leads"); setPage("table"); }}
            style={{
              width: "100%", marginTop: 8, padding: 6,
              background: "transparent", border: "1px solid " + T.border,
              borderRadius: 5, color: T.blue, fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View All Leads →
          </button>
        </Card>

        {/* Customers */}
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.green }}>Customers</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: T.muted }}>{customers.length} total</span>
          </div>

          {customers.slice(0, 5).map(c => (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 6, padding: "5px 6px",
                background: T.surface, borderRadius: 5,
              }}
            >
              <div
                style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: T.green + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: T.green, flexShrink: 0,
                }}
              >
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.firstName} {c.lastName}
                </div>
                <div style={{ fontSize: 9, color: T.muted }}>
                  {c.company}{c.trucks ? ` · 🚛 ${c.trucks}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.green }}>
                  ${(c.contractValue || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))}

          {customers.length > 5 && (
            <div style={{ fontSize: 10, color: T.muted, textAlign: "center", marginTop: 4 }}>
              +{customers.length - 5} more
            </div>
          )}

          <div
            style={{
              marginTop: 8, padding: "6px 10px",
              background: T.red + "10", border: "1px solid " + T.red + "30",
              borderRadius: 5, fontSize: 10, color: T.red,
            }}
          >
            Lost/Churned: {lost.length}
          </div>

          <button
            onClick={() => { setViewMode("customers"); setPage("table"); }}
            style={{
              width: "100%", marginTop: 8, padding: 6,
              background: "transparent", border: "1px solid " + T.border,
              borderRadius: 5, color: T.green, fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View All Customers →
          </button>
        </Card>
      </div>

      {/* Team activity */}
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 12 }}>Team Activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          {USERS_DB.map(u => {
            const myC = contacts.filter(c => c.addedBy === u.name || c.ownedBy === u.name);
            const myA = myC.flatMap(c => (c.activities || []).filter(a => a.by === u.name));
            return (
              <div
                key={u.id}
                style={{
                  background: T.surface, border: "1px solid " + T.border,
                  borderRadius: 7, padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <Avatar user={u} size={32} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{u.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 9, color: u.color }}>{u.role}</div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{myC.length} contacts · {myA.length} actions</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
