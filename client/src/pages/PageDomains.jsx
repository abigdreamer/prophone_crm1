import { useState, useEffect, useRef, useCallback } from "react";
import { useSSE } from "../hooks/useSSE";
import {
  Plus, Search, ChevronDown, LoaderCircle, Globe,
  CheckCircle2, Clock, AlertCircle, XCircle,
  Trash2, Eye, RefreshCw, Copy, Check, X,
  ShieldCheck, Info, MapPin, Calendar, Settings,
  FileText, MoreHorizontal, Pencil, Save,
  MousePointerClick, Mail, Lock, Link2, ArrowRight, ChevronRight,
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

// ─── Tracking Subdomain Modal ─────────────────────────────────────────────────
function TrackingSubdomainModal({ domain, onClose, onSaved }) {
  const [step,           setStep]           = useState(1);
  const [subdomain,      setSubdomain]      = useState(domain.tracking_subdomain || "");
  const [clickT,         setClickT]         = useState(domain.click_tracking  ?? true);
  const [openT,          setOpenT]          = useState(domain.open_tracking   ?? true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState(null);
  const [savedDomain,    setSavedDomain]    = useState(null);

  const subValid = subdomain.trim().length > 0 && /^[a-z0-9-]+$/.test(subdomain.trim());
  const preview  = subdomain.trim() ? `${subdomain.trim()}.${domain.domain}` : `<subdomain>.${domain.domain}`;

  // Filter just the Tracking CNAME record from dns_records
  const trackingRecord = savedDomain
    ? (savedDomain.dns_records || []).find(r => r.record === 'Tracking' || r.type === 'CNAME' && r.name?.includes(subdomain.trim()))
    : null;

  async function handleAdd() {
    if (!subValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.configureTrackingSubdomain(domain.id, {
        subdomain:     subdomain.trim(),
        click_tracking: clickT,
        open_tracking:  openT,
      });
      setSavedDomain(updated);
      onSaved?.(updated);
      setStep(2);
    } catch (err) {
      let msg = "Failed to configure tracking subdomain.";
      try { const p = JSON.parse(err.message); if (p?.error) msg = p.error; } catch { /* use default */ }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={580}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.accentLo, border: `1.5px solid #c7d2fe`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Link2 size={24} color={C.accent} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>New tracking subdomain</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>Track every click with automatic URL redirection</div>
        </div>
        <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex" }}>
          <X size={15} />
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        {[{ n: 1, label: "Details" }, { n: 2, label: "DNS Record" }].map(({ n, label }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: step >= n ? C.accent : C.bg,
                border: `1.5px solid ${step >= n ? C.accent : C.border}`,
                color: step >= n ? "#fff" : C.muted,
              }}>
                {step > n ? <Check size={12} /> : n}
              </div>
              <span style={{ fontSize: 12, fontWeight: step === n ? 700 : 500, color: step === n ? C.text : C.muted }}>{label}</span>
            </div>
            {i === 0 && <ChevronRight size={13} color={C.muted} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            All email links will be securely redirected through this domain before reaching their destination.
          </p>

          {/* Subdomain + Domain inputs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Subdomain
              </label>
              <input
                autoFocus
                value={subdomain}
                onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setError(null); }}
                placeholder="links"
                style={{
                  width: "100%", boxSizing: "border-box", background: C.surface,
                  border: `1.5px solid ${error ? C.red : C.border}`, borderRadius: 9,
                  padding: "9px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "monospace",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? C.red : C.border; }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Domain
              </label>
              <div style={{
                background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 9,
                padding: "9px 12px", fontSize: 13, color: C.sub, fontFamily: "monospace",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <Globe size={13} color={C.muted} />
                {domain.domain}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 13px", marginBottom: 20, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Preview:</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: subValid ? C.accent : C.muted }}>{preview}</span>
          </div>

          {/* Tracking options */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 12 }}>Tracking options</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={clickT}
                  onChange={e => setClickT(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: C.accent, flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Enable click tracking</span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={openT}
                  onChange={e => setOpenT(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: C.accent, flexShrink: 0, cursor: "pointer", marginTop: 2 }}
                />
                <div>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Enable open tracking</span>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                    Open tracking can produce inaccurate results — many email clients block tracking pixels automatically.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div style={{ background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 9, padding: "9px 13px", marginBottom: 16, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 7 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!subValid || saving}
              style={{ flex: 1, background: subValid && !saving ? C.accent : "#c7d2fe", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: subValid && !saving ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {saving ? <><LoaderCircle size={13} style={{ animation: "_dspin 0.8s linear infinite" }} /> Adding…</> : <><Plus size={14} /> Add domain</>}
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: DNS Record ── */}
      {step === 2 && (
        <>
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={14} color={C.green} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Tracking subdomain configured — add the DNS record below to activate it.</span>
          </div>

          <p style={{ margin: "0 0 16px", fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            Add this <strong style={{ color: C.text }}>CNAME</strong> record to your DNS provider for <code style={{ background: C.bg, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>{preview}</code>.
            Propagation can take up to <strong>48 hours</strong>.
          </p>

          {trackingRecord ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>
                  {trackingRecord.type || 'CNAME'}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>TTL: {trackingRecord.ttl || 'Auto'}</span>
              </div>
              {[
                { label: "Name",  value: trackingRecord.name  || `${subdomain}.${domain.domain}` },
                { label: "Value", value: trackingRecord.value || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.5 }}>{value}</div>
                    </div>
                    {value && value !== "—" && <CopyBtn text={value} />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>CNAME</span>
              </div>
              {[
                { label: "Name",  value: `${subdomain.trim()}.${domain.domain}` },
                { label: "Value", value: "Check your Resend domain DNS records for the full CNAME value." },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.5 }}>{value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: C.blueBg, border: `1px solid ${C.blueBdr}`, borderRadius: 9, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: C.blue, lineHeight: 1.6 }}>
            <strong>Tip:</strong> You can verify the DNS record status in the <strong>Records</strong> tab after propagation completes.
          </div>

          <button
            onClick={onClose}
            style={{ width: "100%", background: C.accent, border: "none", borderRadius: 9, padding: "11px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            Done
          </button>
        </>
      )}
    </Modal>
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
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? C.accent : "#cbd5e1", position: "relative", transition: "background 0.2s",
        flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
      }} />
    </button>
  );
}

function DomainDetailModal({ domain, onClose, onVerify, onDelete, onUpdate, verifying }) {
  const [tab,          setTab]          = useState("records");
  const [copiedAll,    setCopiedAll]    = useState(false);
  const [fromEmail,    setFromEmail]    = useState(domain.from_email || "");
  const [savingEmail,  setSavingEmail]  = useState(false);
  const [emailError,   setEmailError]   = useState(null);
  const [emailSaved,   setEmailSaved]   = useState(false);

  // Tracking & TLS state (seeded from domain record)
  const [openTracking,       setOpenTracking]       = useState(domain.open_tracking  ?? true);
  const [clickTracking,      setClickTracking]      = useState(domain.click_tracking ?? true);
  const [tlsMode,            setTlsMode]            = useState(domain.tls || "opportunistic");
  const [trackingSaving,     setTrackingSaving]     = useState(false);
  const [trackingError,      setTrackingError]      = useState(null);
  const [trackingSaved,      setTrackingSaved]      = useState(false);
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);

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

  async function handleTrackingChange(patch) {
    setTrackingSaving(true);
    setTrackingError(null);
    setTrackingSaved(false);
    const next = {
      open_tracking:  openTracking,
      click_tracking: clickTracking,
      tls:            tlsMode,
      ...patch,
    };
    try {
      const updated = await api.configureDomainTracking(domain.id, next);
      setOpenTracking(updated.open_tracking ?? next.open_tracking);
      setClickTracking(updated.click_tracking ?? next.click_tracking);
      setTlsMode(updated.tls ?? next.tls);
      setTrackingSaved(true);
      setTimeout(() => setTrackingSaved(false), 2500);
      onUpdate?.(updated);
    } catch (err) {
      let msg = "Failed to save tracking settings.";
      try { const p = JSON.parse(err.message); if (p?.error) msg = p.error; } catch { /* use default */ }
      setTrackingError(msg);
    } finally {
      setTrackingSaving(false);
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

            {/* Refresh */}
            <button
              onClick={onVerify}
              disabled={verifying}
              title="Refresh domain status"
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 12px", cursor: verifying ? "not-allowed" : "pointer", color: C.sub, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "inherit", opacity: verifying ? 0.65 : 1 }}
              onMouseEnter={e => { if (!verifying) { e.currentTarget.style.background = C.accentLo; e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
              onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
            >
              <RefreshCw size={13} style={verifying ? { animation: "_dspin 0.8s linear infinite" } : {}} />
              {verifying ? "Refreshing…" : "Refresh"}
            </button>

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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
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

                {/* Grouped sections */}
                {(() => {
                  const groups = [
                    { key: "verification", label: "Domain Verification", match: r => r.record === 'DKIM' || (!r.record && r.type === 'TXT' && r.name?.includes('domainkey')) },
                    { key: "sending",      label: "Enable Sending",      match: r => r.record === 'SPF'  || r.record === 'MX' || (!r.record && (r.type === 'MX' || (r.type === 'TXT' && r.value?.includes('v=spf')))) },
                    { key: "receiving",    label: "Enable Receiving",     match: r => r.record === 'Receiving' },
                    { key: "tracking",     label: "Enable Tracking",      match: r => r.record === 'Tracking' || r.record === 'TrackingCAA' },
                  ];

                  const assigned = new Set();
                  const grouped = groups.map(g => {
                    const recs = records.filter((r, i) => { if (assigned.has(i)) return false; if (g.match(r)) { assigned.add(i); return true; } return false; });
                    return { ...g, recs };
                  });
                  // Remaining uncategorised
                  const rest = records.filter((_, i) => !assigned.has(i));

                  const RecordCard = ({ rec }) => {
                    const type  = rec.type  || rec.record || "—";
                    const name  = rec.name  || "—";
                    const value = rec.value || rec.data  || "";
                    const st    = statusCfg(rec.status);
                    return (
                      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{type}</span>
                          {rec.priority != null && <span style={{ fontSize: 11, color: C.muted }}>Priority {rec.priority}</span>}
                          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.bdr}` }}>{st.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Name</div>
                            <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all" }}>{name}</div>
                          </div>
                          {name !== "—" && <CopyBtn text={name} />}
                        </div>
                        <div style={{ height: 1, background: C.border, margin: "6px 0" }} />
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Content</div>
                            <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text, wordBreak: "break-all", lineHeight: 1.5 }}>{value || "—"}</div>
                          </div>
                          {value && <CopyBtn text={value} />}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {grouped.filter(g => g.recs.length > 0).map(g => (
                        <div key={g.key}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>{g.label}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {g.recs.map((rec, i) => <RecordCard key={i} rec={rec} />)}
                          </div>
                        </div>
                      ))}
                      {rest.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Other</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {rest.map((rec, i) => <RecordCard key={i} rec={rec} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )
          )}

          {tab === "config" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* ── Tracking subdomain modal ── */}
              {showSubdomainModal && (
                <TrackingSubdomainModal
                  domain={domain}
                  onClose={() => setShowSubdomainModal(false)}
                  onSaved={updated => { onUpdate?.(updated); setShowSubdomainModal(false); }}
                />
              )}

              {/* ── Domain info rows ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  { label: "Domain",    value: domain.domain },
                  { label: "Resend ID", value: domain.resend_domain_id || "Not registered" },
                  { label: "Region",    value: domain.region || "us-east-1" },
                  { label: "Added",     value: fmtDateTime(domain.created_at) },
                  { label: "Verified",  value: domain.verified_at ? fmtDateTime(domain.verified_at) : "Not yet verified" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: C.bg, borderRadius: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: C.text, maxWidth: 340, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
                      {value && value !== "Not registered" && value !== "Not yet verified" && (
                        <CopyBtn text={value} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Tracking & TLS rows ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>

                {/* Custom tracking subdomain */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 14px", background: C.bg, borderRadius: 10, gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 3 }}>Custom tracking subdomain</div>
                    {domain.tracking_subdomain ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.accentLo, border: `1px solid #c7d2fe`, borderRadius: 6, padding: "2px 9px" }}>
                        <Link2 size={10} color={C.accent} />
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.accent, fontWeight: 600 }}>{domain.tracking_subdomain}.{domain.domain}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.amber }}>Not configured — using shared tracking domain.</div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSubdomainModal(true)}
                    style={{ flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: C.accent, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.accentLo; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface; }}
                  >
                    {domain.tracking_subdomain ? "Change" : "Configure"}
                  </button>
                </div>

                {/* Click tracking */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.bg, borderRadius: 10, gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 3 }}>Click tracking</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Links in your emails are rewritten so that clicks are tracked before redirecting to the destination URL.</div>
                  </div>
                  <ToggleSwitch
                    checked={clickTracking}
                    disabled={trackingSaving}
                    onChange={val => { setClickTracking(val); handleTrackingChange({ click_tracking: val }); }}
                  />
                </div>

                {/* Open tracking */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.bg, borderRadius: 10, gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>Open tracking</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", border: `1px solid #fde68a`, color: C.amber, borderRadius: 20, padding: "1px 8px" }}>Not Recommended</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>A 1×1 pixel transparent image is inserted in each email and includes a unique reference. Note: many email clients block tracking pixels.</div>
                  </div>
                  <ToggleSwitch
                    checked={openTracking}
                    disabled={trackingSaving}
                    onChange={val => { setOpenTracking(val); handleTrackingChange({ open_tracking: val }); }}
                  />
                </div>

                {/* TLS */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.bg, borderRadius: 10, gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 3 }}>TLS (Transport Layer Security)</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                      {tlsMode === "enforced"
                        ? "Always require TLS. Emails will fail if the recipient server doesn't support encryption."
                        : "Encrypt when available — falls back to unencrypted delivery if TLS is not supported by the recipient server."}
                    </div>
                  </div>
                  <select
                    value={tlsMode}
                    disabled={trackingSaving}
                    onChange={e => { setTlsMode(e.target.value); handleTrackingChange({ tls: e.target.value }); }}
                    style={{
                      flexShrink: 0, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8,
                      padding: "6px 10px", fontSize: 12, fontWeight: 600, color: C.text,
                      cursor: trackingSaving ? "not-allowed" : "pointer", fontFamily: "inherit", outline: "none",
                    }}
                  >
                    <option value="opportunistic">Opportunistic</option>
                    <option value="enforced">Enforced</option>
                  </select>
                </div>

                {/* Saving feedback */}
                {(trackingSaving || trackingSaved || trackingError) && (
                  <div style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, display: "flex", alignItems: "center", gap: 7,
                    background: trackingError ? C.redBg : trackingSaved ? C.greenBg : C.bg,
                    color: trackingError ? C.red : trackingSaved ? C.green : C.muted,
                  }}>
                    {trackingSaving && <LoaderCircle size={12} style={{ animation: "_dspin 0.8s linear infinite" }} />}
                    {trackingSaved  && <CheckCircle2 size={12} />}
                    {trackingError  && <AlertCircle  size={12} />}
                    {trackingSaving ? "Saving…" : trackingSaved ? "Saved" : trackingError}
                  </div>
                )}
              </div>

              {/* ── Sending from (existing) ── */}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Sending from</span>
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
                      outline: "none", fontFamily: "monospace", transition: "border-color 0.15s",
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
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 600, color: C.sub, cursor: verifying ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: verifying ? 0.75 : 1 }}
                onMouseEnter={e => { if (!verifying) { e.currentTarget.style.background = C.accentLo; e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
              >
                {verifying
                  ? <><RefreshCw size={13} style={{ animation: "_dspin 0.8s linear infinite" }} /> Refreshing…</>
                  : <><RefreshCw size={13} /> Refresh</>}
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

  // Real-time domain verification updates via Resend webhook → SSE
  const handleSSE = useCallback((event, data) => {
    if (event === "domain_update") {
      setDomains(prev => prev.map(d =>
        d.id === data.domain_id
          ? { ...d, status: data.status, verified_at: new Date().toISOString() }
          : d
      ));
    }
  }, []);
  useSSE(handleSSE);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const rows = await api.getDomains();
      setDomains(rows);
      // Silently sync status for any non-verified domain in the background
      rows.filter(d => d.status !== "verified").forEach(async d => {
        try {
          const updated = await api.verifyDomain(d.id);
          setDomains(p => p.map(x => x.id === updated.id ? updated : x));
        } catch { /* silent — stale status is acceptable */ }
      });
    } catch { setDomains([]); }
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
