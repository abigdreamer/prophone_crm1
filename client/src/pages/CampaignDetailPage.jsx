import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Users, Mail, MousePointerClick, AlertCircle,
  UserMinus, RefreshCw, Plus, Loader2, ChevronRight, CheckCircle2,
  Megaphone, BarChart2, X, Trash2,
} from "lucide-react";
import T from "../theme";
import {
  getCampaign, getCampaignRecipients, addCampaignRecipients,
  removeCampaignRecipients, sendCampaign, getCampaignAnalytics,
  updateCampaign, getActivePool,
} from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft:   { label: "Draft",   color: T.muted  },
    sending: { label: "Sending", color: T.amber  },
    sent:    { label: "Sent",    color: T.green  },
    paused:  { label: "Paused",  color: T.orange },
  };
  const { label, color } = map[status] ?? { label: status, color: T.muted };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", color,
      background: color + "18", border: "1px solid " + color + "40",
      borderRadius: 4, padding: "2px 7px",
    }}>{label}</span>
  );
}

function RecipientStatusBadge({ status }) {
  const map = {
    pending:      { color: T.muted,   label: "Pending" },
    sent:         { color: T.blue,    label: "Sent" },
    delivered:    { color: T.teal,    label: "Delivered" },
    opened:       { color: T.green,   label: "Opened" },
    clicked:      { color: T.accent,  label: "Clicked" },
    bounced:      { color: T.red,     label: "Bounced" },
    unsubscribed: { color: T.orange,  label: "Unsubscribed" },
  };
  const { color, label } = map[status] ?? { color: T.muted, label: status };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      color, background: color + "15",
      borderRadius: 4, padding: "1px 7px", border: "1px solid " + color + "30",
    }}>{label}</span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: 100,
        background: active ? color + "18" : T.card,
        border: "1px solid " + (active ? color : T.border),
        borderRadius: 10, padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => !active && onClick && (e.currentTarget.style.borderColor = T.border)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 11, color: T.muted }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: active ? color : T.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub !== undefined && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Recipients Modal
// ─────────────────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: "all",       label: "All Leads",        desc: "Every contact in this account" },
  { id: "new",       label: "New Leads",         desc: "Contacts in the 'New' stage" },
  { id: "contacted", label: "Contacted Leads",   desc: "Contacts that have been reached" },
  { id: "qualified", label: "Qualified Leads",   desc: "Leads that are qualified" },
  { id: "converted", label: "Converted Leads",   desc: "Converted / won contacts" },
  { id: "lost",      label: "Lost Leads",        desc: "Marked as lost" },
];

function AddRecipientsModal({ campaignId, clientId, onClose, onAdded }) {
  const [step,     setStep]     = useState(1); // 1=filter, 2=preview, 3=confirm
  const [filter,   setFilter]   = useState("all");
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [adding,   setAdding]   = useState(false);

  const loadPreview = useCallback(async (f) => {
    setLoading(true);
    try {
      const { clientId: poolClient } = getActivePool();
      const res = await fetch(
        `/api/campaigns/${campaignId}/recipients/preview?filter=${f}&clientId=${clientId || poolClient}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("prophone_token")}` } }
      );
      const json = await res.json();
      setPreview(json.data ?? json);
    } catch {
      setPreview({ count: 0, sample: [] });
    } finally {
      setLoading(false);
    }
  }, [campaignId, clientId]);

  const handleNext = async () => {
    await loadPreview(filter);
    setStep(2);
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const updated = await addCampaignRecipients(campaignId, { filter });
      onAdded(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 14,
        width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px 14px", borderBottom: "1px solid " + T.border,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {step === 1 ? "Add Recipients" : step === 2 ? "Preview Recipients" : "Confirm"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {step === 1 && (
            <>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
                Choose which contacts to include in this campaign.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FILTERS.map(f => {
                  const selected = filter === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                        border: "1px solid " + (selected ? T.accent : T.border),
                        background: selected ? T.accent + "10" : T.surface,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        border: "2px solid " + (selected ? T.accent : T.border),
                        background: selected ? T.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{f.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13, padding: 20 }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading preview…
                </div>
              ) : (
                <>
                  <div style={{
                    background: T.accent + "10", border: "1px solid " + T.accent + "30",
                    borderRadius: 8, padding: "14px 16px", marginBottom: 16,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <Users size={16} color={T.accent} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
                        {preview?.count ?? 0} contacts
                      </div>
                      <div style={{ fontSize: 11, color: T.muted }}>
                        Match filter: {FILTERS.find(f => f.id === filter)?.label}
                      </div>
                    </div>
                  </div>

                  {preview?.sample?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Sample
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {preview.sample.map(c => (
                          <div key={c.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 7, background: T.surface,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: T.accent + "22", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, color: T.accent,
                            }}>
                              {(c.firstName?.[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                                {c.firstName} {c.lastName}
                              </div>
                              <div style={{ fontSize: 11, color: T.muted }}>{c.email || c.company}</div>
                            </div>
                          </div>
                        ))}
                        {preview.count > preview.sample.length && (
                          <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: "4px 0" }}>
                            +{preview.count - preview.sample.length} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {preview?.count === 0 && (
                    <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>
                      No contacts match this filter.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", borderTop: "1px solid " + T.border,
        }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} style={{
                padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border,
                background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={handleNext} disabled={loading} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 7, border: "none",
                background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Next <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} style={{
                padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border,
                background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>← Back</button>
              <button
                onClick={handleAdd}
                disabled={adding || !preview?.count || loading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 7, border: "none",
                  background: preview?.count && !adding ? T.accent : T.border,
                  color: preview?.count && !adding ? "#fff" : T.muted,
                  fontSize: 13, fontWeight: 600,
                  cursor: preview?.count && !adding ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                {adding
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Adding…</>
                  : <><Plus size={13} /> Add {preview?.count || 0} Recipients</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

function SendConfirmModal({ campaign, onClose, onConfirm, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: T.accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Send size={22} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>
              Send campaign?
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              This will send "<strong style={{ color: T.text }}>{campaign.name}</strong>" to{" "}
              <strong style={{ color: T.text }}>{campaign.recipientsCount}</strong> recipient
              {campaign.recipientsCount !== 1 ? "s" : ""}. This action cannot be undone.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 22px", borderRadius: 7, border: "none",
            background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: loading ? "default" : "pointer", fontFamily: "inherit",
          }}>
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
              : <><Send size={13} /> Send Now</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipients table
// ─────────────────────────────────────────────────────────────────────────────

function RecipientsTable({ campaignId, filter, key: _ }) {
  const [data,    setData]    = useState({ rows: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: data.page };
      if (filter && filter !== "all") params.status = filter;
      const res = await getCampaignRecipients(campaignId, params);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filter, data.page]);

  useEffect(() => { load(); }, [campaignId, filter]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 12, padding: "20px 0" }}>
      <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Loading recipients…
    </div>
  );

  if (!data.rows.length) return (
    <div style={{ textAlign: "center", padding: "32px 0", color: T.muted, fontSize: 13 }}>
      No recipients {filter && filter !== "all" ? `with status "${filter}"` : "yet"}
    </div>
  );

  return (
    <>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
        Showing {data.rows.length} of {data.total}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.rows.map(r => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 8,
            background: T.surface, border: "1px solid " + T.border,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: T.accent + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: T.accent,
            }}>
              {(r.contact?.firstName?.[0] || "?").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {r.contact?.firstName} {r.contact?.lastName}
              </div>
              <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.contact?.email} {r.contact?.company && `· ${r.contact.company}`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {r.abVariant && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.purple + "15", padding: "2px 6px", borderRadius: 4 }}>
                  {r.abVariant}
                </span>
              )}
              <RecipientStatusBadge status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main detail page
// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [campaign,        setCampaign]        = useState(null);
  const [analytics,       setAnalytics]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [showAddModal,    setShowAddModal]     = useState(false);
  const [showSendModal,   setShowSendModal]    = useState(false);
  const [sending,         setSending]         = useState(false);
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [tableKey,        setTableKey]        = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCampaign(id);
      setCampaign(c);
      if (c.status === "sent") {
        const a = await getCampaignAnalytics(id).catch(() => null);
        setAnalytics(a);
      }
    } catch {
      navigate("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSend = useCallback(async () => {
    setSending(true);
    try {
      const updated = await sendCampaign(id);
      setCampaign(updated);
      setShowSendModal(false);
      const a = await getCampaignAnalytics(id).catch(() => null);
      setAnalytics(a);
      setTableKey(k => k + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }, [id]);

  const handleAdded = useCallback((updated) => {
    setCampaign(updated);
    setShowAddModal(false);
    setTableKey(k => k + 1);
  }, []);

  const handleClearRecipients = useCallback(async () => {
    if (!window.confirm("Remove all recipients from this campaign?")) return;
    try {
      await removeCampaignRecipients(id);
      setCampaign(prev => ({ ...prev, recipientsCount: 0 }));
      setTableKey(k => k + 1);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13, padding: 40 }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading campaign…
      </div>
    );
  }

  if (!campaign) return null;

  const canSend   = ["draft", "paused"].includes(campaign.status) && campaign.recipientsCount > 0;
  const isSent    = campaign.status === "sent";
  const isSending = campaign.status === "sending";

  const openRate   = analytics?.rates?.openRate   ?? 0;
  const clickRate  = analytics?.rates?.clickRate  ?? 0;
  const bounceRate = analytics?.rates?.bounceRate ?? 0;

  const RECIPIENT_FILTERS = [
    { id: "all",          label: "All" },
    { id: "pending",      label: "Pending" },
    { id: "sent",         label: "Sent" },
    { id: "opened",       label: "Opened" },
    { id: "clicked",      label: "Clicked" },
    { id: "bounced",      label: "Bounced" },
    { id: "unsubscribed", label: "Unsub'd" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Back + Title */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
        <button
          onClick={() => navigate("/campaigns")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 7, border: "1px solid " + T.border,
            background: T.surface, color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            flexShrink: 0, marginTop: 2,
          }}
        >
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
            {campaign.type === "ab_test" && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.purple + "18", border: "1px solid " + T.purple + "30", borderRadius: 4, padding: "2px 7px" }}>A/B Test</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            {campaign.template?.name || "No template selected"}
            {campaign.sentAt && ` · Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {isSending && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.amber, fontSize: 12 }}>
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…
            </div>
          )}
          {isSent && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.green, fontSize: 12 }}>
              <CheckCircle2 size={13} /> Sent
            </div>
          )}
          {canSend && (
            <button
              onClick={() => setShowSendModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 7, border: "none",
                background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Send size={13} /> Send Campaign
            </button>
          )}
        </div>
      </div>

      {/* Analytics section (only when sent) */}
      {isSent && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <BarChart2 size={14} color={T.accent} /> Campaign Analytics
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatCard
              icon={Send} label="Total Sent" value={campaign.sentCount}
              color={T.blue}
              active={recipientFilter === "sent"}
              onClick={() => setRecipientFilter(f => f === "sent" ? "all" : "sent")}
            />
            <StatCard
              icon={Mail} label="Opened" value={campaign.openedCount}
              sub={`${openRate}% open rate`} color={T.green}
              active={recipientFilter === "opened"}
              onClick={() => setRecipientFilter(f => f === "opened" ? "all" : "opened")}
            />
            <StatCard
              icon={MousePointerClick} label="Clicked" value={campaign.clickedCount}
              sub={`${clickRate}% click rate`} color={T.accent}
              active={recipientFilter === "clicked"}
              onClick={() => setRecipientFilter(f => f === "clicked" ? "all" : "clicked")}
            />
            <StatCard
              icon={AlertCircle} label="Bounced" value={campaign.bouncedCount}
              sub={`${bounceRate}% bounce rate`} color={T.red}
              active={recipientFilter === "bounced"}
              onClick={() => setRecipientFilter(f => f === "bounced" ? "all" : "bounced")}
            />
            <StatCard
              icon={UserMinus} label="Unsubscribed" value={campaign.unsubscribedCount}
              color={T.orange}
              active={recipientFilter === "unsubscribed"}
              onClick={() => setRecipientFilter(f => f === "unsubscribed" ? "all" : "unsubscribed")}
            />
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
            Click a metric card to filter recipients below.
          </div>
        </div>
      )}

      {/* Recipients section */}
      <div style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "20px 22px",
      }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} color={T.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recipients</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: T.accent,
              background: T.accent + "18", borderRadius: 12, padding: "2px 9px",
            }}>
              {campaign.recipientsCount}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {campaign.recipientsCount > 0 && !isSent && (
              <button
                onClick={handleClearRecipients}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 6, border: "1px solid " + T.border,
                  background: "transparent", color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Trash2 size={11} /> Clear All
              </button>
            )}
            {!isSent && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 7, border: "none",
                  background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Plus size={13} /> Add Recipients
              </button>
            )}
          </div>
        </div>

        {campaign.recipientsCount === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 20px", textAlign: "center",
          }}>
            <Users size={36} color={T.border} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginBottom: 6 }}>No recipients yet</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
              Add recipients to this campaign to get started.
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={13} /> Add Recipients
            </button>
          </div>
        ) : (
          <>
            {/* Status filter tabs */}
            <div style={{
              display: "flex", gap: 4, flexWrap: "wrap",
              marginBottom: 16, padding: 3,
              background: T.surface, borderRadius: 8, border: "1px solid " + T.border,
              alignSelf: "flex-start",
            }}>
              {RECIPIENT_FILTERS.map(f => {
                const active = recipientFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setRecipientFilter(f.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, border: "none",
                      background: active ? T.card : "transparent",
                      color: active ? T.text : T.muted,
                      fontWeight: active ? 600 : 400, fontSize: 11,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <RecipientsTable
              key={`${tableKey}-${recipientFilter}`}
              campaignId={id}
              filter={recipientFilter}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddRecipientsModal
          campaignId={id}
          clientId={campaign.clientId}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
      {showSendModal && (
        <SendConfirmModal
          campaign={campaign}
          onClose={() => setShowSendModal(false)}
          onConfirm={handleSend}
          loading={sending}
        />
      )}
    </div>
  );
}
