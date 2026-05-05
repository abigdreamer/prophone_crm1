import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, RefreshCw, Mail, FlaskConical, CheckCircle2,
  Loader2, Check, Search, Trash2, MoreVertical, Megaphone, ChevronRight,
} from "lucide-react";
import T from "../theme";
import {
  getCampaigns, createCampaign, deleteCampaign,
  getPublishedTemplates, getActivePool, getClients,
} from "../services/api";

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  const diff = (Date.now() - d) / 1000;
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function thisWeekCount(list) {
  const cutoff = Date.now() - 7 * 86400 * 1000;
  return list.filter(c => new Date(c.createdAt) > cutoff).length;
}

// ── Status badge ──────────────────────────────────────────────────────────────

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
      borderRadius: 6, padding: "3px 9px",
    }}>{label}</span>
  );
}

// ── Campaign thumbnail ────────────────────────────────────────────────────────

function CampaignThumb({ campaign }) {
  const isAB = campaign.type === "ab_test";
  const bg   = isAB ? T.purple + "20" : T.accent + "20";
  const bdr  = isAB ? T.purple + "35" : T.accent + "35";
  const col  = isAB ? T.purple : T.accent;
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
      background: bg, border: "1px solid " + bdr,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {isAB ? <FlaskConical size={17} color={col} /> : <Mail size={17} color={col} />}
    </div>
  );
}

// ── Campaign list row (matches TemplatesPage grid style) ─────────────────────

const GRID_COLS = "1fr 1fr 140px 140px 44px";

function CampaignRow({ campaign, isLast, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const templateLabel = [campaign.fromName, campaign.template?.name].filter(Boolean).join(" · ") || "No template";
  const createdLabel  = campaign.createdAt
    ? new Date(campaign.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      onClick={() => onOpen(campaign)}
      onMouseEnter={e => { e.currentTarget.style.background = T.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      style={{
        display: "grid", gridTemplateColumns: GRID_COLS, gap: 0,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid " + T.border,
        borderRadius: isLast ? "0 0 12px 12px" : 0,
        alignItems: "center", cursor: "pointer",
        transition: "background 0.1s", position: "relative",
      }}
    >
      {/* CAMPAIGN col: icon + name + subtitle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <CampaignThumb campaign={campaign} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {campaign.name}
            </span>
            {campaign.type === "ab_test" && (
              <span style={{
                fontSize: 9, fontWeight: 700, flexShrink: 0,
                color: T.purple, background: T.purple + "18",
                border: "1px solid " + T.purple + "30",
                borderRadius: 3, padding: "1px 5px",
              }}>A/B</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {templateLabel}
          </div>
        </div>
      </div>

      {/* SUBJECT col */}
      <div style={{ fontSize: 13, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 16 }}>
        {campaign.subject
          ? campaign.subject
          : <span style={{ color: T.muted, fontStyle: "italic" }}>No subject</span>
        }
      </div>

      {/* STATUS col */}
      <div><StatusBadge status={campaign.status} /></div>

      {/* CREATED col */}
      <div style={{ fontSize: 13, color: T.muted }}>{createdLabel}</div>

      {/* ACTIONS col */}
      <div ref={menuRef} style={{ position: "relative", display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "1px solid transparent", borderRadius: 7,
            color: T.muted, cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
            background: T.card, border: "1px solid " + T.border, borderRadius: 8,
            minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}>
            <button
              onClick={() => { setMenuOpen(false); onDelete(campaign); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", background: "none", border: "none",
                color: T.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                borderRadius: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.red + "12"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Wizard shared ─────────────────────────────────────────────────────────────

function StepDot({ n, active, done, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: active ? T.accent : done ? T.green : T.border,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color: "#fff",
      }}>
        {done ? <Check size={12} /> : n}
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? T.text : T.muted }}>{label}</span>
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid " + T.border }}>
      <StepDot n={1} label="Campaign info"      active={step === 1} done={step > 1} />
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <StepDot n={2} label="Template & content" active={step === 2} done={step > 2} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required, onKeyDown, autoFocus }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 5, letterSpacing: "0.03em" }}>
        {label}{required && <span style={{ color: T.accent, marginLeft: 2 }}>*</span>}
      </div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 7, boxSizing: "border-box",
          background: T.surface, border: "1px solid " + T.border,
          color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}


function TemplatePickerList({ tpls, selected, onSelect, accent, maxHeight = 220 }) {
  if (!tpls.length) return (
    <div style={{ padding: "24px 0", textAlign: "center" }}>
      <Mail size={24} color={T.muted} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 12, color: T.muted }}>No published templates.</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Publish one in Templates first.</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight, overflowY: "auto" }}>
      {tpls.map(t => {
        const sel = selected === t.id;
        return (
          <div key={t.id} onClick={() => onSelect(t.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 7, cursor: "pointer",
            border: "1px solid " + (sel ? accent : T.border), background: sel ? accent + "10" : T.card,
            transition: "border-color 0.1s, background 0.1s",
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, flexShrink: 0, background: (sel ? accent : T.muted) + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={12} color={sel ? accent : T.muted} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
              <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject || "No subject"}</div>
            </div>
            {sel && <CheckCircle2 size={13} color={accent} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Wizard Step 1 ─────────────────────────────────────────────────────────────

function WizardStep1({ form, setForm, onNext, onClose }) {
  const nameOk = form.name.trim().length > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={1} />
      <div style={{ padding: "22px 24px 0" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 8, letterSpacing: "0.04em" }}>CAMPAIGN TYPE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
            {[
              { id: "regular", label: "Regular",  icon: Mail,         desc: "One email to all" },
              { id: "ab_test", label: "A/B Test",  icon: FlaskConical, desc: "Split 50 / 50" },
            ].map(({ id, label, icon: Icon, desc }, i) => {
              const active = form.type === id;
              return (
                <button key={id} onClick={() => setForm(f => ({ ...f, type: id }))} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  padding: "16px 12px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: active ? T.accent + "15" : T.surface, color: active ? T.accent : T.muted,
                  borderRight: i === 0 ? "1px solid " + T.border : "none",
                  transition: "background 0.1s, color 0.1s",
                }}>
                  <Icon size={18} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 400 }}>{label}</span>
                  <span style={{ fontSize: 10, color: active ? T.accent + "cc" : T.muted, textAlign: "center" }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <Field label="Campaign name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
            placeholder="e.g. Q2 Towing Outreach" onKeyDown={e => e.key === "Enter" && nameOk && onNext()} autoFocus />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid " + T.border }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={onNext} disabled={!nameOk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 7, border: "none", background: nameOk ? T.accent : T.border, color: nameOk ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, cursor: nameOk ? "pointer" : "default", fontFamily: "inherit" }}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Wizard Step 2 ─────────────────────────────────────────────────────────────

function WizardStep2({ form, setForm, templates, saving, onBack, onCreate, clientName }) {
  const [tpls, setTpls] = useState(templates);
  const [loading, setLoading] = useState(!templates.length);

  useEffect(() => {
    if (templates.length) { setTpls(templates); return; }
    setLoading(true);
    getPublishedTemplates().then(setTpls).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Pre-fill fromName with client name on mount (only if still blank)
  useEffect(() => {
    if (clientName) {
      setForm(f => ({ ...f, fromName: f.fromName || clientName }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName]);

  // When a template is picked, auto-fill subject (if blank) from template.subject
  const handleSelectTemplate = (id) => {
    const tpl = tpls.find(t => t.id === id);
    setForm(f => ({
      ...f,
      templateId: id,
      subject: f.subject || tpl?.subject || '',
    }));
  };

  const handleSelectTemplateB = (id) => {
    const tpl = tpls.find(t => t.id === id);
    setForm(f => ({
      ...f,
      templateIdB: id,
      subjectB: f.subjectB || tpl?.subject || '',
    }));
  };

  const isAB = form.type === "ab_test";
  const canCreate = form.templateId && !saving;

  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid " + T.border, marginTop: 4 }}>
      <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
      <button onClick={onCreate} disabled={!canCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 7, border: "none", background: canCreate ? T.accent : T.border, color: canCreate ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, cursor: canCreate ? "pointer" : "default", fontFamily: "inherit" }}>
        {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : <><Plus size={13} /> Create Campaign</>}
      </button>
    </div>
  );

  const fromRow = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="From Name"  value={form.fromName}  onChange={v => setForm(f => ({ ...f, fromName: v }))}  placeholder={clientName || "Company name"} />
      <Field label="From Email" type="email" value={form.fromEmail} onChange={v => setForm(f => ({ ...f, fromEmail: v }))} placeholder="sales@yourdomain.com" />
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={2} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 40, color: T.muted, fontSize: 13 }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading templates…
      </div>
      {footer}
    </div>
  );

  if (isAB) {
    const sameTemplate = form.templateIdB === null;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <StepIndicator step={2} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, border: "1px solid " + T.blue + "50", borderRadius: 10, padding: 14, background: T.blue + "04" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.blue, marginBottom: 10, letterSpacing: "0.08em" }}>VARIANT A</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6 }}>Template</div>
              <TemplatePickerList tpls={tpls} selected={form.templateId} onSelect={handleSelectTemplate} accent={T.blue} maxHeight={160} />
              <div style={{ marginTop: 12 }}>
                <Field label="Subject A" required value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Subject for Variant A" />
              </div>
            </div>
            <div style={{ flex: 1, border: "1px solid " + T.orange + "50", borderRadius: 10, padding: 14, background: T.orange + "04" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.orange, marginBottom: 10, letterSpacing: "0.08em" }}>VARIANT B</div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={sameTemplate} onChange={e => setForm(f => ({ ...f, templateIdB: e.target.checked ? null : (tpls.find(t => t.id !== f.templateId)?.id ?? tpls[0]?.id ?? null) }))} style={{ accentColor: T.orange }} />
                <span style={{ fontSize: 11, color: T.muted }}>Same template as A</span>
              </label>
              {!sameTemplate && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6 }}>Template B</div>
                  <TemplatePickerList tpls={tpls} selected={form.templateIdB} onSelect={handleSelectTemplateB} accent={T.orange} maxHeight={120} />
                </>
              )}
              <div style={{ marginTop: 12 }}>
                <Field label="Subject B" required value={form.subjectB} onChange={v => setForm(f => ({ ...f, subjectB: v }))} placeholder="Subject for Variant B" />
              </div>
            </div>
          </div>
          {fromRow}
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={2} />
      <div style={{ display: "flex", minHeight: 340 }}>
        <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid " + T.border, padding: "18px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 10, letterSpacing: "0.04em" }}>SELECT TEMPLATE</div>
          <TemplatePickerList tpls={tpls} selected={form.templateId} onSelect={handleSelectTemplate} accent={T.accent} maxHeight={260} />
        </div>
        <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <Field label="Subject Line" required value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Your compelling subject line…" />
          {fromRow}
        </div>
      </div>
      {footer}
    </div>
  );
}

// ── New Campaign Modal ────────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onCreated }) {
  const { clientId: poolClientId } = getActivePool();
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [templates, setTemplates] = useState([]);
  const [clientName, setClientName] = useState("");
  const [form, setForm] = useState({
    type: "regular", name: "",
    templateId: null, templateIdB: null,
    subject: "", subjectB: "", fromName: "", fromEmail: "",
  });

  // Fetch client name for auto-fill
  useEffect(() => {
    if (!poolClientId) return;
    getClients().then(clients => {
      const match = clients.find(c => c.id === poolClientId);
      if (match?.name) setClientName(match.name);
    }).catch(() => {});
  }, [poolClientId]);

  const goStep2 = useCallback(() => {
    setStep(2);
    getPublishedTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      const campaign = await createCampaign({
        name: form.name.trim(), type: form.type, clientId: poolClientId || null,
        templateId: form.templateId, templateIdB: form.templateIdB || null,
        subject: form.subject.trim(), subjectB: form.type === "ab_test" ? form.subjectB.trim() : "",
        fromName: form.fromName.trim(), fromEmail: form.fromEmail.trim(),
      });
      onCreated(campaign);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }, [form, poolClientId, onCreated]);

  const modalWidth = step === 1 ? 520 : form.type === "ab_test" ? 830 : 660;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 14, width: modalWidth, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 28px 80px rgba(0,0,0,0.8)", transition: "width 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Create an email campaign</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 4 }}>✕</button>
        </div>
        {step === 1
          ? <WizardStep1 form={form} setForm={setForm} onNext={goStep2} onClose={onClose} />
          : <WizardStep2 form={form} setForm={setForm} templates={templates} saving={saving} onBack={() => setStep(1)} onCreate={handleCreate} clientName={clientName} />
        }
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({ campaign, onClose, onConfirm, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete campaign?</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
          "<strong style={{ color: T.text }}>{campaign.name}</strong>" and all its recipients will be permanently deleted.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: T.red, color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [toDelete,  setToDelete]  = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCampaigns();
      setCampaigns(Array.isArray(c) ? c : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = useCallback(campaign => {
    setShowNew(false);
    navigate("/campaigns/" + campaign.id);
  }, [navigate]);

  const handleDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCampaign(toDelete.id);
      setCampaigns(prev => prev.filter(c => c.id !== toDelete.id));
      setToDelete(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  }, [toDelete]);

  const filtered = campaigns.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.template?.name || "").toLowerCase().includes(q)
      || (c.fromName || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const total    = campaigns.length;
  const draft    = campaigns.filter(c => c.status === "draft").length;
  const active   = campaigns.filter(c => c.status === "sending").length;
  const sent     = campaigns.filter(c => c.status === "sent").length;
  const paused   = campaigns.filter(c => c.status === "paused").length;
  const newThisWeek = thisWeekCount(campaigns);

  return (
    <div style={{ width: "100%" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 4 }}>Email Campaigns</div>
          <div style={{ fontSize: 13, color: T.muted }}>Create and manage your email campaigns.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid " + T.border, background: T.surface, color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
          <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total",   value: total,  sub: newThisWeek > 0 ? `+${newThisWeek} this week` : "all time",         subColor: T.dim,    dot: null        },
          { label: "Draft",   value: draft,  sub: draft === 1 ? "not sent yet" : "not sent yet",                      subColor: T.muted,  dot: T.muted     },
          { label: "Sending", value: active, sub: active === 1 ? "in progress" : active === 0 ? "none active" : "in progress", subColor: T.amber, dot: T.amber },
          { label: "Sent",    value: sent,   sub: "successfully delivered",                                             subColor: T.green,  dot: T.green     },
          { label: "Paused",  value: paused, sub: paused === 1 ? "on hold" : paused === 0 ? "none paused" : "on hold", subColor: T.orange, dot: T.orange    },
        ].map(({ label, value, sub, subColor, dot }) => (
          <div key={label} style={{ padding: "18px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              {dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
              <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.03em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 5 }}>{value}</div>
            <div style={{ fontSize: 11, color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            placeholder="Search campaigns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 9, border: "1px solid " + T.border, background: T.card, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid " + T.border, background: T.card, color: statusFilter === "all" ? T.muted : T.text, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: 140 }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13, padding: 48, justifyContent: "center" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 12 }}>
          <Megaphone size={44} color={T.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Create your first campaign to start reaching out to contacts.</div>
          <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      ) : (
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12 }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: GRID_COLS,
            padding: "10px 16px", borderBottom: "1px solid " + T.border,
            background: T.card, borderRadius: "12px 12px 0 0",
          }}>
            {["Campaign", "Subject", "Status", "Created", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>
          {/* Data rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
              No campaigns match your search.
            </div>
          ) : (
            filtered.map((c, idx) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                isLast={idx === filtered.length - 1}
                onOpen={() => navigate("/campaigns/" + c.id)}
                onDelete={setToDelete}
              />
            ))
          )}
        </div>
      )}

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      {toDelete && <DeleteModal campaign={toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} loading={deleting} />}
    </div>
  );
}
