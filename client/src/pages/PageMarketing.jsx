import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Plus, Send, Pause, Play, Trash2,
  ChevronLeft, Users, Mail, Eye, MousePointerClick,
  AlertCircle, CheckCircle2, Loader2, Search,
  RefreshCw, FlaskConical, BarChart2, MoreVertical, Pencil,
} from "lucide-react";
import T from "../theme";
import { useApp } from "../App";
import { useToast } from "../hooks/useToast";
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  getRecipients, addRecipients, addGroupRecipients,
  sendCampaign, pauseCampaign, resumeCampaign, syncCampaign,
} from "../api/campaigns.api";
import { getEmailTemplates } from "../api/emailTemplates.api";
import { MERGE_TAGS } from "../data/mergeTags";

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

// ─── Create / Edit Campaign Modal ─────────────────────────────────────────────
function CreateCampaignModal({ onClose, onCreate, onUpdate, scopedCompany, existing }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name:            existing?.name         || "",
    subject:         existing?.subject      || "",
    from_name:       existing?.from_name    || "",
    from_email:      existing?.from_email   || "",
    template_id:     existing?.template_id  || "",
    ab_enabled:      !!(existing?.ab_subject_b),
    ab_subject_b:    existing?.ab_subject_b    || "",
    ab_template_id_b: existing?.ab_template_id_b || "",
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Only published templates are usable in campaigns
  useEffect(() => {
    getEmailTemplates()
      .then(all => setTemplates((all || []).filter(t => t.status === "published")))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill subject + from_email when a template is selected
  function handleTemplateChange(tid) {
    set("template_id", tid);
    if (!tid) return;
    const t = templates.find(t => t.id === tid);
    if (!t) return;
    if (t.subject) set("subject", t.subject);
    const fromEmail = t.json_structure?.from || "";
    if (fromEmail) set("from_email", fromEmail);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())    return toast.error("Campaign name is required.");
    if (!form.subject.trim()) return toast.error("Subject line is required.");
    if (!form.template_id)    return toast.error("Select a published template.");
    if (form.ab_enabled && !form.ab_subject_b.trim()) return toast.error("Variant B subject is required when A/B test is enabled.");
    setLoading(true);
    try {
      const payload = {
        name:            form.name.trim(),
        subject:         form.subject.trim(),
        from_name:       form.from_name.trim(),
        from_email:      form.from_email.trim(),
        template_id:     form.template_id || null,
        ab_subject_b:     form.ab_enabled ? form.ab_subject_b.trim() : "",
        ab_template_id_b: form.ab_enabled ? (form.ab_template_id_b || null) : null,
      };
      if (!isEdit && scopedCompany) payload.prophone_id = scopedCompany;

      if (isEdit) {
        const row = await updateCampaign(existing.id, payload);
        onUpdate?.(row);
        toast.success("Campaign updated.");
      } else {
        const row = await createCampaign(payload);
        onCreate?.(row);
        toast.success("Campaign created.");
      }
      onClose();
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
        background: T.surface, borderRadius: 14, width: 520,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{isEdit ? "Edit Campaign" : "New Campaign"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div>
            <label style={labelStyle}>Campaign Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Q2 Towing Outreach" autoFocus />
          </div>

          {/* Variant A */}
          <div style={{ background: T.panel, borderRadius: 8, padding: "12px 14px", border: "1px solid " + T.border }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 10, letterSpacing: "0.04em" }}>
              {form.ab_enabled ? "VARIANT A" : "EMAIL"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Template * (published only)</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.template_id} onChange={e => handleTemplateChange(e.target.value)}>
                  <option value="">— Select a template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {templates.length === 0 && (
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 5 }}>No published templates found. Publish a template in the Email Builder first.</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Subject *</label>
                <input style={inputStyle} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder={`e.g. {{firstName}}, let's talk fleet savings`} />
              </div>
            </div>
          </div>

          {/* A/B toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => set("ab_enabled", !form.ab_enabled)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 7,
                border: "1px solid " + (form.ab_enabled ? T.accent : T.border),
                background: form.ab_enabled ? T.accent + "15" : "transparent",
                color: form.ab_enabled ? T.accent : T.sub,
                cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              }}
            >
              <FlaskConical size={13} /> {form.ab_enabled ? "A/B Test On" : "Enable A/B Test"}
            </button>
            {form.ab_enabled && <span style={{ fontSize: 11, color: T.muted }}>Recipients split 50/50 between variants</span>}
          </div>

          {/* Variant B */}
          {form.ab_enabled && (
            <div style={{ background: T.panel, borderRadius: 8, padding: "12px 14px", border: "1px solid " + T.accent + "40" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 10, letterSpacing: "0.04em" }}>VARIANT B</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Subject B *</label>
                  <input style={inputStyle} value={form.ab_subject_b} onChange={e => set("ab_subject_b", e.target.value)} placeholder="e.g. Special offer inside, {{firstName}}" />
                </div>
                <div>
                  <label style={labelStyle}>Template B (optional — defaults to Template A)</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.ab_template_id_b} onChange={e => set("ab_template_id_b", e.target.value)}>
                    <option value="">— Same as Variant A —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

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

          {/* Merge tag hint */}
          <div style={{ padding: "10px 12px", background: T.panel, borderRadius: 7, fontSize: 11, color: T.muted, border: "1px solid " + T.border }}>
            <strong style={{ color: T.sub }}>Available merge tags:</strong>{" "}
            {MERGE_TAGS.map(t => (
              <code key={t.key} style={{ background: T.border, borderRadius: 3, padding: "1px 5px", marginRight: 4, fontSize: 10, color: T.accent }}>{`{{${t.key}}}`}</code>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4, borderTop: "1px solid " + T.border, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {isEdit ? "Save Changes" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Recipients Modal ──────────────────────────────────────────────────────
function AddRecipientsModal({ campaignId, onClose, onAdded, groups = [] }) {
  const { contacts } = useApp();
  const [tab, setTab] = useState("individual"); // "individual" | "group"
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const eligible = contacts.filter(c => c.email && c.email.trim());
  const filtered = search
    ? eligible.filter(c =>
        `${c.firstName} ${c.lastName} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
      )
    : eligible;

  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const groupContactCount = selectedGroup
    ? eligible.filter(c => c.groupId === selectedGroup).length
    : 0;

  async function handleAdd() {
    if (tab === "individual") {
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
    } else {
      if (!selectedGroup) return toast.error("Select a group.");
      setLoading(true);
      try {
        const result = await addGroupRecipients(campaignId, selectedGroup);
        onAdded(result.added);
        onClose();
        toast.success(`${result.added} recipient${result.added !== 1 ? "s" : ""} added from group.`);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  const tabStyle = active => ({
    flex: 1, padding: "8px 0", border: "none",
    background: "transparent", cursor: "pointer",
    fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 400,
    color: active ? T.accent : T.muted,
    borderBottom: active ? "2px solid " + T.accent : "2px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 14, width: 560, maxHeight: "82vh", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 0", borderBottom: "1px solid " + T.border, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Add Recipients</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            <button style={tabStyle(tab === "individual")} onClick={() => setTab("individual")}>Individual Contacts</button>
            <button style={tabStyle(tab === "group")} onClick={() => setTab("group")}>By Group</button>
          </div>
        </div>

        {tab === "individual" ? (
          <>
            <div style={{ padding: "12px 22px", borderBottom: "1px solid " + T.border, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
                <input
                  style={{ width: "100%", padding: "8px 12px 8px 32px", boxSizing: "border-box", background: T.panel, border: "1px solid " + T.border, borderRadius: 7, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, or company…" autoFocus
                />
              </div>
            </div>
            <div style={{ padding: "8px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: T.panel }}>
              <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} style={{ cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: T.muted }}>{selected.size > 0 ? `${selected.size} selected` : `${filtered.length} contacts with email`}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 13 }}>
                  {eligible.length === 0 ? "No contacts with email addresses found." : "No contacts match your search."}
                </div>
              ) : filtered.map(c => (
                <div key={c.id} onClick={() => toggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", cursor: "pointer", borderBottom: "1px solid " + T.border, background: selected.has(c.id) ? T.accentLow : "transparent", transition: "background 0.1s" }}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                      {c.firstName} {c.lastName}
                      {c.company && <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>· {c.company}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: T.muted, fontSize: 13 }}>No contact groups found. Create a group first.</div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.sub, display: "block", marginBottom: 6 }}>Select Group</label>
                  <select
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", background: T.panel, border: "1px solid " + T.border, borderRadius: 7, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
                  >
                    <option value="">— Choose a group —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                {selectedGroup && (
                  <div style={{ padding: "12px 14px", background: T.panel, borderRadius: 8, border: "1px solid " + T.border, fontSize: 13, color: T.sub }}>
                    <Users size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle", color: T.accent }} />
                    ~{groupContactCount} contacts with email in this group will be added as recipients.
                  </div>
                )}
                <div style={{ fontSize: 11, color: T.muted }}>
                  Duplicate emails are automatically skipped.
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ padding: "14px 22px", borderTop: "1px solid " + T.border, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleAdd}
            disabled={loading || (tab === "individual" ? selected.size === 0 : !selectedGroup)}
            style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", cursor: (loading || (tab === "individual" ? selected.size === 0 : !selectedGroup)) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, opacity: (tab === "individual" ? selected.size === 0 : !selectedGroup) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 7 }}
          >
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {tab === "individual" ? `Add ${selected.size > 0 ? selected.size : ""} Recipient${selected.size !== 1 ? "s" : ""}` : "Add Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Campaign Modal ─────────────────────────────────────────────────────
function DeleteCampaignModal({ campaign, onConfirm, onClose, loading }) {
  const [inputValue, setInputValue] = useState("");
  const canDelete = inputValue === campaign.name;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: 14, width: 460,
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={15} color="#dc2626" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Delete Campaign</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 22px 20px" }}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 18, lineHeight: 1.6 }}>
            This will permanently delete{" "}
            <strong style={{ color: T.text }}>"{campaign.name}"</strong> and all recipient data.
            This action cannot be undone.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.sub, display: "block", marginBottom: 6 }}>
              Type <strong style={{ color: T.text }}>{campaign.name}</strong> to confirm
            </label>
            <input
              style={{
                width: "100%", padding: "9px 12px", boxSizing: "border-box",
                background: T.panel, border: "1px solid " + (canDelete ? "#dc2626" : T.border),
                borderRadius: 7, fontSize: 13, color: T.text,
                fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
              }}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={campaign.name}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid " + T.border, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canDelete || loading}
            style={{
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: canDelete && !loading ? "#dc2626" : "#fca5a5",
              color: "#fff", cursor: canDelete && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
              transition: "background 0.15s",
            }}
          >
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── A/B Stats Panel ───────────────────────────────────────────────────────────
function ABStatsPanel({ campaign }) {
  if (!campaign.ab_subject_b || !campaign.ab_stats) return null;
  const A = campaign.ab_stats.A || {};
  const B = campaign.ab_stats.B || {};

  const sentA = A.sent || 0;
  const sentB = B.sent || 0;
  const openA = pct(A.opened || 0, sentA);
  const openB = pct(B.opened || 0, sentB);
  const clickA = pct(A.clicked || 0, sentA);
  const clickB = pct(B.clicked || 0, sentB);

  const winner = openA > openB ? "A" : openB > openA ? "B" : null;

  const col = (label, val, color) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.text }}>{val}</div>
      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  );

  const card = (variant, subject, sent, openRate, clickRate, accent) => (
    <div style={{ flex: 1, background: T.surface, border: "2px solid " + (winner === variant ? accent : T.border), borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: accent + "20", color: accent, borderRadius: 4, padding: "2px 7px" }}>VARIANT {variant}</span>
        {winner === variant && <span style={{ fontSize: 10, color: accent, fontWeight: 700 }}>★ Winner</span>}
      </div>
      <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, fontStyle: "italic" }}>"{subject}"</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
        {col("Sent", fmt(sent), T.text)}
        {col("Open Rate", openRate + "%", openRate > 0 ? T.green : T.muted)}
        {col("CTR", clickRate + "%", clickRate > 0 ? T.blue : T.muted)}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "16px 24px", borderBottom: "1px solid " + T.border, background: T.panel, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <FlaskConical size={14} color={T.accent} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>A/B Test Results</span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {card("A", campaign.subject,      sentA, openA,  clickA,  T.accent)}
        {card("B", campaign.ab_subject_b, sentB, openB,  clickB,  "#f59e0b")}
      </div>
    </div>
  );
}

// ─── Campaign Detail ───────────────────────────────────────────────────────────
function CampaignDetail({ campaignId, onBack, onUpdated }) {
  const { groups } = useApp();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [recipLoading, setRecipLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
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

  async function handleSync() {
    setSyncLoading(true);
    try {
      const result = await syncCampaign(campaignId);
      toast.success(`Synced ${result.updated} of ${result.total_checked} emails from Resend.`);
      await loadCampaign();
      await loadRecipients();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSyncLoading(false);
    }
  }

  if (loading || !campaign) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={22} color={T.accent} style={{ animation: "spin 1s linear infinite" }} /></div>;
  }

  const sentCount   = campaign.sent_count || 0;
  const openRate    = pct(campaign.opened_count,  sentCount);
  const clickRate   = pct(campaign.clicked_count, sentCount);
  const totalRecips = campaign.recipient_stats
    ? Object.values(campaign.recipient_stats).reduce((a, b) => a + b, 0)
    : recipientTotal;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid " + T.border, background: T.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0, flexShrink: 0 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              Subject: {campaign.subject || "—"}
              {campaign.ab_subject_b && <span style={{ marginLeft: 8, background: T.accent + "20", color: T.accent, borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>A/B</span>}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowAddModal(true)} disabled={campaign.status === "running"} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.sub, cursor: campaign.status === "running" ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, opacity: campaign.status === "running" ? 0.5 : 1 }}>
            <Users size={13} /> Add Recipients
          </button>
          {campaign.status === "draft" && (
            <button onClick={() => handleAction("send")} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, border: "none", background: "#16a34a", color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, opacity: actionLoading ? 0.7 : 1 }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />} Send Campaign
            </button>
          )}
          {campaign.status === "running" && (
            <button onClick={() => handleAction("pause")} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, border: "none", background: T.amber, color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, opacity: actionLoading ? 0.7 : 1 }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Pause size={13} />} Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button onClick={() => handleAction("resume")} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, opacity: actionLoading ? 0.7 : 1 }}>
              {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />} Resume
            </button>
          )}
          <button onClick={handleSync} disabled={syncLoading} title="Sync stats from Resend" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: syncLoading ? T.muted : T.accent, cursor: syncLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, opacity: syncLoading ? 0.7 : 1 }}>
            {syncLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />} Sync Stats
          </button>
          <button onClick={loadCampaign} title="Refresh" style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.muted, cursor: "pointer" }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Overall stats */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid " + T.border, background: T.panel, flexShrink: 0, display: "flex", gap: 12 }}>
        <StatCard icon={Users}             label="Total Recipients"  value={fmt(totalRecips)} />
        <StatCard icon={Mail}              label="Sent"              value={fmt(sentCount)} />
        <StatCard icon={Eye}               label="Opened"            value={fmt(campaign.opened_count)}  sub={openRate + "% open rate"}  color={T.green} />
        <StatCard icon={MousePointerClick} label="Clicked"           value={fmt(campaign.clicked_count)} sub={clickRate + "% CTR"}       color={T.blue} />
        <StatCard icon={AlertCircle}       label="Bounced"           value={fmt(campaign.bounced_count)} color={T.red} />
      </div>

      {/* A/B results panel */}
      <ABStatsPanel campaign={campaign} />

      {/* Recipients table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Recipients <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>({fmt(recipientTotal)} total)</span>
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
            <option value="">All statuses</option>
            {Object.entries(RECIPIENT_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {recipLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={20} color={T.accent} style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : recipients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed " + T.border, borderRadius: 10, color: T.muted, fontSize: 13 }}>
            {statusFilter ? "No recipients with this status." : "No recipients yet. Click \"Add Recipients\" to get started."}
          </div>
        ) : (
          <div style={{ border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden", background: T.surface }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 1fr 1fr 1fr", padding: "10px 16px", background: T.panel, borderBottom: "1px solid " + T.border, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>Contact</div><div>Email</div><div>Variant</div><div>Status</div><div>Sent</div><div>Opened</div>
            </div>
            {recipients.map(r => {
              const cfg = RECIPIENT_STATUS_CFG[r.status] || { label: r.status, color: T.muted };
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid " + T.border, fontSize: 12, color: T.text, alignItems: "center" }}>
                  <div style={{ fontWeight: 500 }}>{r.first_name} {r.last_name || ""}</div>
                  <div style={{ color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                  <div>
                    {r.ab_variant === "B"
                      ? <span style={{ fontSize: 10, fontWeight: 700, background: "#f59e0b20", color: "#f59e0b", borderRadius: 3, padding: "2px 6px" }}>B</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, background: T.accent + "20", color: T.accent, borderRadius: 3, padding: "2px 6px" }}>A</span>
                    }
                  </div>
                  <div>
                    <span style={{ color: cfg.color, fontWeight: 600, fontSize: 11 }}>{cfg.label}</span>
                    {r.error_message && <div style={{ fontSize: 10, color: T.red, marginTop: 2 }}>{r.error_message}</div>}
                  </div>
                  <div style={{ color: T.muted }}>{fmtTime(r.sent_at)}</div>
                  <div style={{ color: T.muted }}>{fmtTime(r.opened_at)}</div>
                </div>
              );
            })}
          </div>
        )}

        {recipientTotal > 50 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.sub, cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12 }}>Previous</button>
            <span style={{ padding: "6px 12px", fontSize: 12, color: T.muted }}>Page {page} of {Math.ceil(recipientTotal / 50)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(recipientTotal / 50)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.sub, cursor: page >= Math.ceil(recipientTotal / 50) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12 }}>Next</button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddRecipientsModal
          campaignId={campaignId}
          groups={groups}
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // campaign id with open menu
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

  function handleDelete(campaign, e) {
    e.stopPropagation();
    setDeleteTarget(campaign);
  }

  async function confirmDelete(campaign) {
    setDeleting(campaign.id);
    try {
      await deleteCampaign(campaign.id);
      setCampaigns(cs => cs.filter(c => c.id !== campaign.id));
      setDeleteTarget(null);
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
      <div style={{ padding: "14px 24px", borderBottom: "1px solid " + T.border, background: T.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Email Campaigns</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{total} campaign{total !== 1 ? "s" : ""} · {running} running · {completed} completed</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} title="Refresh" style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.muted, cursor: "pointer" }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 16px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 size={22} color={T.accent} style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 24px", border: "1px dashed " + T.border, borderRadius: 12, color: T.muted }}>
            <Megaphone size={36} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: T.sub, marginBottom: 8 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first campaign to start reaching out to contacts.</div>
            <button onClick={() => setShowCreate(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> New Campaign
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid " + T.border, borderRadius: 10, background: T.surface }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 80px 120px", padding: "10px 16px", background: T.panel, borderBottom: "1px solid " + T.border, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "10px 10px 0 0" }}>
              <div>Campaign</div><div>Status</div><div>Sent</div><div>Open %</div><div>Click %</div><div>Bounced</div><div>Created</div>
            </div>
            {campaigns.map(c => {
              const openRate  = pct(c.opened_count,  c.sent_count);
              const clickRate = pct(c.clicked_count, c.sent_count);
              const isDel = deleting === c.id;
              const isMenuOpen = menuOpen === c.id;
              return (
                <div key={c.id} onClick={() => { setMenuOpen(null); onSelect(c.id); }} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 80px 120px", padding: "12px 16px", borderBottom: "1px solid " + T.border, cursor: "pointer", transition: "background 0.1s", alignItems: "center", position: "relative" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.panel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: T.text }}>
                      {c.name}
                      {c.ab_subject_b && <span style={{ fontSize: 9, fontWeight: 700, background: T.accent + "20", color: T.accent, borderRadius: 3, padding: "1px 5px" }}>A/B</span>}
                    </div>
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : c.id); }}
                        disabled={isDel}
                        style={{ padding: "4px 6px", borderRadius: 5, border: "none", background: "transparent", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        {isDel ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <MoreVertical size={14} />}
                      </button>
                      {isMenuOpen && (
                        <div style={{ position: "absolute", right: 0, bottom: "100%", marginBottom: 4, zIndex: 200, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 130, overflow: "hidden" }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditCampaign(c); setMenuOpen(null); }}
                            disabled={c.status === "running"}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "transparent", color: c.status === "running" ? T.muted : T.text, cursor: c.status === "running" ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left" }}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <div style={{ height: 1, background: T.border }} />
                          <button
                            onClick={e => { handleDelete(c, e); setMenuOpen(null); }}
                            disabled={c.status === "running"}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "transparent", color: c.status === "running" ? T.muted : "#dc2626", cursor: c.status === "running" ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left" }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
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
      {editCampaign && (
        <CreateCampaignModal
          existing={editCampaign}
          onClose={() => setEditCampaign(null)}
          onUpdate={row => setCampaigns(cs => cs.map(c => c.id === row.id ? { ...c, ...row } : c))}
        />
      )}
      {deleteTarget && (
        <DeleteCampaignModal
          campaign={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => confirmDelete(deleteTarget)}
          loading={deleting === deleteTarget.id}
        />
      )}
    </div>
  );
}

// ─── Page Root ─────────────────────────────────────────────────────────────────
export default function PageMarketing() {
  const { scopedCompany } = useApp();
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Sub-sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: T.surface, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", paddingTop: 16 }}>
        <div style={{ padding: "0 14px 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Marketing</div>
        <button
          onClick={() => setSelectedCampaignId(null)}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            width: "100%", padding: "10px 14px",
            background: !selectedCampaignId ? T.accentLow : "transparent",
            borderLeft: !selectedCampaignId ? "3px solid " + T.accent : "3px solid transparent",
            border: "none", cursor: "pointer", fontFamily: "inherit",
            color: !selectedCampaignId ? T.accent : T.sub,
            fontSize: 13, fontWeight: !selectedCampaignId ? 600 : 400,
            textAlign: "left", transition: "all 0.1s",
          }}
          onMouseEnter={e => { if (selectedCampaignId) { e.currentTarget.style.background = T.panel; e.currentTarget.style.color = T.text; } }}
          onMouseLeave={e => { if (selectedCampaignId) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.sub; } }}
        >
          <Megaphone size={15} /> Campaigns
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", background: T.bg, overflow: "hidden", minWidth: 0 }} key={refreshKey}>
        {!selectedCampaignId ? (
          <CampaignsList
            scopedCompany={scopedCompany}
            onSelect={id => setSelectedCampaignId(id)}
            onCreated={() => setRefreshKey(k => k + 1)}
          />
        ) : (
          <CampaignDetail
            campaignId={selectedCampaignId}
            onBack={() => setSelectedCampaignId(null)}
            onUpdated={() => setRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
