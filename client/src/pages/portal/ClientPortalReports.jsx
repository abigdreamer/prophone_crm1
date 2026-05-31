import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { portalGetDashboard, portalGetCampaigns } from "../../services/api";
import { ContentLoader } from "../../components/ui/Loader";

const STAGE_LABELS = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  demo_scheduled: "Demo Scheduled", demo_done: "Demo Done",
  proposal_sent: "Proposal Sent", negotiating: "Negotiating",
  customer: "Customer", not_qualified: "Not Qualified",
  lost: "Lost", churned: "Churned",
};

const STAGE_ORDER = ["new","contacted","engaged","demo_scheduled","demo_done","proposal_sent","negotiating","customer","not_qualified","lost","churned"];

export default function ClientPortalReports({ clientUser }) {
  const T = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const accent = clientUser?.clientColor || "#6366f1";

  useEffect(() => {
    Promise.all([portalGetDashboard(), portalGetCampaigns()])
      .then(([d, c]) => { setDashboard(d); setCampaigns(c || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ContentLoader />;

  const sentCampaigns = campaigns.filter(c => c.status === "sent" || c.sentCount > 0);
  const totalSent = sentCampaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + (c.openedCount || 0), 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + (c.clickedCount || 0), 0);
  const totalBounced = sentCampaigns.reduce((s, c) => s + (c.bouncedCount || 0), 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  const sortedStages = (dashboard?.leadsByStage || [])
    .slice()
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Reports & Analytics</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Overview of your company's leads and campaign performance.</p>
      </div>

      {/* Lead pipeline summary */}
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 12, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Lead Pipeline Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {sortedStages.map(({ stage, count }) => (
            <div key={stage} style={{
              background: T.bg, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{count}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{STAGE_LABELS[stage] || stage}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "10px 14px", background: T.bg, borderRadius: 8, display: "flex", gap: 24 }}>
          <div>
            <span style={{ fontSize: 11, color: T.muted }}>Total Leads: </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{dashboard?.totalLeads ?? 0}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: T.muted }}>Active: </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>{dashboard?.activeLeads ?? 0}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: T.muted }}>Customers: </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>
              {sortedStages.find(s => s.stage === "customer")?.count ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Email campaign overview */}
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 12, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Email Campaign Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Total Campaigns", value: campaigns.length, color: "#6366f1" },
            { label: "Emails Sent",     value: totalSent,        color: "#3b82f6" },
            { label: "Opened",          value: totalOpened,      color: "#f59e0b" },
            { label: "Clicked",         value: totalClicked,     color: "#8b5cf6" },
            { label: "Bounced",         value: totalBounced,     color: "#ef4444" },
            { label: "Open Rate",       value: openRate + "%",   color: "#10b981" },
            { label: "Click Rate",      value: clickRate + "%",  color: "#f97316" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: T.bg, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-campaign table */}
      {sentCampaigns.length > 0 && (
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid " + T.border }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Campaign Breakdown</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Campaign", "Sent", "Opened", "Clicked", "Open Rate", "Click Rate", "Date"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid " + T.border }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentCampaigns.map(c => {
                  const oRate = c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
                  const cRate = c.sentCount > 0 ? Math.round((c.clickedCount / c.sentCount) * 100) : 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid " + T.border }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: T.text }}>{c.name}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: T.dim }}>{c.sentCount || 0}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: T.dim }}>{c.openedCount || 0}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: T.dim }}>{c.clickedCount || 0}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{oRate}%</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#8b5cf6", fontWeight: 700 }}>{cRate}%</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: T.muted }}>
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
