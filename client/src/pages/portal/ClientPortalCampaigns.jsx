import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { portalGetCampaigns, portalGetCampaign } from "../../services/api";
import { ContentLoader } from "../../components/ui/Loader";
import { Mail, Send, Eye, MousePointerClick, AlertCircle } from "lucide-react";

const STATUS_COLORS = {
  draft: "#6b7280", sending: "#3b82f6", sent: "#10b981",
  scheduled: "#f59e0b", failed: "#ef4444", canceled: "#9ca3af",
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: color + "18", color, border: "1px solid " + color + "30",
    }}>
      {status}
    </span>
  );
}

function Metric({ icon: Icon, label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ClientPortalCampaigns() {
  const T = useTheme();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    portalGetCampaigns()
      .then(data => setCampaigns(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function selectCampaign(c) {
    setSelected(c);
    setDetailLoading(true);
    try {
      const full = await portalGetCampaign(c.id);
      setSelected(full);
    } catch {}
    finally { setDetailLoading(false); }
  }

  if (loading) return <ContentLoader />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Campaigns</h1>
        <p style={{ fontSize: 13, color: T.muted }}>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
      </div>

      {campaigns.length === 0 ? (
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, padding: 40, textAlign: "center",
        }}>
          <Mail size={40} color={T.border} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dim }}>No campaigns yet</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Campaigns will appear here once your account manager sends them.</div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16 }}>
          {/* Campaign list */}
          <div style={{
            width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            background: T.surface, border: "1px solid " + T.border, borderRadius: 12,
            overflow: "hidden", maxHeight: "calc(100vh - 180px)",
          }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {campaigns.map(c => {
                const active = selected?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectCampaign(c)}
                    style={{
                      padding: "12px 14px", cursor: "pointer",
                      background: active ? "#6366f118" : "transparent",
                      borderBottom: "1px solid " + T.border,
                      borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bg; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</div>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.subject && <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>}
                    <div style={{ fontSize: 10, color: T.muted }}>
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div style={{
            flex: 1, background: T.surface, border: "1px solid " + T.border,
            borderRadius: 12, overflow: "hidden",
          }}>
            {!selected ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.muted, fontSize: 13 }}>
                Select a campaign to view details
              </div>
            ) : detailLoading ? (
              <div style={{ padding: 24 }}><ContentLoader /></div>
            ) : (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{selected.name}</h2>
                    <StatusBadge status={selected.status} />
                  </div>
                  {selected.subject && <div style={{ fontSize: 13, color: T.muted }}>Subject: {selected.subject}</div>}
                  {selected.fromName && <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>From: {selected.fromName} &lt;{selected.fromEmail}&gt;</div>}
                </div>

                {/* Metrics */}
                <div style={{
                  background: T.bg, border: "1px solid " + T.border, borderRadius: 10,
                  padding: "18px 22px", marginBottom: 18,
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 20,
                }}>
                  <Metric label="Recipients" value={selected.recipientsCount || 0} color="#6366f1" />
                  <Metric label="Sent"       value={selected.sentCount       || 0} color="#3b82f6" />
                  <Metric label="Delivered"  value={selected.deliveredCount  || 0} color="#10b981" />
                  <Metric label="Opened"     value={selected.openedCount     || 0} color="#f59e0b" />
                  <Metric label="Clicked"    value={selected.clickedCount    || 0} color="#8b5cf6" />
                  <Metric label="Bounced"    value={selected.bouncedCount    || 0} color="#ef4444" />
                </div>

                {/* Rates */}
                {selected.sentCount > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { label: "Open Rate",  value: Math.round((selected.openedCount / selected.sentCount) * 100), color: "#f59e0b" },
                      { label: "Click Rate", value: Math.round((selected.clickedCount / selected.sentCount) * 100), color: "#8b5cf6" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: T.bg, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 16px" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}%</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.sentAt && (
                  <div style={{ marginTop: 16, fontSize: 12, color: T.muted }}>
                    Sent on {new Date(selected.sentAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
