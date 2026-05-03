import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe, Plus, Copy, Check, RefreshCw, Trash2,
  X, AlertTriangle,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import T from "../theme";
import * as db from "../services/api";
import CLIENTS from "../data/clients";
import { usePool } from "../context/PoolContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const clientOf  = id => CLIENTS.find(c => c.id === id) || null;
const fmtDate   = d  => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function parseRec(json) {
  try { return json ? JSON.parse(json) : {}; } catch { return {}; }
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, small }) {
  const cfg = {
    verified: { color: T.green,  icon: "✓", label: "VERIFIED" },
    pending:  { color: T.amber,  icon: "●", label: "PENDING"  },
    failed:   { color: T.red,    icon: "✗", label: "FAILED"   },
  }[status] || { color: T.muted, icon: "●", label: "UNKNOWN" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "2px 8px" : "3px 10px",
      borderRadius: 5, fontSize: small ? 10 : 11, fontWeight: 700,
      background: cfg.color + "18", color: cfg.color,
      border: `1px solid ${cfg.color}40`, whiteSpace: "nowrap", flexShrink: 0,
      letterSpacing: "0.04em",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Client chip ───────────────────────────────────────────────────────────────
function ClientChip({ clientId }) {
  const c = clientOf(clientId);
  if (!clientId || !c) return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: "0.05em",
      padding: "1px 6px", borderRadius: 4,
      background: T.surface, border: `1px solid ${T.border}`,
    }}>UNASSIGNED</span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.dim }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
      {c.name}
    </span>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, size = 13 }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      title="Copy"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: copied ? T.green : T.muted, padding: 3, display: "flex", flexShrink: 0,
      }}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

// ── DNS record block (used in detail panel) ───────────────────────────────────
function DnsBlock({ label, recordJson, status }) {
  const rec = parseRec(recordJson);
  if (!rec.value) return null;
  const verified = status === "verified";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
          background: T.accent + "20", color: T.accent, letterSpacing: "0.04em",
        }}>{label}</span>
        {rec.name && (
          <span style={{ fontSize: 11, color: T.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {rec.name}
          </span>
        )}
        {verified && (
          <span style={{ fontSize: 10, fontWeight: 700, color: T.green, whiteSpace: "nowrap" }}>✓ SET</span>
        )}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: T.bg, borderRadius: 6, padding: "7px 10px",
        border: `1px solid ${T.border}`,
      }}>
        <span style={{
          flex: 1, fontFamily: "monospace", fontSize: 11, color: T.dim,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {rec.value}
        </span>
        <CopyBtn text={rec.value} size={12} />
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ domain, onClose, onDeleted, onUpdated }) {
  const [verifying, setVerifying] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const c = clientOf(domain.clientId);

  async function handleVerify() {
    setVerifying(true);
    try {
      const updated = await db.verifyDomain(domain.id);
      onUpdated(updated);
    } catch {}
    finally { setVerifying(false); }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${domain.domainName}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await db.deleteDomain(domain.id);
      onDeleted(domain.id);
    } catch { setDeleting(false); }
  }

  return (
    <div style={{
      width: 460, flexShrink: 0,
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: T.card, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Globe size={18} color={T.muted} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, wordBreak: "break-all" }}>
              {domain.domainName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={domain.status} small />
              <span style={{ fontSize: 11, color: T.muted }}>Added {fmtDate(domain.createdAt)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

        {/* Domain info */}
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Domain Info
        </div>
        {[
          { key: "CLIENT",    val: c ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
              <span style={{ color: T.text, fontSize: 12 }}>{c.name}</span>
            </span>
          ) : <span style={{ fontSize: 12, color: T.muted }}>Unassigned</span> },
          { key: "STATUS",    val: <StatusBadge status={domain.status} small /> },
          { key: "RESEND ID", val: (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: T.dim }}>{domain.resendDomainId}</span>
              <CopyBtn text={domain.resendDomainId} size={11} />
            </div>
          )},
          { key: "CREATED",   val: <span style={{ fontSize: 12, color: T.dim }}>{fmtDate(domain.createdAt)}</span> },
        ].map(({ key, val }) => (
          <div key={key} style={{
            display: "grid", gridTemplateColumns: "90px 1fr",
            alignItems: "center", padding: "9px 0",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.05em" }}>{key}</span>
            <div>{val}</div>
          </div>
        ))}

        {/* DNS Records */}
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "20px 0 12px" }}>
          DNS Records
        </div>
        <DnsBlock label="SPF"         recordJson={domain.spfRecord}   status={domain.status} />
        <DnsBlock label="DKIM"        recordJson={domain.dkimRecord}  status={domain.status} />
        <DnsBlock label="DMARC"       recordJson={domain.dmarcRecord} status={domain.status} />

        {domain.status !== "verified" && (
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-start",
            padding: "10px 12px", borderRadius: 7, marginTop: 6,
            background: T.amber + "10", border: `1px solid ${T.amber}25`,
          }}>
            <AlertTriangle size={13} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: T.amber, lineHeight: 1.5 }}>
              Add the records above to your DNS provider. Changes can take up to 24 hours to propagate. We re-verify automatically every 30 seconds.
            </span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: "12px 20px", borderTop: `1px solid ${T.border}`,
        display: "flex", gap: 10,
      }}>
        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 0", borderRadius: 7,
            background: T.card, border: `1px solid ${T.border}`,
            color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <RefreshCw size={13} style={{ animation: verifying ? "spin 1s linear infinite" : "none" }} />
          {verifying ? "Checking…" : "Re-verify Now"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 0", borderRadius: 7,
            background: T.red + "12", border: `1px solid ${T.red}30`,
            color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Trash2 size={13} />
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ── Domain row ────────────────────────────────────────────────────────────────
function DomainRow({ domain, selected, onClick }) {
  const isSelected = selected?.id === domain.id;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px",
        background: isSelected ? T.accent + "0a" : T.card,
        border: `1px solid ${isSelected ? T.accent + "60" : T.border}`,
        borderRadius: 10, cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.background = T.surface; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.border;   e.currentTarget.style.background = T.card; } }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: T.surface, border: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Globe size={15} color={T.muted} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{domain.domainName}</span>
          <ClientChip clientId={domain.clientId} />
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>
          Added {fmtDate(domain.createdAt)}
          {domain.resendDomainId && (
            <span style={{ fontFamily: "monospace", marginLeft: 6 }}>· {domain.resendDomainId}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <StatusBadge status={domain.status} />
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: T.muted,
          padding: "5px 10px", borderRadius: 6,
          border: `1px solid ${T.border}`,
        }}>
          <ExternalLink size={11} /> View Details
        </span>
        <span style={{ color: T.muted, opacity: 0.5, display: "flex", padding: 2 }}>
          <Trash2 size={14} />
        </span>
      </div>
    </div>
  );
}

// ── Add domain modal ──────────────────────────────────────────────────────────
function AddDomainModal({ onClose, onAdded }) {
  const [name,      setName]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [newDomain, setNewDomain] = useState(null);

  // clientId is injected automatically from the active pool singleton in api.js
  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true); setError("");
    try {
      const domain = await db.addDomain(trimmed);
      setNewDomain(domain);
      onAdded(domain);
    } catch (err) {
      setError(err.message || "Failed to add domain");
    } finally { setLoading(false); }
  }

  // ── DNS result screen ──────────────────────────────────────────────────────
  if (newDomain) {
    return (
      <Modal title="DNS Records" onClose={onClose} width={580}>
        <div style={{ padding: "10px 12px", borderRadius: 6, marginBottom: 16, background: T.green + "10", border: `1px solid ${T.green}30`, color: T.green, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={14} />
          <strong>{newDomain.domainName}</strong> added. Add these DNS records to verify ownership.
        </div>
        {[
          { label: "SPF",         json: newDomain.spfRecord   },
          { label: "DKIM",        json: newDomain.dkimRecord  },
          { label: "Return-Path", json: newDomain.dmarcRecord },
        ].map(({ label, json }) => {
          const rec = parseRec(json);
          if (!rec.value) return null;
          return (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: T.accent + "20", color: T.accent }}>{label}</span>
                {rec.name && <span style={{ fontSize: 11, color: T.muted }}>{rec.name}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg, borderRadius: 6, padding: "7px 10px", border: `1px solid ${T.border}` }}>
                <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: T.dim, wordBreak: "break-all" }}>{rec.value}</span>
                <CopyBtn text={rec.value} size={12} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 6, background: T.amber + "10", border: `1px solid ${T.amber}25`, color: T.amber, fontSize: 11, display: "flex", alignItems: "center", gap: 7 }}>
          <AlertTriangle size={13} /> Add these records to your DNS provider then wait 5–30 minutes.
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: T.accent, border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, padding: "9px 22px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
      </Modal>
    );
  }

  // ── Add form ───────────────────────────────────────────────────────────────
  return (
    <Modal noHeader onClose={onClose} width={500}>
      {/* Custom header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: T.accent + "22", border: `1px solid ${T.accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Globe size={20} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 3 }}>Add Sending Domain</div>
            <div style={{ fontSize: 12, color: T.muted }}>DNS records will be generated next</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      {/* Domain name */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 7, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Domain Name <span style={{ color: T.red }}>*</span>
        </label>
        <div style={{ position: "relative" }}>
          <Globe size={14} color={T.muted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="yourdomain.com"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 7, padding: "10px 12px 10px 34px",
              color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit",
            }}
            onFocus={e => (e.target.style.borderColor = T.accent)}
            onBlur={e  => (e.target.style.borderColor = T.border)}
          />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
          Use a subdomain (e.g. <code style={{ fontFamily: "monospace", color: T.dim }}>mail.</code>) to keep your root domain isolated.
        </div>
      </div>

      {error && <div style={{ padding: "9px 12px", borderRadius: 6, marginBottom: 16, background: T.red + "18", border: `1px solid ${T.red}40`, color: T.red, fontSize: 12 }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, color: T.text, padding: "9px 18px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading || !name.trim()} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", borderRadius: 7, color: "#fff", fontWeight: 700, padding: "9px 18px", fontSize: 12, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", opacity: !name.trim() ? 0.5 : 1 }}>
          <Plus size={14} /> {loading ? "Adding…" : "Add Domain"}
        </button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DomainsPage() {
  const { pool, clientId } = usePool();
  const [domains,    setDomains]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);
  const [showModal,  setShowModal]  = useState(false);
  const [lastCheck,  setLastCheck]  = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchDomains = useCallback(async () => {
    try {
      const data = await db.getDomains();
      setDomains(data);
      setLastCheck(Date.now());
      setSecondsAgo(0);
      setSelected(prev => prev ? (data.find(d => d.id === prev.id) || null) : null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  // Re-fetch whenever the active pool/client changes; clear stale selection
  useEffect(() => {
    setSelected(null);
    fetchDomains();
  }, [fetchDomains, pool, clientId]);
  useEffect(() => { const id = setInterval(fetchDomains, 30_000); return () => clearInterval(id); }, [fetchDomains]);
  useEffect(() => { const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastCheck) / 1000)), 1000); return () => clearInterval(id); }, [lastCheck]);

  function handleAdded(domain) {
    setDomains(prev => prev.some(d => d.id === domain.id) ? prev : [domain, ...prev]);
  }
  function handleDeleted(id) {
    setDomains(prev => prev.filter(d => d.id !== id));
    setSelected(null);
  }
  function handleUpdated(updated) {
    setDomains(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelected(updated);
  }

  // Filter — server already pre-filters by active client; just apply local search
  const filtered = domains.filter(d =>
    !search.trim() || d.domainName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "TOTAL",    value: domains.length,                              color: T.text  },
    { label: "VERIFIED", value: domains.filter(d => d.status === "verified").length, color: T.green },
    { label: "PENDING",  value: domains.filter(d => d.status === "pending").length,  color: T.amber },
    { label: "FAILED",   value: domains.filter(d => d.status === "failed").length,   color: T.red   },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", margin: "-20px" }}>

      {/* ── Left: list ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 20px", minWidth: 0 }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Marketing · Setup
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 5, letterSpacing: "-0.02em" }}>Sending Domains</div>
            <div style={{ fontSize: 13, color: T.muted }}>Verify domains so your emails pass SPF, DKIM and DMARC checks.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={fetchDomains} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.accent, border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={14} /> Add Domain
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 14, pointerEvents: "none" }}>⌕</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by domain name..."
              style={{ width: "100%", boxSizing: "border-box", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px 8px 34px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e  => (e.target.style.borderColor = T.border)}
            />
          </div>
        </div>

        {/* Domain list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>Loading domains…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "50px 24px", textAlign: "center" }}>
            <Globe size={28} color={T.border} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
              {search ? "No domains match your search" : "No sending domains yet"}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>
              {search ? "Try a different search term." : "Add and verify a domain to start sending emails."}
            </div>
            {!search && (
              <button onClick={() => setShowModal(true)} style={{ background: T.accent, border: "none", borderRadius: 6, color: "#fff", fontWeight: 700, padding: "9px 22px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                + Add Domain
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(d => (
              <DomainRow key={d.id} domain={d} selected={selected} onClick={() => setSelected(prev => prev?.id === d.id ? null : d)} />
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div style={{ marginTop: 16, fontSize: 11, color: T.muted, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
            Auto-refreshes every 30s · last sync {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
          </div>
        )}
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────────────── */}
      {selected && (
        <DetailPanel
          domain={selected}
          onClose={() => setSelected(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}

      {showModal && (
        <AddDomainModal onClose={() => setShowModal(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}
