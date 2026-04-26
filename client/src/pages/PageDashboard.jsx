import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import T from "../theme";
import USERS_DB from "../data/users";
import { fmtRole } from "../utils/format";
import { STAGE_DEF, LEAD_STAGES, LOST_STAGES } from "../data/stages";
import { ACT_DEF } from "../data/activities";
import fmt from "../utils/format";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildPipelineBar(contacts) {
  return LEAD_STAGES.map(s => ({
    stage: STAGE_DEF[s].label,
    count: contacts.filter(c => c.lifecycleStage === s).length,
    fill:  STAGE_DEF[s].color,
  }));
}

function buildActivityArea(contacts) {
  const days = {};
  contacts.forEach(c => {
    (c.activities || []).forEach(a => {
      const d = new Date(a.ts);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!days[key]) days[key] = { date: key, emails: 0, calls: 0, meetings: 0 };
      const cat = ACT_DEF[a.type]?.cat;
      if (cat === "email")   days[key].emails++;
      if (cat === "call")    days[key].calls++;
      if (cat === "meeting") days[key].meetings++;
    });
  });
  return Object.values(days).slice(-14);
}

function buildValueBar(contacts) {
  return USERS_DB.map(u => ({
    rep:   u.name.split(" ")[0],
    value: contacts.filter(c => c.ownedBy === u.name).reduce((s, c) => s + (c.contractValue || 0), 0),
    fill:  u.color,
  }));
}

const tooltipStyle = {
  contentStyle: { background: "#fff", border: "1px solid " + T.border, borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
  labelStyle:   { color: T.text, fontWeight: 600 },
  itemStyle:    { color: T.sub },
};

// ─── unified "View All" button ────────────────────────────────────────────────
function ViewAllBtn({ onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", marginTop: 10, padding: "7px 12px",
        background: "transparent", border: "1px solid " + T.border,
        borderRadius: 6, fontSize: 12, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
        color, transition: "all 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color + "10"; e.currentTarget.style.borderColor = color + "60"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.border; }}
    >
      {children}
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function PageDashboard({ pool, clientId, viewMode, setViewMode, setPage, contacts }) {
  const leads     = contacts.filter(c => LEAD_STAGES.includes(c.lifecycleStage));
  const customers = contacts.filter(c => c.lifecycleStage === "customer");
  const lost      = contacts.filter(c => LOST_STAGES.includes(c.lifecycleStage));
  const pipeline  = leads
    .filter(c => ["proposal_sent","negotiating"].includes(c.lifecycleStage))
    .reduce((s, c) => s + (c.contractValue || 0), 0);

  const pipelineData  = buildPipelineBar(contacts);
  const activityData  = buildActivityArea(contacts);
  const valueData     = buildValueBar(contacts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Stat tiles ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Contacts", value: contacts.length,  color: T.accent },
          { label: "Active Leads",   value: leads.length,     color: T.blue   },
          { label: "Customers",      value: customers.length, color: T.green  },
          { label: "Pipeline",       value: "$" + Math.round(pipeline / 1000) + "k", color: T.amber },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── View tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, background: T.surface, borderRadius: 8, padding: 3, border: "1px solid " + T.border, alignSelf: "flex-start" }}>
        {[["all","All",T.sub],["leads","Leads",T.blue],["customers","Customers",T.green],["lost","Lost",T.red]].map(([mode,label,c]) => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setPage("table"); }}
            style={{
              padding: "6px 16px", borderRadius: 6, border: "none",
              cursor: "pointer", fontFamily: "inherit",
              background: viewMode === mode ? c + "15" : "transparent",
              color: viewMode === mode ? c : T.muted,
              fontWeight: viewMode === mode ? 700 : 400,
              fontSize: 12, transition: "all 0.12s",
            }}
            onMouseEnter={e => { if (viewMode !== mode) e.currentTarget.style.background = T.panel; }}
            onMouseLeave={e => { if (viewMode !== mode) e.currentTarget.style.background = "transparent"; }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Charts row 1: Pipeline bar + Activity area ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>

        {/* Pipeline by stage — bar chart */}
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Pipeline by Stage</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipelineData} barSize={22} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" name="Contacts" radius={[4, 4, 0, 0]}>
                {pipelineData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ViewAllBtn onClick={() => { setViewMode("leads"); setPage("table"); }} color={T.blue}>
            View All Leads →
          </ViewAllBtn>
        </Card>

        {/* Activity trend — grouped bar chart */}
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Activity Trend (last 14 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData} barSize={8} barGap={2} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="emails"   name="Emails"   fill={T.blue}  radius={[3, 3, 0, 0]} />
              <Bar dataKey="calls"    name="Calls"    fill={T.green} radius={[3, 3, 0, 0]} />
              <Bar dataKey="meetings" name="Meetings" fill={T.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Charts row 2: Value by rep bar + Customers list ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Contract value by rep */}
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Contract Value by Rep</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={valueData} barSize={28} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
              <YAxis type="category" dataKey="rep" tick={{ fontSize: 11, fill: T.sub }} axisLine={false} tickLine={false} width={52} />
              <Tooltip {...tooltipStyle} formatter={v => ["$" + v.toLocaleString(), "Value"]} />
              <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
                {valueData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Customers */}
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>Customers</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: T.muted }}>{customers.length} total</span>
          </div>

          {customers.slice(0, 5).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 8px", background: T.panel, borderRadius: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.green + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.green, flexShrink: 0 }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.firstName} {c.lastName}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{c.company}{c.trucks ? ` · 🚛 ${c.trucks}` : ""}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.green }}>${(c.contractValue || 0).toLocaleString()}</div>
            </div>
          ))}

          {customers.length > 5 && <div style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 4 }}>+{customers.length - 5} more</div>}

          <ViewAllBtn onClick={() => { setViewMode("customers"); setPage("table"); }} color={T.green}>
            View All Customers →
          </ViewAllBtn>
        </Card>
      </div>

      {/* ── Team Activity ───────────────────────────────────────────────────── */}
      <Card style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Team Activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {USERS_DB.map(u => {
            const myC = contacts.filter(c => c.addedBy === u.name || c.ownedBy === u.name);
            const myA = myC.flatMap(c => (c.activities || []).filter(a => a.by === u.name));
            return (
              <div key={u.id} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar user={u} size={34} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{u.name.split(" ")[0]}</div>
                  <div style={{ fontSize: 10, color: u.color, fontWeight: 600 }}>{fmtRole(u.role)}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{myC.length} contacts · {myA.length} actions</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
