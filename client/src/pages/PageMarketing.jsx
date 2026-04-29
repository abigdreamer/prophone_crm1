import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useSSE } from "../hooks/useSSE";
import {
  Megaphone, Plus, Send, Pause, Play, Trash2,
  ChevronLeft, Users, Mail, Eye, MousePointerClick,
  AlertCircle, CheckCircle2, Loader2, Search, Check,
  RefreshCw, FlaskConical, BarChart2, MoreVertical, Pencil, Copy,
} from "lucide-react";
import T from "../theme";
import { useApp } from "../App";
import { useToast } from "../hooks/useToast";
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  getRecipients, addRecipients, addGroupRecipients,
  sendCampaign, pauseCampaign, resumeCampaign, resendCampaign,
  getRecipientEvents,
} from "../api/campaigns.api";
import { getEmailTemplates } from "../api/emailTemplates.api";
import { getCompany } from "../api/companies.api";
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
                  <option value="">Select a template</option>
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
                    <option value="">Same as Variant A</option>
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

// ─── Template preview card (used in wizard step 2) ────────────────────────────
function TemplatePreviewCard({ template, selected, onSelect }) {
  return (
    <div onClick={onSelect} style={{
      border: "2px solid " + (selected ? T.accent : T.border),
      borderRadius: 10, cursor: "pointer", overflow: "hidden",
      height: 160, position: "relative",
      boxShadow: selected ? "0 0 0 3px " + T.accent + "30" : "none",
      transition: "all 0.15s",
    }}>
      <div style={{ height: 126, overflow: "hidden", position: "relative", background: "#f8fafc" }}>
        {template.html_output ? (
          <iframe srcDoc={template.html_output} sandbox="allow-same-origin"
            style={{ position: "absolute", top: 0, left: 0, width: 600, height: 480, border: "none", pointerEvents: "none", transformOrigin: "top left", transform: "scale(0.295)" }}
            title="preview" />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 12 }}>No preview</div>
        )}
        {selected && (
          <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={11} color="#fff" />
          </div>
        )}
      </div>
      <div style={{ padding: "5px 8px", background: "#fff", borderTop: "1px solid " + T.border }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{template.name}</div>
      </div>
    </div>
  );
}

// ─── Create Campaign Wizard (new campaigns only) ───────────────────────────────
function CreateCampaignWizard({ onClose, onCreate, scopedCompany }) {
  const { clientId } = useApp();
  const [step,      setStep]      = useState(1);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState({
    type: "regular", name: "", template_id: "", subject: "",
    from_name: "", from_email: "", ab_subject_b: "", ab_template_id_b: "", ab_same_as_a: false,
  });
  const toast = useToast();
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const total = 2;

  useEffect(() => {
    getEmailTemplates()
      .then(all => setTemplates((all || []).filter(t => t.status === "published")))
      .catch(() => {});
    const pid = clientId || scopedCompany;
    if (pid) {
      getCompany(pid)
        .then(c => { if (c?.name) set("from_name", c.name); })
        .catch(() => {});
    }
  }, []);

  function handleTemplateSelect(t) {
    set("template_id", t.id);
    if (t.subject) set("subject", t.subject);
    const fe = t.json_structure?.from || "";
    if (fe) set("from_email", fe);
  }

  function handleTemplateBSelect(t) {
    set("ab_template_id_b", t.id);
    if (t.subject) set("ab_subject_b", t.subject);
  }

  function canNext() {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) {
      const base = !!form.template_id && form.subject.trim().length > 0;
      if (form.type === "ab") return base && form.ab_subject_b.trim().length > 0;
      return base;
    }
    return false;
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const payload = {
        name:             form.name.trim(),
        subject:          form.subject.trim(),
        from_name:        form.from_name.trim(),
        from_email:       form.from_email.trim(),
        template_id:      form.template_id || null,
        ab_subject_b:     form.type === "ab" ? form.ab_subject_b.trim() : "",
        ab_template_id_b: form.type === "ab" ? (form.ab_same_as_a ? null : (form.ab_template_id_b || null)) : null,
      };
      if (scopedCompany) payload.prophone_id = scopedCompany;
      const row = await createCampaign(payload);
      onCreate?.(row);
      toast.success("Campaign created.");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inp = { width: "100%", padding: "9px 12px", boxSizing: "border-box", background: T.panel, border: "1px solid " + T.border, borderRadius: 7, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 11, fontWeight: 600, color: T.sub, display: "block", marginBottom: 5 };
  const stepLabels = ["Campaign info", "Template & content"];
  const isAB = form.type === "ab";
  const modalWidth = step === 2 && isAB ? 860 : 600;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 16, width: modalWidth, maxWidth: "96vw", maxHeight: "90vh", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid " + T.border, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Create an email campaign</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {Array.from({ length: total }, (_, i) => (
              <Fragment key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: step > i + 1 ? T.accent : step === i + 1 ? T.accent : T.border, color: step >= i + 1 ? "#fff" : T.muted }}>
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 12, color: step === i + 1 ? T.text : T.muted, fontWeight: step === i + 1 ? 600 : 400 }}>{stepLabels[i]}</span>
                </div>
                {i < total - 1 && <div style={{ flex: 1, height: 1, background: T.border, margin: "0 10px" }} />}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={lbl}>Campaign type</label>
                <div style={{ display: "flex", background: T.panel, borderRadius: 10, padding: 3, border: "1px solid " + T.border }}>
                  {[{ v: "regular", label: "Regular" }, { v: "ab", label: "A/B Test" }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => set("type", v)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: form.type === v ? 700 : 400, background: form.type === v ? T.surface : "transparent", color: form.type === v ? T.accent : T.muted, boxShadow: form.type === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {isAB && (
                  <div style={{ marginTop: 8, fontSize: 12, color: T.muted, padding: "8px 12px", background: T.panel, borderRadius: 7, border: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 7 }}>
                    <FlaskConical size={12} color={T.accent} />
                    Recipients will be split 50/50 between Variant A and Variant B.
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Campaign name *</label>
                <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Q2 Towing Outreach" autoFocus />
              </div>
            </div>
          )}

          {/* Step 2 — Regular */}
          {step === 2 && !isAB && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={lbl}>Select a template * <span style={{ fontWeight: 400, color: T.muted }}>(published only)</span></label>
                {templates.length === 0 ? (
                  <div style={{ padding: "14px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
                    No published templates. Publish a template in the Email Builder first.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {templates.map(t => (
                      <TemplatePreviewCard key={t.id} template={t} selected={form.template_id === t.id} onSelect={() => handleTemplateSelect(t)} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Subject line *</label>
                <input style={inp} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. {{firstName}}, let's talk fleet savings" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>From name</label>
                  <input style={inp} value={form.from_name} onChange={e => set("from_name", e.target.value)} placeholder="ProPhone CRM" />
                </div>
                <div>
                  <label style={lbl}>From email</label>
                  <input style={inp} type="email" value={form.from_email} onChange={e => set("from_email", e.target.value)} placeholder="hello@yourdomain.com" />
                </div>
              </div>
              <div style={{ padding: "9px 12px", background: T.panel, borderRadius: 7, fontSize: 11, color: T.muted, border: "1px solid " + T.border }}>
                <strong style={{ color: T.sub }}>Merge tags:</strong>{" "}
                {MERGE_TAGS.map(t => <code key={t.key} style={{ background: T.border, borderRadius: 3, padding: "1px 5px", marginRight: 4, fontSize: 10, color: T.accent }}>{`{{${t.key}}}`}</code>)}
              </div>
            </div>
          )}

          {/* Step 2 — A/B side by side */}
          {step === 2 && isAB && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Variant A */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, background: T.panel, border: "1px solid " + T.accent + "50", borderRadius: 10, padding: "14px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: "0.06em" }}>VARIANT A</div>
                  <div>
                    <label style={lbl}>Template * <span style={{ fontWeight: 400, color: T.muted }}>(published)</span></label>
                    {templates.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#92400e", padding: "8px 10px", background: "#fffbeb", borderRadius: 6 }}>No published templates.</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {templates.map(t => (
                          <TemplatePreviewCard key={t.id} template={t} selected={form.template_id === t.id} onSelect={() => handleTemplateSelect(t)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={lbl}>Subject A *</label>
                    <input style={inp} value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. {{firstName}}, let's talk savings" />
                  </div>
                </div>

                {/* Variant B */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, background: T.panel, border: "1px solid #f59e0b50", borderRadius: 10, padding: "14px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>VARIANT B</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <label style={{ ...lbl, marginBottom: 0 }}>Template</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: T.muted, fontWeight: 400 }}>
                        <input type="checkbox" checked={form.ab_same_as_a}
                          onChange={e => set("ab_same_as_a", e.target.checked)}
                          style={{ cursor: "pointer", accentColor: "#f59e0b" }} />
                        Same as A
                      </label>
                    </div>
                    {form.ab_same_as_a ? (
                      <div style={{ padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, fontSize: 12, color: "#92400e" }}>
                        Using the same template as Variant A.
                      </div>
                    ) : templates.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#92400e", padding: "8px 10px", background: "#fffbeb", borderRadius: 6 }}>No published templates.</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {templates.map(t => (
                          <TemplatePreviewCard key={t.id} template={t} selected={form.ab_template_id_b === t.id} onSelect={() => handleTemplateBSelect(t)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={lbl}>Subject B *</label>
                    <input style={inp} value={form.ab_subject_b} onChange={e => set("ab_subject_b", e.target.value)} placeholder="e.g. Special offer inside, {{firstName}}" />
                  </div>
                </div>
              </div>

              {/* Shared sender info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>From name</label>
                  <input style={inp} value={form.from_name} onChange={e => set("from_name", e.target.value)} placeholder="ProPhone CRM" />
                </div>
                <div>
                  <label style={lbl}>From email</label>
                  <input style={inp} type="email" value={form.from_email} onChange={e => set("from_email", e.target.value)} placeholder="hello@yourdomain.com" />
                </div>
              </div>
              <div style={{ padding: "9px 12px", background: T.panel, borderRadius: 7, fontSize: 11, color: T.muted, border: "1px solid " + T.border }}>
                <strong style={{ color: T.sub }}>Merge tags:</strong>{" "}
                {MERGE_TAGS.map(t => <code key={t.key} style={{ background: T.border, borderRadius: 3, padding: "1px 5px", marginRight: 4, fontSize: 10, color: T.accent }}>{`{{${t.key}}}`}</code>)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid " + T.border, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <button type="button" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          <button type="button" disabled={!canNext() || loading} onClick={step === total ? handleCreate : () => setStep(s => s + 1)}
            style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", cursor: (!canNext() || loading) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, opacity: canNext() ? 1 : 0.55, display: "flex", alignItems: "center", gap: 7 }}>
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {step === total ? "Create campaign" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Recipients Modal ──────────────────────────────────────────────────────
function AddRecipientsModal({ campaignId, campaign, onClose, onAdded, groups = [] }) {
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
                    <option value="">Choose a group </option>
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
  const [copied, setCopied] = useState(false);
  const canDelete = inputValue === campaign.name;

  function copyName() {
    navigator.clipboard.writeText(campaign.name).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
            <label style={{ fontSize: 11, fontWeight: 600, color: T.sub, display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              Type <strong style={{ color: T.text }}>{campaign.name}</strong>
              <button
                type="button"
                onClick={copyName}
                title="Copy campaign name"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, border: "1px solid " + T.border, background: copied ? "#dcfce7" : T.panel, color: copied ? "#16a34a" : T.muted, cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s" }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
              to confirm
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

// ─── Resend Campaign Modal ─────────────────────────────────────────────────────
const RESEND_OPTIONS = [
  { value: "bounced",   label: "Bounced",              desc: "Hard / soft bounces",           color: "#dc2626" },
  { value: "failed",    label: "Failed",               desc: "Delivery failures",              color: "#dc2626" },
  { value: "delivered", label: "Delivered (not opened)", desc: "Received but never opened",   color: "#0d9488" },
  { value: "sent",      label: "Sent (not delivered)", desc: "Accepted, delivery unconfirmed", color: "#6366f1" },
  { value: "opened",    label: "Opened (not clicked)", desc: "Opened but didn't click",        color: "#16a34a" },
  { value: "clicked",   label: "Clicked",              desc: "Already engaged",                color: "#059669" },
];

function ResendCampaignModal({ campaign, onClose, onConfirm, loading }) {
  const rs = campaign.recipient_stats || {};
  const [selected, setSelected] = useState(["bounced", "failed"]);

  function toggle(value) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  }

  function selectAll() { setSelected(RESEND_OPTIONS.map(o => o.value)); }
  function clearAll()   { setSelected([]); }

  const totalQueued = selected.reduce((acc, s) => acc + (rs[s] || 0), 0);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: 14, width: 500,
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={15} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Resend Campaign</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Select which recipients to resend to</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Recipients</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ fontSize: 11, color: T.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Select all</button>
              <span style={{ color: T.border }}>|</span>
              <button onClick={clearAll}  style={{ fontSize: 11, color: T.muted,  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {RESEND_OPTIONS.map(opt => {
              const count    = rs[opt.value] || 0;
              const checked  = selected.includes(opt.value);
              const disabled = count === 0;
              return (
                <button
                  key={opt.value}
                  onClick={() => !disabled && toggle(opt.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 8, border: "1.5px solid",
                    borderColor: checked ? opt.color + "60" : T.border,
                    background: checked ? opt.color + "08" : T.panel,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.45 : 1,
                    textAlign: "left", fontFamily: "inherit", transition: "all 0.12s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: "2px solid " + (checked ? opt.color : T.border),
                    background: checked ? opt.color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: checked ? opt.color : T.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: count > 0 ? opt.color : T.muted,
                    minWidth: 32, textAlign: "right",
                  }}>
                    {count.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>

          {totalQueued > 0 && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: T.accent + "10", border: "1px solid " + T.accent + "30" }}>
              <div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>
                {totalQueued.toLocaleString()} recipient{totalQueued === 1 ? "" : "s"} will be re-queued for delivery
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                Their delivery history will be cleared and new emails will be sent.
              </div>
            </div>
          )}
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
            onClick={() => onConfirm(selected)}
            disabled={totalQueued === 0 || loading}
            style={{
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: totalQueued > 0 && !loading ? T.accent : T.accent + "60",
              color: "#fff", cursor: totalQueued > 0 && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            <Send size={13} />
            Resend to {totalQueued.toLocaleString()} recipients
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

  const sentA   = A.sent    || 0;
  const sentB   = B.sent    || 0;
  const openA   = A.opened  || 0;
  const openB   = B.opened  || 0;
  const clickA  = A.clicked || 0;
  const clickB  = B.clicked || 0;

  const winner = openA > openB ? "A" : openB > openA ? "B" : null;

  const col = (label, val, color) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.text }}>{fmt(val)}</div>
      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  );

  const card = (variant, subject, sent, opened, clicked, accent) => (
    <div style={{ flex: 1, background: T.surface, border: "2px solid " + (winner === variant ? accent : T.border), borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: accent + "20", color: accent, borderRadius: 4, padding: "2px 7px" }}>VARIANT {variant}</span>
        {winner === variant && <span style={{ fontSize: 10, color: accent, fontWeight: 700 }}>★ Winner</span>}
      </div>
      <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, fontStyle: "italic" }}>"{subject}"</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
        {col("Sent",    sent,    T.text)}
        {col("Opened",  opened,  opened  > 0 ? T.green : T.muted)}
        {col("Clicked", clicked, clicked > 0 ? T.blue  : T.muted)}
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
  const [variantFilter, setVariantFilter] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [recipLoading, setRecipLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showResendModal,   setShowResendModal]   = useState(false);
  const [expandedRecipient, setExpandedRecipient] = useState(null);
  const [recipientEvents,   setRecipientEvents]   = useState({});
  const toast = useToast();

  async function toggleRecipientEvents(r) {
    const next = expandedRecipient === r.id ? null : r.id;
    setExpandedRecipient(next);
    if (next && !recipientEvents[next]) {
      try {
        const evts = await getRecipientEvents(campaignId, next);
        setRecipientEvents(m => ({ ...m, [next]: evts }));
      } catch { /* ignore */ }
    }
  }

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

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(recipientSearch); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [recipientSearch]);

  const loadRecipients = useCallback(async () => {
    setRecipLoading(true);
    try {
      const params = { page, limit: 50 };
      if (statusFilter)    params.status  = statusFilter;
      if (variantFilter)   params.variant = variantFilter;
      if (searchDebounced) params.search  = searchDebounced;
      const data = await getRecipients(campaignId, params);
      setRecipients(data.data);
      setRecipientTotal(data.total);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRecipLoading(false);
    }
  }, [campaignId, page, statusFilter, variantFilter, searchDebounced]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);
  useEffect(() => { if (campaign) loadRecipients(); }, [campaign, loadRecipients]);

  // Real-time stats from Resend webhooks via SSE
  const handleSSE = useCallback((event, data) => {
    if (event === "campaign_update" && data.campaign_id === campaignId) {
      setCampaign(prev => prev ? { ...prev, ...data } : prev);
    }
  }, [campaignId]);
  useSSE(handleSSE);

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

  async function handleResend(statuses) {
    setActionLoading(true);
    try {
      const result = await resendCampaign(campaignId, statuses);
      toast.success(result.message || "Campaign re-queued.");
      setShowResendModal(false);
      await loadCampaign();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !campaign) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={22} color={T.accent} style={{ animation: "spin 1s linear infinite" }} /></div>;
  }

  const sentCount = campaign.sent_count || 0;
  const rs = campaign.recipient_stats || {};
  // Cumulative: a "clicked" recipient also counts as opened and delivered
  const deliveredCount = (rs.delivered || 0) + (rs.opened || 0) + (rs.clicked || 0);
  const openedCount    = (rs.opened    || 0) + (rs.clicked || 0);
  const clickedCount   = rs.clicked  || 0;
  const bouncedCount   = rs.bounced  || 0;
  const totalRecips    = Object.values(rs).reduce((a, b) => a + b, 0) || recipientTotal;

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
          {["completed", "paused", "failed"].includes(campaign.status) && (
            <button onClick={() => setShowResendModal(true)} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, opacity: actionLoading ? 0.7 : 1 }}>
              <Send size={13} /> Resend Campaign
            </button>
          )}
          <button onClick={loadCampaign} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Overall stats */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid " + T.border, background: T.panel, flexShrink: 0, display: "flex", gap: 12 }}>
        <StatCard icon={Users}             label="Total Recipients"  value={fmt(totalRecips)} />
        <StatCard icon={Mail}              label="Sent"              value={fmt(sentCount)}    sub={deliveredCount > 0 ? `${deliveredCount} delivered` : "awaiting delivery"} />
        <StatCard icon={Eye}               label="Opened"            value={fmt(openedCount)}  color={T.green} sub={`${pct(openedCount, sentCount)}% open rate`} />
        <StatCard icon={MousePointerClick} label="Clicked"           value={fmt(clickedCount)} color={T.blue}  sub={`${pct(clickedCount, openedCount)}% click rate`} />
        <StatCard icon={AlertCircle}       label="Bounced"           value={fmt(bouncedCount)} color={T.red}   sub={bouncedCount > 0 ? `${pct(bouncedCount, sentCount)}% bounce rate` : undefined} />
      </div>

      {/* A/B results panel */}
      <ABStatsPanel campaign={campaign} />

      {/* Recipients table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Recipients <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>({fmt(recipientTotal)} total)</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search name or email…"
              value={recipientSearch}
              onChange={e => setRecipientSearch(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit", width: 200, outline: "none" }}
            />
            {campaign.ab_subject_b && (
              <select value={variantFilter} onChange={e => { setVariantFilter(e.target.value); setPage(1); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                <option value="">All variants</option>
                <option value="A">Variant A</option>
                <option value="B">Variant B</option>
              </select>
            )}
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
              <option value="">All statuses</option>
              {Object.entries(RECIPIENT_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
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
              const cfg      = RECIPIENT_STATUS_CFG[r.status] || { label: r.status, color: T.muted };
              const expanded = expandedRecipient === r.id;
              const evts     = recipientEvents[r.id] || [];
              return (
                <div key={r.id} style={{ borderBottom: "1px solid " + T.border }}>
                  <div onClick={() => toggleRecipientEvents(r)} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 1fr 1fr 1fr", padding: "10px 16px", fontSize: 12, color: T.text, alignItems: "center", cursor: "pointer", background: expanded ? T.panel : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = T.panel + "80"; }}
                    onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ fontWeight: 500 }}>{(r.first_name || r.last_name) ? `${r.first_name || ""} ${r.last_name || ""}`.trim() : r.email}</div>
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
                  {expanded && (
                    <div style={{ padding: "10px 16px 14px 16px", background: "#f8fafc", borderTop: "1px solid " + T.border }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Event History</div>
                      {evts.length === 0 ? (
                        <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No events recorded yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {evts.map(e => (
                            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: (RECIPIENT_STATUS_CFG[e.event] || { color: T.muted }).color, flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: (RECIPIENT_STATUS_CFG[e.event] || { color: T.text }).color, textTransform: "capitalize" }}>{e.event}</span>
                              <span style={{ color: T.muted }}>{fmtTime(e.occurred_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
          campaign={campaign}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { loadCampaign(); loadRecipients(); }}
        />
      )}
      {showResendModal && (
        <ResendCampaignModal
          campaign={campaign}
          loading={actionLoading}
          onClose={() => setShowResendModal(false)}
          onConfirm={handleResend}
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
  const [duplicating, setDuplicating] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

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

  async function handleDuplicate(c, e) {
    e.stopPropagation();
    setMenuOpen(null);
    setDuplicating(c.id);
    try {
      const payload = {
        name:             c.name + " (Copy)",
        subject:          c.subject          || "",
        from_name:        c.from_name        || "",
        from_email:       c.from_email       || "",
        template_id:      c.template_id      || null,
        ab_subject_b:     c.ab_subject_b     || "",
        ab_template_id_b: c.ab_template_id_b || null,
      };
      if (scopedCompany) payload.prophone_id = scopedCompany;
      const row = await createCampaign(payload);
      setCampaigns(cs => [row, ...cs]);
      toast.success("Campaign duplicated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDuplicating(null);
    }
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
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.sub, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Refresh
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
              <div>Campaign</div><div>Status</div><div>Sent</div><div>Opened</div><div>Clicked</div><div>Bounced</div><div>Created</div>
            </div>
            {campaigns.map(c => {
              const isDel = deleting === c.id;
              const isDup = duplicating === c.id;
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
                  <div style={{ fontSize: 12, color: c.opened_count  > 0 ? T.green : T.muted }}>{fmt(c.opened_count)}</div>
                  <div style={{ fontSize: 12, color: c.clicked_count > 0 ? T.blue  : T.muted }}>{fmt(c.clicked_count)}</div>
                  <div style={{ fontSize: 12, color: c.bounced_count > 0 ? T.red   : T.muted }}>{fmt(c.bounced_count)}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(c.created_at)}</span>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : c.id); }}
                        disabled={isDel || isDup}
                        style={{ padding: "4px 6px", borderRadius: 5, border: "none", background: "transparent", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        {(isDel || isDup) ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <MoreVertical size={14} />}
                      </button>
                      {isMenuOpen && (
                        <div ref={menuRef} style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200, background: T.surface, border: "1px solid " + T.border, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 130, overflow: "hidden" }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditCampaign(c); setMenuOpen(null); }}
                            disabled={c.status === "running"}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "transparent", color: c.status === "running" ? T.muted : T.text, cursor: c.status === "running" ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left" }}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <div style={{ height: 1, background: T.border }} />
                          <button
                            onClick={e => handleDuplicate(c, e)}
                            disabled={isDup}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "transparent", color: T.text, cursor: isDup ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left", opacity: isDup ? 0.6 : 1 }}
                          >
                            {isDup ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Copy size={13} />} Duplicate
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
        <CreateCampaignWizard
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
