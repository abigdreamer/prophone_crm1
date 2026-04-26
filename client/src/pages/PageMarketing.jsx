import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Layers, Plus, Send, Pause, Play, Trash2,
  ChevronLeft, Users, Mail, Eye, MousePointerClick,
  AlertCircle, CheckCircle2, Clock, Loader2, Search,
  MoreHorizontal, RefreshCw,
} from "lucide-react";
import T from "../theme";
import { useApp } from "../App";
import { useToast } from "../hooks/useToast";
import {
  getCampaigns, getCampaign, createCampaign, deleteCampaign,
  getRecipients, addRecipients,
  sendCampaign, pauseCampaign, resumeCampaign,
} from "../api/campaigns.api";
import { getEmailTemplates } from "../api/emailTemplates.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return (n ?? 0).toLocaleString(); }
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_CFG = {
  draft:     { label: "Draft",     bg: "#f1f5f9", color: "#475569" },
  running:   { label: "Running",   bg: "#dbeafe", color: "#1d4ed8" },
  paused:    { label: "Paused",    bg: "#fef3c7", color: "#d97706" },
  completed: { label: "Completed", bg: "#dcfce7", color: "#16a34a" },
  failed:    { label: "Failed",    bg: "#fee2e2", color: "#dc2626" },
};

const RECIPIENT_STATUS_CFG = {
  pending:   { label: "Pending",   color: "#94a3b8" },
  queued:    { label: "Queued",    color: "#60a5fa" },
  sent:      { label: "Sent",      color: "#6366f1" },
  delivered: { label: "Delivered", color: "#0d9488" },
  opened:    { label: "Opened",    color: "#16a34a" },
  clicked:   { label: "Clicked",   color: "#059669" },
  bounced:   { label: "Bounced",   color: "#dc2626" },
  failed:    { label: "Failed",    color: "#dc2626" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      padding: "3px 8px", borderRadius: 20, textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {status === "running" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", animation: "pulse 1.5s infinite" }} />}
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = T.accent }) {
  return (
    <div style={{
      background: T.surface, border: "1px solid " + T.border,
      borderRadius: 10, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 14, flex: 1,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: color + "15",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Create Campaign Modal ─────────────────────────────────────────────────────

function CreateCampaignModal({ onClose, onCreate, scopedCompany }) {
  const [form, setForm] = useState({ name: "", subject: "", from_name: "", from_email: "", template_id: "" });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getEmailTemplates().then(setTemplates).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())    return toast.error("Campaign name is required.");
    if (!form.subject.trim()) return toast.error("Subject line is required.");
    setLoading(true);
    try {
      const payload = {
        name:        form.name.trim(),
        subject:     form.subject.trim(),
        from_name:   form.from_name.trim(),
        from_email:  form.from_email.trim(),
        template_id: form.template_id || null,
      };
      if (scopedCompany) payload.prophone_id = scopedCompany;
      const row = await createCampaign(payload);
      onCreate(row);
      onClose();
      toast.success("Campaign created.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", boxSizing: "border-box",
    background: T.panel, border: "1px solid " + T.border,
    borderRadius: 7, fontSize: 13, color: T.text,
    fontFamily: "inherit", outline: "none",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.sub, display: "block", marginBottom: 5 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: 14, width: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>New Campaign</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Campaign Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Q2 Towing Outreach" autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Email Subject *</label>
            <input style={inputStyle} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. {{firstName}}, let's talk fleet savings" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>From Name</label>
              <input style={inputStyle} value={form.from_name} onChange={e => set("from_name", e.target.value)} placeholder="ProPhone CRM" />
            </div>
            <div>
              <label style={labelStyle}>From Email</label>
              <input style={inputStyle} type="email" value={form.from_email} onChange={e => set("from_email", e.target.value)} placeholder="hello@yourdomain.com" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email Template (optional)</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.template_id}
              onChange={e => set("template_id", e.target.value)}
            >
              <option value="">— No template (add HTML later) —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4, borderTop: "1px solid " + T.border, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border,
              background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: "8px 22px", borderRadius: 7, border: "none",
              background: T.accent, color: "#fff", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7,
            }}>
              {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Recipients Modal ──────────────────────────────────────────────────────

function AddRecipientsModal({ campaignId, onClose, onAdded }) {
  const { contacts } = useApp();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const eligible = contacts.filter(c => c.email && c.email.trim());
  const filtered = search
    ? eligible.filter(c =>
        `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
      )
    : eligible;

  const toggle = id => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  async function handleAdd() {
    if (selected.size === 0) return toast.error("Select at least one contact.");
    setLoading(true);
    try {
      const result = await addRecipients(campaignId, [...selected]);
      onAdded(result.added);
      onClose();
      toast.success(`${result.added} recipient${result.added !== 1 ? "s" : ""} added.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: 14, width: 560, maxHeight: "80vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + T.border, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Add Recipients</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ marginTop: 12, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
            <input
              style={{
                width: "100%", padding: "8px 12px 8px 32px", boxSizing: "border-box",
                background: T.panel, border: "1px solid " + T.border,
                borderRadius: 7, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
              }}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or company…"
              autoFocus
            />
          </div>
        </div>

        {/* Select-all row */}
        <div style={{
          padding: "8px 22px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          background: T.panel,
        }}>
          <input type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleAll}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: T.muted }}>
            {selected.size > 0
              ? `${selected.size} selected`
              : `${filtered.length} contact${filtered.length !== 1 ? "s" : ""} with email`}
          </span>
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 13 }}>
              {eligible.length === 0 ? "No contacts with email addresses found." : "No contacts match your search."}
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 22px", cursor: "pointer",
                  borderBottom: "1px solid " + T.border,
                  background: selected.has(c.id) ? T.accentLow : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ cursor: "pointer", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                    {c.first_name} {c.last_name}
                    {c.company && <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>· {c.company}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: "1px solid " + T.border,
          display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleAdd} disabled={loading || selected.size === 0} style={{
            padding: "8px 22px", borderRadius: 7, border: "none",
            background: T.accent, color: "#fff",
            cursor: (loading || selected.size === 0) ? "not-allowed" : "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            opacity: selected.size === 0 ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Add {selected.size > 0 ? selected.size : ""} Recipient{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Detail ───────────────────────────────────────────────────────────

function CampaignDetail({ campaignId, onBack, onUpdated }) {
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [recipLoading, setRecipLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  const loadCampaign = useCallback(async () => {
    try {
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadRecipients = useCallback(async () => {
    setRecipLoading(true);
    try {
      const params = { page, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRecipients(campaignId, params);
      setRecipients(data.data);
      setRecipientTotal(data.total);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRecipLoading(false);
    }
  }, [campaignId, page, statusFilter]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);
  useEffect(() => { if (campaign) loadRecipients(); }, [campaign, loadRecipients]);

  async function handleAction(action) {
    setActionLoading(true);
    try {
      let result;
      if (action === "send")   result = await sendCampaign(campaignId);
      if (action === "pause")  result = await pauseCampaign(campaignId);
      if (action === "resume") result = await resumeCampaign(campaignId);

      if (action === "send") toast.success(result.message || "Campaign is sending.");
      else toast.success(`Campaign ${action}d.`);

      await loadCampaign();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !campaign) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={22} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const sentCount    = campaign.sent_count    || 0;
  const openRate     = pct(campaign.opened_count, sentCount);
  const clickRate    = pct(campaign.clicked_count, sentCount);
  const totalRecips  = campaign.recipient_stats
    ? Object.values(campaign.recipient_stats).reduce((a, b) => a + b, 0)
    : recipientTotal;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid " + T.border,
        background: T.surface, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={onBack} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "none", border: "none", color: T.muted,
            cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0, flexShrink: 0,
          }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {campaign.name}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              Subject: {campaign.subject || "—"}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={campaign.status === "running"}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 7,
              border: "1px solid " + T.border, background: T.surface,
              color: T.sub, cursor: campaign.status === "running" ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 500,
              opacity: campaign.status === "running" ? 0.5 : 1,
            }}
          >
            <Users size={13} /> Add Recipients
          </button>

          {campaign.status === "draft" && (
            <button onClick={() => handleAction("send")} disabled={actionLoading} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 7, border: "none",
              background: "#16a34a", color: "#fff",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              opacity: actionLoading ? 0.7 : 1,
            }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
              Send Campaign
            </button>
          )}
          {campaign.status === "running" && (
            <button onClick={() => handleAction("pause")} disabled={actionLoading} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 7, border: "none",
              background: T.amber, color: "#fff",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              opacity: actionLoading ? 0.7 : 1,
            }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Pause size={13} />}
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button onClick={() => handleAction("resume")} disabled={actionLoading} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 7, border: "none",
              background: T.accent, color: "#fff",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              opacity: actionLoading ? 0.7 : 1,
            }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
              Resume
            </button>
          )}
          <button onClick={loadCampaign} title="Refresh" style={{
            padding: "7px 10px", borderRadius: 7, border: "1px solid " + T.border,
            background: T.surface, color: T.muted, cursor: "pointer",
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid " + T.border,
        background: T.panel, flexShrink: 0,
        display: "flex", gap: 12,
      }}>
        <StatCard icon={Users}             label="Total Recipients"  value={fmt(totalRecips)}              />
        <StatCard icon={Mail}              label="Sent"              value={fmt(sentCount)}                />
        <StatCard icon={Eye}               label="Opened"            value={fmt(campaign.opened_count)}    sub={openRate + "% open rate"}  color={T.green} />
        <StatCard icon={MousePointerClick} label="Clicked"           value={fmt(campaign.clicked_count)}   sub={clickRate + "% CTR"}       color={T.blue}  />
        <StatCard icon={AlertCircle}       label="Bounced"           value={fmt(campaign.bounced_count)}   color={T.red}  />
      </div>

      {/* Recipients table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Recipients <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>({fmt(recipientTotal)} total)</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              padding: "6px 10px", borderRadius: 7, border: "1px solid " + T.border,
              background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(RECIPIENT_STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {recipLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={20} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : recipients.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            border: "1px dashed " + T.border, borderRadius: 10, color: T.muted, fontSize: 13,
          }}>
            {statusFilter ? "No recipients with this status." : "No recipients yet. Click \"Add Recipients\" to get started."}
          </div>
        ) : (
          <div style={{ border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden", background: T.surface }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
              padding: "10px 16px", background: T.panel,
              borderBottom: "1px solid " + T.border,
              fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <div>Contact</div>
              <div>Email</div>
              <div>Status</div>
              <div>Sent</div>
              <div>Opened</div>
            </div>

            {recipients.map(r => {
              const cfg = RECIPIENT_STATUS_CFG[r.status] || { label: r.status, color: T.muted };
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
                    padding: "10px 16px", borderBottom: "1px solid " + T.border,
                    fontSize: 12, color: T.text, alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{r.first_name} {r.last_name || ""}</div>
                  <div style={{ color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                  <div>
                    <span style={{ color: cfg.color, fontWeight: 600, fontSize: 11 }}>{cfg.label}</span>
                    {r.error_message && (
                      <div style={{ fontSize: 10, color: T.red, marginTop: 2 }}>{r.error_message}</div>
                    )}
                  </div>
                  <div style={{ color: T.muted }}>{fmtTime(r.sent_at)}</div>
                  <div style={{ color: T.muted }}>{fmtTime(r.opened_at)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {recipientTotal > 50 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              padding: "6px 14px", borderRadius: 7, border: "1px solid " + T.border,
              background: T.surface, color: T.sub, cursor: page === 1 ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12,
            }}>Previous</button>
            <span style={{ padding: "6px 12px", fontSize: 12, color: T.muted }}>
              Page {page} of {Math.ceil(recipientTotal / 50)}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(recipientTotal / 50)} style={{
              padding: "6px 14px", borderRadius: 7, border: "1px solid " + T.border,
              background: T.surface, color: T.sub,
              cursor: page >= Math.ceil(recipientTotal / 50) ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 12,
            }}>Next</button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddRecipientsModal
          campaignId={campaignId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { loadCampaign(); loadRecipients(); }}
        />
      )}
    </div>
  );
}

// ─── Campaigns List ────────────────────────────────────────────────────────────

function CampaignsList({ onSelect, onCreated, scopedCompany }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this campaign and all its recipient data?")) return;
    setDeleting(id);
    try {
      await deleteCampaign(id);
      setCampaigns(cs => cs.filter(c => c.id !== id));
      toast.success("Campaign deleted.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  const total     = campaigns.length;
  const running   = campaigns.filter(c => c.status === "running").length;
  const completed = campaigns.filter(c => c.status === "completed").length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid " + T.border,
        background: T.surface, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Email Campaigns</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {total} campaign{total !== 1 ? "s" : ""} · {running} running · {completed} completed
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} title="Refresh" style={{
            padding: "7px 10px", borderRadius: 7, border: "1px solid " + T.border,
            background: T.surface, color: T.muted, cursor: "pointer",
          }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowCreate(true)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 16px", borderRadius: 7, border: "none",
            background: T.accent, color: "#fff", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={22} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "72px 24px",
            border: "1px dashed " + T.border, borderRadius: 12, color: T.muted,
          }}>
            <Megaphone size={36} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: T.sub, marginBottom: 8 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first campaign to start reaching out to contacts.</div>
            <button onClick={() => setShowCreate(true)} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: T.accent, color: "#fff", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            }}>
              <Plus size={14} /> New Campaign
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden", background: T.surface }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 80px 120px",
              padding: "10px 16px", background: T.panel,
              borderBottom: "1px solid " + T.border,
              fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <div>Campaign</div>
              <div>Status</div>
              <div>Sent</div>
              <div>Open %</div>
              <div>Click %</div>
              <div>Bounced</div>
              <div>Created</div>
            </div>

            {campaigns.map(c => {
              const openRate  = pct(c.opened_count,  c.sent_count);
              const clickRate = pct(c.clicked_count, c.sent_count);
              const isDel     = deleting === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 80px 120px",
                    padding: "12px 16px", borderBottom: "1px solid " + T.border,
                    cursor: "pointer", transition: "background 0.1s", alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.panel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {c.subject || "No subject"}
                      {c.template && <span style={{ marginLeft: 8, color: T.dim }}>· {c.template.name}</span>}
                    </div>
                  </div>
                  <div><StatusBadge status={c.status} /></div>
                  <div style={{ fontSize: 12, color: T.text }}>{fmt(c.sent_count)}</div>
                  <div style={{ fontSize: 12, color: openRate > 0 ? T.green : T.muted }}>{openRate}%</div>
                  <div style={{ fontSize: 12, color: clickRate > 0 ? T.blue : T.muted }}>{clickRate}%</div>
                  <div style={{ fontSize: 12, color: c.bounced_count > 0 ? T.red : T.muted }}>{fmt(c.bounced_count)}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                    <button
                      onClick={e => handleDelete(c.id, e)}
                      disabled={isDel || c.status === "running"}
                      style={{
                        padding: "4px 6px", borderRadius: 5, border: "none",
                        background: "transparent", color: T.muted,
                        cursor: (isDel || c.status === "running") ? "not-allowed" : "pointer",
                        opacity: c.status === "running" ? 0.3 : 1,
                      }}
                      title={c.status === "running" ? "Pause campaign before deleting" : "Delete campaign"}
                    >
                      {isDel ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCampaignModal
          scopedCompany={scopedCompany}
          onClose={() => setShowCreate(false)}
          onCreate={row => { setCampaigns(cs => [row, ...cs]); onCreated?.(row); }}
        />
      )}
    </div>
  );
}

// ─── Page Root ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone, ready: false },
  { id: "sequences", label: "Sequences", icon: Layers,    ready: false },
];

export default function PageMarketing() {
  const { scopedCompany } = useApp();
  const [activeSection, setActiveSection] = useState("campaigns");
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Sub-sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        background: T.surface, borderRight: "1px solid " + T.border,
        display: "flex", flexDirection: "column", paddingTop: 16,
      }}>
        <div style={{
          padding: "0 14px 10px",
          fontSize: 10, fontWeight: 700, color: T.muted,
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          Marketing
        </div>

        {SECTIONS.map(s => {
          const Icon = s.icon;
          const sel  = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setSelectedCampaignId(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "10px 14px",
                background: sel ? T.accentLow : "transparent",
                borderLeft: sel ? "3px solid " + T.accent : "3px solid transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                color: sel ? T.accent : T.sub,
                fontSize: 13, fontWeight: sel ? 600 : 400,
                textAlign: "left", transition: "all 0.1s",
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = T.panel; e.currentTarget.style.color = T.text; } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.sub; } }}
            >
              <Icon size={15} />
              {s.label}
              {!s.ready && (
                <span style={{
                  marginLeft: "auto", fontSize: 9, fontWeight: 700,
                  background: T.amber + "18", color: T.amber,
                  border: "1px solid " + T.amber + "40",
                  borderRadius: 4, padding: "2px 6px", letterSpacing: "0.04em",
                }}>SOON</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", background: T.bg, overflow: "hidden", minWidth: 0 }}>
        {activeSection === "campaigns" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, background: T.accentLow,
                border: "1px solid " + T.accent + "30",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
              }}>
                <Megaphone size={28} color={T.accent} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>Campaigns — Coming Soon</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                Email campaigns with scheduling, audience targeting, open/click tracking, and detailed analytics are on the way.
              </div>
              <div style={{
                marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 20,
                background: T.amber + "18", color: T.amber,
                border: "1px solid " + T.amber + "40",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
              }}>
                COMING SOON
              </div>
            </div>
          </div>
        ) : (
          /* Sequences — Coming Soon */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 380, padding: "0 24px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, background: T.accentLow,
                border: "1px solid " + T.accent + "30",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
              }}>
                <Layers size={28} color={T.accent} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>Sequences — Coming Soon</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                Automate follow-up sequences with timed emails, calls, and tasks assigned to reps.
              </div>
              <div style={{
                marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 20,
                background: T.amber + "18", color: T.amber,
                border: "1px solid " + T.amber + "40",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
              }}>
                COMING SOON
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
