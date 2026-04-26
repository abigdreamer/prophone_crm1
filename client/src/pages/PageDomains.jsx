import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, ChevronDown, LoaderCircle, Globe,
  CheckCircle2, Clock, AlertCircle, XCircle,
  Trash2, Eye, RefreshCw, Copy, Check, X,
  ShieldCheck, Info, MapPin, Calendar, Settings,
  FileText, MoreHorizontal, Pencil, Save,
} from "lucide-react";
import * as api from "../api/domains.api";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

// ─── Light theme ──────────────────────────────────────────────────────────────
const C = {
  bg:       "#f1f5f9",
  surface:  "#ffffff",
  border:   "#e2e8f0",
  borderSb: "#f1f5f9",
  text:     "#0f172a",
  sub:      "#64748b",
  muted:    "#94a3b8",
  accent:   "#6366f1",
  accentLo: "#eef2ff",
  green:    "#16a34a",
  greenBg:  "#f0fdf4",
  greenBdr: "#bbf7d0",
  amber:    "#d97706",
  amberBg:  "#fffbeb",
  amberBdr: "#fde68a",
  blue:     "#2563eb",
  blueBg:   "#eff6ff",
  blueBdr:  "#bfdbfe",
  red:      "#dc2626",
  redBg:    "#fef2f2",
  redBdr:   "#fecaca",
  shadow:   "0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.10)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.14)",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(iso);
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  verified:  { label: "Verified",   color: C.green, bg: C.greenBg, bdr: C.greenBdr, Icon: CheckCircle2 },
  verifying: { label: "Verifying",  color: C.blue,  bg: C.blueBg,  bdr: C.blueBdr,  Icon: Clock },
  pending:   { label: "Pending",    color: C.amber, bg: C.amberBg, bdr: C.amberBdr, Icon: Clock },
  failed:    { label: "Failed",     color: C.red,   bg: C.redBg,   bdr: C.redBdr,   Icon: XCircle },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.bdr}`,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>
      <s.Icon size={11} />
      {s.label}
    </span>
  );
}

// ─── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{ background: copied ? C.greenBg : C.bg, border: `1px solid ${copied ? C.greenBdr : C.border}`, borderRadius: 6, padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: copied ? C.green : C.sub, transition: "all 0.15s", flexShrink: 0 }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Modal backdrop ────────────────────────────────────────────────────────────
function Modal({ children, onClose, maxWidth = 520 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px 28px 24px", boxShadow: C.shadowLg, width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{title}</div>
      <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex" }}>
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Add Domain Modal ──────────────────────────────────────────────────────────
function AddDomainModal({ onConfirm, onClose, saving }) {
  const [value, setValue] = useState("");
  const valid = value.trim().length > 2 && value.includes(".");

  return (
    <Modal onClose={onClose} maxWidth={460}>
      <div style={{ width: 40, height: 40, background: C.accentLo, border: `1px solid #c7d2fe`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Globe size={20} color={C.accent} />
      </div>
      <ModalHeader title="Add sending domain" onClose={onClose} />
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
        Enter the domain you want to send emails from. You'll need to add DNS records to verify ownership.
      </p>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>Domain name</label>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && valid && !saving) onConfirm(value.trim()); if (e.key === "Escape") onClose(); }}
        placeholder="mail.yourdomain.com"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", marginBottom: 20 }}
        onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
      />
      <div style={{ background: C.amberBg, border: `1px solid ${C.amberBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 22, fontSize: 12, color: C.amber, lineHeight: 1.6 }}>
        <strong>Tip:</strong> Use a subdomain like <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4 }}>mail.yourdomain.com</code> so it doesn't affect your main domain's email.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>
          Cancel
        </button>
        <button
          onClick={() => valid && !saving && onConfirm(value.trim())}
          disabled={!valid || saving}
          style={{ flex: 1, background: valid && !saving ? C.accent : "#c7d2fe", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: valid && !saving ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {saving ? <><LoaderCircle size={13} style={{ animation: "_dspin 0.8s linear infinite" }} /> Adding…</> : "Add domain"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Domain Detail Modal ───────────────────────────────────────────────────────
function DomainDetailModal({ domain, onClose, onVerify, onDelete, onUpdate, verifying }) {
  const [tab,          setTab]          = useState("records");
  const [copiedAll,    setCopiedAll]    = useState(false);
  const [fromEmail,    setFromEmail]    = useState(domain.from_email || "");
  const [savingEmail,  setSavingEmail]  = useState(false);
  const [emailError,   setEmailError]   = useState(null);
  const [emailSaved,   setEmailSaved]   = useState(false);
  const records = domain.dns_records || [];

  const fromEmailChanged = fromEmail !== (domain.from_email || "");
  const fromEmailValid   = !fromEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim());

  async function handleSaveFromEmail() {
    if (!fromEmailValid || savingEmail) return;
    setSavingEmail(true);
    setEmailError(null);
    try {
      const updated = await api.updateDomain(domain.id, { from_email: fromEmail.trim() });
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2000);
      onUpdate?.(updated);
    } catch (err) {
      let msg = "Failed to save. Please try again.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = parsed.error;
      } catch { /* use default */ }
      setEmailError(msg);
    } finally {
      setSavingEmail(false);
    }
  }

  const statusCfg = s => {
    if (s === "verified") return { label: "Verified",  color: C.green, bg: C.greenBg, bdr: C.greenBdr };
    if (s === "failed")   return { label: "Failed",    color: C.red,   bg: C.redBg,   bdr: C.redBdr   };
    return                       { label: "Pending",   color: C.amber, bg: C.amberBg, bdr: C.amberBdr };
  };

  function copyAll() {
    const text = records.map(r => {
      const type  = r.type  || r.record || "";
      const name  = r.name  || "";
      const value = r.value || r.data  || "";
      const pri   = r.priority != null ? `  Priority: ${r.priority}` : "";
      return `Type:  ${type}\nName:  ${name}\nValue: ${value}${pri}`;
    }).join("\n\n─────────────────────────\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }

  // Build timeline steps
  const steps = [
    { label: "Domain added",    date: domain.created_at, done: true  },
    { label: "DNS verified",    date: domain.verified_at || null, done: domain.status === "verified" },
    { label: "Ready to send",   date: domain.verified_at || null, done: domain.status === "verified" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", boxShadow: C.shadowLg, fontFamily: "inherit" }}>

        {/* ── Top header ── */}
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {/* Icon */}
            <div style={{
              width: 60, height: 60, borderRadius: 16, flexShrink: 0,
              background: domain.status === "verified" ? C.greenBg : C.bg,
              border: `1.5px solid ${domain.status === "verified" ? C.greenBdr : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Globe size={28} color={domain.status === "verified" ? C.green : C.muted} strokeWidth={1.5} />
            </div>

            {/* Name + label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Domain</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", wordBreak: "break-all" }}>{domain.domain}</div>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 8px", cursor: "pointer", color: C.sub, display: "flex", flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
            {[
              { label: "CREATED",  value: fmtDate(domain.created_at), Icon: Calendar },
              { label: "STATUS",   value: <StatusBadge status={domain.status} />, Icon: CheckCircle2 },
              { label: "REGION",   value: domain.region || "us-east-1", Icon: MapPin },
            ].map(({ label, value, Icon }) => (
              <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <Icon size={11} color={C.muted} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Domain events</div>

          {domain.status === "verified" ? (
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={14} color={C.green} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Domain verified — ready to send emails.</span>
            </div>
          ) : (
            <div style={{ background: C.amberBg, border: `1px solid ${C.amberBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} color={C.amber} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>Waiting for DNS verification. Add the records below to your DNS provider.</span>
            </div>
          )}

          {/* Step timeline */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", top: 16, left: "50%", width: "100%", height: 2,
                    background: steps[i + 1].done ? C.green : C.border,
                    transition: "background 0.3s",
                  }} />
                )}
                {/* Circle */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", zIndex: 1, flexShrink: 0,
                  background: step.done ? C.greenBg : C.bg,
                  border: `2px solid ${step.done ? C.green : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {step.done
                    ? <CheckCircle2 size={15} color={C.green} />
                    : <Clock size={14} color={C.muted} />}
                </div>
                {/* Label + date */}
                <div style={{ marginTop: 8, textAlign: "center", paddingLeft: 4, paddingRight: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: step.done ? C.text : C.muted }}>{step.label}</div>
                  {step.date && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtDateTime(step.date)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, padding: "0 28px" }}>
          {[
            { id: "records", label: "Records",       Icon: FileText  },
            { id: "config",  label: "Configuration", Icon: Settings  },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: "none", border: "none", borderBottom: `2px solid ${tab === id ? C.accent : "transparent"}`,
                padding: "12px 16px", fontSize: 13, fontWeight: tab === id ? 700 : 500,
                color: tab === id ? C.accent : C.sub, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, marginBottom: -1, transition: "color 0.15s",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ padding: "20px 28px 24px" }}>

          {tab === "records" && (
            records.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>
                No DNS records available. Delete and re-add the domain to fetch records.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
                    Add these records to your DNS provider. Propagation can take up to <strong>48 hours</strong>.
                  </p>
                  <button
                    onClick={copyAll}
                    style={{ flexShrink: 0, marginLeft: 12, background: copiedAll ? C.greenBg : C.bg, border: `1px solid ${copiedAll ? C.greenBdr : C.border}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: copiedAll ? C.green : C.sub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}
                  >
                    {copiedAll ? <><Check size={12} /> All copied!</> : <><Copy size={12} /> Copy all</>}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {records.map((rec, i) => {
                    const type  = rec.type  || rec.record || "—";
                    const name  = rec.name  || "—";
                    const value = rec.value || rec.data  || "";
                    const st    = statusCfg(rec.status);
                    return (
                      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: C.text, fontFamily: "monospace", letterSpacing: "0.04em" }}>{type}</span>
                            {rec.priority != null && <span style={{ fontSize: 11, color: C.muted }}>Priority {rec.priority}</span>}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.bdr}` }}>{st.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Name</div>
                            <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all" }}>{name}</div>
                          </div>
                          {name !== "—" && <CopyBtn text={name} />}
                        </div>
                        <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Value</div>
                            <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.5 }}>{value || "—"}</div>
                          </div>
                          {value && <CopyBtn text={value} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {tab === "config" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { label: "Domain",    value: domain.domain },
                { label: "Resend ID", value: domain.resend_domain_id || "Not registered" },
                { label: "Region",    value: domain.region || "us-east-1" },
                { label: "Added",     value: fmtDateTime(domain.created_at) },
                { label: "Verified",  value: domain.verified_at ? fmtDateTime(domain.verified_at) : "Not yet verified" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: C.bg, borderRadius: 10, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: C.text, maxWidth: 340, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
                    {value && value !== "Not registered" && value !== "Not yet verified" && (
                      <CopyBtn text={value} />
                    )}
                  </div>
                </div>
              ))}

              {/* Editable "Sending from" */}
              <div style={{ background: C.bg, borderRadius: 10, padding: "14px", marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>Sending from</span>
                  <span style={{ fontSize: 11, color: C.muted }}>The From address used in emails</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={e => { setFromEmail(e.target.value); setEmailError(null); setEmailSaved(false); }}
                    onKeyDown={e => { if (e.key === "Enter" && fromEmailChanged && fromEmailValid) handleSaveFromEmail(); }}
                    placeholder={`e.g. sales@${domain.domain}`}
                    style={{
                      flex: 1, background: C.surface, border: `1.5px solid ${emailError ? C.red : emailSaved ? C.greenBdr : C.border}`,
                      borderRadius: 8, padding: "8px 11px", fontSize: 12, color: C.text,
                      outline: "none", fontFamily: "monospace",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = emailError ? C.red : C.accent; }}
                    onBlur={e => { e.currentTarget.style.borderColor = emailError ? C.red : emailSaved ? C.greenBdr : C.border; }}
                  />
                  <button
                    onClick={handleSaveFromEmail}
                    disabled={!fromEmailChanged || !fromEmailValid || savingEmail}
                    style={{
                      background: fromEmailChanged && fromEmailValid && !savingEmail ? C.accent : C.bg,
                      border: `1px solid ${fromEmailChanged && fromEmailValid && !savingEmail ? C.accent : C.border}`,
                      borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600,
                      color: fromEmailChanged && fromEmailValid && !savingEmail ? "#fff" : C.muted,
                      cursor: fromEmailChanged && fromEmailValid && !savingEmail ? "pointer" : "not-allowed",
                      fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
                      flexShrink: 0, transition: "all 0.15s",
                    }}
                  >
                    {savingEmail
                      ? <LoaderCircle size={12} style={{ animation: "_dspin 0.8s linear infinite" }} />
                      : emailSaved
                        ? <><Check size={12} color={C.green} /> Saved</>
                        : <><Save size={12} /> Save</>}
                  </button>
                </div>
                {emailError && <div style={{ fontSize: 11, color: C.red, marginTop: 5 }}>{emailError}</div>}
                {!fromEmail && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                    Leave blank to use default: <code style={{ fontFamily: "monospace" }}>noreply@{domain.domain}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div style={{ padding: "16px 28px 22px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button
            onClick={onDelete}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: C.red, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.redBg; }}
          >
            <Trash2 size={13} /> Delete domain
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>
              Close
            </button>
            {domain.status !== "verified" && (
              <button
                onClick={onVerify}
                disabled={verifying}
                style={{ background: C.accent, border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: verifying ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: verifying ? 0.75 : 1 }}
              >
                {verifying
                  ? <><LoaderCircle size={13} style={{ animation: "_dspin 0.8s linear infinite" }} /> Checking…</>
                  : <><ShieldCheck size={13} /> Check Verification</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

// ─── Domain Row ────────────────────────────────────────────────────────────────
// Column widths — shared between header and rows
const COL = "56px 1fr 1fr 140px 180px 120px 44px";

function DomainRow({ domain, onDetail, onDelete, onUpdate, verifyingId }) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [emailInput,  setEmailInput]  = useState(domain.from_email || "");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [rowError,    setRowError]    = useState(null);
  const menuRef  = useRef(null);
  const inputRef = useRef(null);
  const isVerifying = verifyingId === domain.id;
  const isVerified  = domain.status === "verified";
  const displayEmail = domain.from_email || `noreply@${domain.domain}`;
  const emailValid   = !emailInput || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());

  useEffect(() => {
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  async function saveEmail() {
    if (!emailValid || saving) return;
    setSaving(true);
    setRowError(null);
    try {
      const updated = await api.updateDomain(domain.id, { from_email: emailInput.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
      onUpdate?.(updated);
    } catch (err) {
      let msg = "Failed to save.";
      try { const p = JSON.parse(err.message); if (p?.error) msg = p.error; } catch { /* use default */ }
      setRowError(msg);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEmailInput(domain.from_email || "");
    setEditing(false);
    setRowError(null);
  }

  return (
    <div
      onClick={() => onDetail(domain)}
      style={{ display: "grid", gridTemplateColumns: COL, alignItems: "center", padding: "0 20px", borderBottom: `1px solid ${C.borderSb}`, cursor: "pointer", transition: "background 0.1s", minHeight: 58 }}
      onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Icon */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isVerified ? C.greenBg : C.bg, border: `1px solid ${isVerified ? C.greenBdr : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Globe size={16} color={isVerified ? C.green : C.muted} />
        </div>
      </div>

      {/* Domain name */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{domain.domain}</div>
      </div>

      {/* From Email — editable column */}
      <div style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              ref={inputRef}
              type="email"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setRowError(null); }}
              onKeyDown={e => { if (e.key === "Enter") saveEmail(); if (e.key === "Escape") cancelEdit(); }}
              placeholder={`noreply@${domain.domain}`}
              style={{
                background: C.surface, border: `1.5px solid ${rowError ? C.red : C.accent}`,
                borderRadius: 6, padding: "4px 8px", fontSize: 12, color: C.text,
                outline: "none", fontFamily: "monospace", width: "100%", boxSizing: "border-box",
              }}
            />
            <button
              onClick={saveEmail}
              disabled={!emailValid || saving}
              title="Save"
              style={{ flexShrink: 0, background: emailValid && !saving ? C.accent : C.bg, border: "none", borderRadius: 5, padding: "5px 8px", cursor: emailValid && !saving ? "pointer" : "not-allowed", display: "flex", alignItems: "center", color: emailValid && !saving ? "#fff" : C.muted }}
            >
              {saving ? <LoaderCircle size={11} style={{ animation: "_dspin 0.8s linear infinite" }} /> : <Check size={11} />}
            </button>
            <button onClick={cancelEdit} title="Cancel" style={{ flexShrink: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: C.muted }}>
              <X size={11} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            title="Click to edit from email"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid transparent`, transition: "all 0.12s", maxWidth: "100%" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <span style={{ fontSize: 12, color: saved ? C.green : C.sub, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {saved ? "Saved!" : displayEmail}
            </span>
            {saved ? <Check size={11} color={C.green} /> : <Pencil size={11} color={C.muted} />}
          </div>
        )}
        {rowError && <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>{rowError}</div>}
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isVerifying && <LoaderCircle size={12} color={C.accent} style={{ animation: "_dspin 0.8s linear infinite", flexShrink: 0 }} />}
        <StatusBadge status={domain.status} />
      </div>

      {/* Region */}
      <div style={{ fontSize: 13, color: C.sub }}>{regionLabel(domain.region)}</div>

      {/* Created */}
      <div style={{ fontSize: 13, color: C.muted }}>{timeAgo(domain.created_at)}</div>

      {/* 3-dot menu */}
      <div ref={menuRef} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? C.bg : "transparent", border: `1px solid ${menuOpen ? C.border : "transparent"}`, borderRadius: 8, cursor: "pointer", color: C.muted, transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
          onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = C.muted; } }}
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadowLg, zIndex: 1000, minWidth: 160, padding: "4px 0", overflow: "hidden" }}>
            <button
              onClick={() => { setMenuOpen(false); onDetail(domain); }}
              style={{ width: "100%", background: "transparent", border: "none", padding: "9px 14px", fontSize: 13, fontWeight: 500, color: C.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Eye size={13} color={C.sub} /> View details
            </button>
            <div style={{ height: 1, background: C.border, margin: "2px 0" }} />
            <button
              onClick={() => { setMenuOpen(false); onDelete(domain); }}
              style={{ width: "100%", background: "transparent", border: "none", padding: "9px 14px", fontSize: 13, fontWeight: 500, color: C.red, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = C.redBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Trash2 size={13} color={C.red} /> Delete domain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Region display map ────────────────────────────────────────────────────────
const REGION_MAP = {
  "us-east-1":      { flag: "🇺🇸", name: "North Virginia" },
  "us-east-2":      { flag: "🇺🇸", name: "Ohio" },
  "us-west-2":      { flag: "🇺🇸", name: "Oregon" },
  "eu-west-1":      { flag: "🇮🇪", name: "Ireland" },
  "eu-central-1":   { flag: "🇩🇪", name: "Frankfurt" },
  "ap-southeast-1": { flag: "🇸🇬", name: "Singapore" },
  "ap-northeast-1": { flag: "🇯🇵", name: "Tokyo" },
};

function regionLabel(region) {
  const r = REGION_MAP[region];
  if (!r) return region || "—";
  return `${r.flag}  ${r.name} (${region})`;
}

// ─── Status filter options ─────────────────────────────────────────────────────
const STATUSES = [
  { value: "all",       label: "All Statuses" },
  { value: "verified",  label: "Verified" },
  { value: "pending",   label: "Pending" },
  { value: "verifying", label: "Verifying" },
  { value: "failed",    label: "Failed" },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PageDomains() {
  const [domains,      setDomains]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusOpen,   setStatusOpen]   = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [verifyingId,  setVerifyingId]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const statusRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handle(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try { setDomains(await api.getDomains()); }
    catch { setDomains([]); }
    finally { setLoading(false); }
  }

  async function handleAdd(domainName) {
    setAdding(true);
    try {
      const row = await api.createDomain({ domain: domainName });
      setDomains(p => [row, ...p]);
      setShowAdd(false);
      showToast(`${row.domain} added — set up DNS records to verify.`);
      setDetailTarget(row);
    } catch (err) {
      let msg = "Failed to add domain.";
      try { msg = JSON.parse(err.message)?.error || err.message; } catch { msg = err.message; }
      showToast(msg, "error");
    } finally {
      setAdding(false);
    }
  }

  function handleUpdate(updated) {
    setDomains(p => p.map(d => d.id === updated.id ? updated : d));
    if (detailTarget?.id === updated.id) setDetailTarget(updated);
  }

  async function handleVerify(domain) {
    setVerifyingId(domain.id);
    // Sync detail modal if open
    try {
      const updated = await api.verifyDomain(domain.id);
      setDomains(p => p.map(d => d.id === domain.id ? updated : d));
      if (detailTarget?.id === domain.id) setDetailTarget(updated);
      if (updated.status === "verified") showToast(`${domain.domain} is verified!`);
      else showToast(`${domain.domain} is ${updated.status}. DNS may still be propagating.`, "info");
    } catch (err) {
      let msg = "Verification check failed.";
      try { msg = JSON.parse(err.message)?.error || err.message; } catch { msg = err.message; }
      showToast(msg, "error");
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteDomain(deleteTarget.id);
      setDomains(p => p.filter(d => d.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(`${deleteTarget.domain} removed.`);
    } catch {
      showToast("Failed to delete domain.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = domains.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.domain.toLowerCase().includes(q))
        && (statusFilter === "all" || d.status === statusFilter);
  });

  const currentLabel = STATUSES.find(s => s.value === statusFilter)?.label ?? "All Statuses";
  const verifiedCount = domains.filter(d => d.status === "verified").length;

  return (
    <div style={{ minHeight: "100%", background: C.bg, padding: "32px 36px", fontFamily: "'Inter','DM Sans',system-ui,sans-serif", boxSizing: "border-box" }}>
      <style>{`@keyframes _dspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>Domains</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.sub }}>
            Manage sending domains for your account.
            {verifiedCount > 0 && <span style={{ marginLeft: 8, color: C.green, fontWeight: 600 }}>{verifiedCount} verified</span>}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)", flexShrink: 0 }}
        >
          <Plus size={15} /> Add domain
        </button>
      </div>

      {/* ── Search + Filter ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color={C.muted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search domains…"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box", boxShadow: C.shadow }}
          />
        </div>
        <div ref={statusRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setStatusOpen(p => !p)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, minWidth: 148, boxShadow: C.shadow }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>{currentLabel}</span>
            <ChevronDown size={13} color={C.muted} style={{ transform: statusOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {statusOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 160, boxShadow: C.shadowMd }}>
              {STATUSES.map(opt => (
                <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setStatusOpen(false); }}
                  style={{ width: "100%", background: statusFilter === opt.value ? C.accentLo : "transparent", border: "none", padding: "10px 16px", fontSize: 13, color: statusFilter === opt.value ? C.accent : C.sub, fontWeight: statusFilter === opt.value ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 20px", gap: 14 }}>
          <LoaderCircle size={28} color={C.accent} style={{ animation: "_dspin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: C.muted }}>Loading domains…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "80px 20px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ width: 56, height: 56, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Globe size={26} color={C.muted} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.sub, marginBottom: 6 }}>
            {search || statusFilter !== "all" ? "No domains match your filters" : "No domains yet"}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filter."
              : "Verify a domain by adding a DNS record and start sending emails from your own address."}
          </div>
          {!search && statusFilter === "all" && (
            <button
              onClick={() => setShowAdd(true)}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}
            >
              <Plus size={14} /> Add domain
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "visible", boxShadow: C.shadow }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: COL, alignItems: "center", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.bg, borderRadius: "16px 16px 0 0" }}>
              <div />
              {["Domain", "From Email", "Status", "Region", "Created", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
              ))}
            </div>

            {filtered.map(d => (
              <DomainRow
                key={d.id}
                domain={d}
                onDetail={setDetailTarget}
                onDelete={setDeleteTarget}
                onUpdate={handleUpdate}
                verifyingId={verifyingId}
              />
            ))}
          </div>

          {/* Footer count */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 4px", fontSize: 12, color: C.muted }}>
            <span>{filtered.length} domain{filtered.length !== 1 ? "s" : ""}</span>
            {verifiedCount > 0 && (
              <span style={{ color: C.green, fontWeight: 600 }}>· {verifiedCount} verified</span>
            )}
            {domains.length !== filtered.length && (
              <span>· {domains.length} total</span>
            )}
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 3000,
          background: toast.type === "error" ? C.red : toast.type === "info" ? C.blue : "#1e293b",
          color: "#fff", borderRadius: 10, padding: "12px 18px",
          fontSize: 13, fontWeight: 500, boxShadow: C.shadowLg,
          display: "flex", alignItems: "center", gap: 8,
          maxWidth: 380, animation: "none",
        }}>
          {toast.type === "error" ? <AlertCircle size={15} /> : toast.type === "info" ? <Info size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <AddDomainModal
          onConfirm={handleAdd}
          onClose={() => setShowAdd(false)}
          saving={adding}
        />
      )}

      {detailTarget && (
        <DomainDetailModal
          domain={detailTarget}
          onClose={() => setDetailTarget(null)}
          onVerify={() => handleVerify(detailTarget)}
          onDelete={() => { setDetailTarget(null); setDeleteTarget(detailTarget); }}
          onUpdate={handleUpdate}
          verifying={verifyingId === detailTarget.id}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete domain"
          itemName={deleteTarget.domain}
          description={<>Removing <strong style={{ color: "#0f172a" }}>{deleteTarget.domain}</strong> will also remove it from Resend and revoke all DNS verification. You'll need to re-verify if you add it back.</>}
          confirmLabel="Delete domain"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </div>
  );
}
