import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { portalGetDashboard } from "../../services/api";
import { Users, Mail, TrendingUp, Activity, Loader } from "lucide-react";
import { ContentLoader } from "../../components/ui/Loader";

const STAGE_LABELS = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  demo_scheduled: "Demo Scheduled", demo_done: "Demo Done",
  proposal_sent: "Proposal Sent", negotiating: "Negotiating",
  customer: "Customer", not_qualified: "Not Qualified",
  lost: "Lost", churned: "Churned",
};

function StatCard({ icon: Icon, label, value, color, T }) {
  return (
    <div style={{
      background: T.surface, border: "1px solid " + T.border,
      borderRadius: 12, padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + "18", border: "1px solid " + color + "30",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function ClientPortalDashboard({ clientUser }) {
  const T = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const accent = clientUser?.clientColor || "#6366f1";

  useEffect(() => {
    portalGetDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ContentLoader />;

  const openRate = data?.campaigns?.sent > 0
    ? Math.round((data.campaigns.opened / data.campaigns.sent) * 100)
    : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Welcome back, {clientUser?.name?.split(" ")[0] || "there"}
        </h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          Here's an overview of your company's activity in ProPhone CRM.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Users}    label="Total Leads"       value={data?.totalLeads ?? 0}       color={accent}     T={T} />
        <StatCard icon={Activity} label="Active Leads"      value={data?.activeLeads ?? 0}      color="#10b981"    T={T} />
        <StatCard icon={Mail}     label="Campaigns"         value={data?.campaigns?.total ?? 0} color="#3b82f6"    T={T} />
        <StatCard icon={TrendingUp} label="Email Open Rate" value={openRate + "%"}              color="#f59e0b"    T={T} />
      </div>

      {/* Campaign performance */}
      {data?.campaigns?.total > 0 && (
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, padding: "20px 22px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Campaign Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14 }}>
            {[
              { label: "Emails Sent",    value: data.campaigns.sent    ?? 0, color: "#6366f1" },
              { label: "Delivered",      value: data.campaigns.delivered ?? 0, color: "#10b981" },
              { label: "Opened",         value: data.campaigns.opened  ?? 0, color: "#3b82f6" },
              { label: "Clicked",        value: data.campaigns.clicked ?? 0, color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads by stage */}
      {data?.leadsByStage?.length > 0 && (
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, padding: "20px 22px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Leads by Stage</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.leadsByStage
              .sort((a, b) => b.count - a.count)
              .map(({ stage, count }) => {
                const pct = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
                return (
                  <div key={stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.dim }}>{STAGE_LABELS[stage] || stage}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: pct + "%", borderRadius: 3,
                        background: `linear-gradient(90deg, ${accent} 0%, #3b82f6 100%)`,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {data?.recentActivity?.length > 0 && (
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, padding: "20px 22px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.recentActivity.slice(0, 8).map(act => (
              <div key={act.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                paddingBottom: 10, borderBottom: "1px solid " + T.border,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: accent, flexShrink: 0, marginTop: 4,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.text }}>{act.note || act.type}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {act.by && <span>{act.by} · </span>}
                    {new Date(act.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
