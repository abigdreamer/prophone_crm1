import { useState, useEffect, useCallback } from "react";
import { Globe, Plus, Copy, Check, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import Modal from "../components/ui/Modal";
import * as db from "../lib/db";

// ── Domain-specific design tokens (exact colors from spec) ────────────────────
const D = {
  card:     "#1a1d26",
  border:   "rgba(255,255,255,0.10)",
  verified: "#5DCAA5",
  pending:  "#FAC775",
  failed:   "#F09595",
  text:     "rgba(255,255,255,0.9)",
  muted:    "rgba(255,255,255,0.45)",
  dim:      "rgba(255,255,255,0.25)",
  surface:  "rgba(255,255,255,0.04)",
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const color = status === "verified" ? D.verified : status === "failed" ? D.failed : D.pending;
  const label = status === "verified" ? "Verified"  : status === "failed" ? "Failed"   : "Pending";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: color + "18", color, border: `1px solid ${color}40`,
      flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        background: "none", border: `1px solid ${D.border}`, borderRadius: 5,
        color: copied ? D.verified : D.muted, cursor: "pointer",
        padding: "3px 9px", fontSize: 11,
        display: "flex", alignItems: "center", gap: 4,
        fontFamily: "inherit", transition: "color 0.15s", flexShrink: 0,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── DNS record row ────────────────────────────────────────────────────────────
function RecordRow({ label, recordJson, domainStatus }) {
  let rec = {};
  try { rec = recordJson ? JSON.parse(recordJson) : {}; } catch {}

  const hasValue  = !!rec.value;
  const isSuggested = rec.note || rec.status === "suggested";
  const pass = domainStatus === "verified";

  if (!hasValue) return null;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "11px 0", borderTop: `0.5px solid ${D.border}`,
    }}>
      {/* Label badge */}
      <div style={{ width: 60, flexShrink: 0, paddingTop: 2 }}>
        <span style={{
          display: "inline-block", padding: "2px 7px", borderRadius: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
          background: pass ? D.verified + "18" : D.pending + "15",
          color: pass ? D.verified : D.pending,
        }}>
          {label}
        </span>
      </div>

      {/* Record details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {(rec.type || rec.name) && (
          <div style={{ fontSize: 10, color: D.muted, marginBottom: 5 }}>
            Type: {rec.type || "—"}
            {rec.name && <> &nbsp;·&nbsp; Host: <span style={{ color: D.text }}>{rec.name}</span></>}
            {rec.priority != null && <> &nbsp;·&nbsp; Priority: {rec.priority}</>}
          </div>
        )}
        <div style={{
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: 10, color: D.text, wordBreak: "break-all",
          background: D.surface, padding: "7px 10px", borderRadius: 5,
          lineHeight: 1.5,
        }}>
          {rec.value}
        </div>
        {isSuggested && (
          <div style={{ fontSize: 10, color: D.muted, marginTop: 4, fontStyle: "italic" }}>
            {rec.note || "Recommended — add manually"}
          </div>
        )}
      </div>

      {/* Status + copy */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: pass ? D.verified : D.pending, whiteSpace: "nowrap" }}>
          {pass ? "✓ Pass" : "· Waiting"}
        </span>
        <CopyBtn text={rec.value} />
      </div>
    </div>
  );
}

// ── Domain card ───────────────────────────────────────────────────────────────
function DomainCard({ domain, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove ${domain.domainName}? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(domain.id).catch(() => setDeleting(false));
  }

  return (
    <div style={{
      background: D.card,
      border: `0.5px solid ${D.border}`,
      borderRadius: 8, overflow: "hidden",
      opacity: deleting ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Globe size={16} color={D.muted} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: D.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {domain.domainName}
            </div>
            <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
              Added {new Date(domain.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <StatusBadge status={domain.status} />
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: "none", border: `1px solid ${D.border}`, borderRadius: 5,
              color: D.muted, cursor: "pointer", padding: "4px 10px",
              fontSize: 11, fontFamily: "inherit",
            }}
          >
            {expanded ? "Hide DNS" : "View DNS"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: "none", border: "none", cursor: "pointer", color: D.dim, padding: 4, display: "flex" }}
            title="Remove domain"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* DNS records panel */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `0.5px solid ${D.border}` }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: D.muted,
            letterSpacing: "0.8px", padding: "12px 0 4px", textTransform: "uppercase",
          }}>
            DNS Records — add to your DNS provider
          </div>
          <RecordRow label="SPF"          recordJson={domain.spfRecord}   domainStatus={domain.status} />
          <RecordRow label="DKIM"         recordJson={domain.dkimRecord}  domainStatus={domain.status} />
          <RecordRow label="Return-Path"  recordJson={domain.dmarcRecord} domainStatus={domain.status} />

          {domain.status === "pending" && (
            <div style={{
              marginTop: 14, padding: "9px 12px", borderRadius: 6,
              background: D.pending + "10", border: `1px solid ${D.pending}25`,
              color: D.pending, fontSize: 11, display: "flex", alignItems: "center", gap: 7,
            }}>
              <AlertCircle size={13} />
              Add these records to your DNS provider, then wait 5–30 minutes for verification.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add domain modal ──────────────────────────────────────────────────────────
function AddDomainModal({ onClose, onAdded }) {
  const [name,      setName]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [newDomain, setNewDomain] = useState(null);

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
    } finally {
      setLoading(false);
    }
  }

  // ── After domain is created: show DNS instructions ─────────────────────────
  if (newDomain) {
    return (
      <Modal title="Add DNS Records" onClose={onClose} width={580}>
        <div style={{
          padding: "10px 12px", borderRadius: 6, marginBottom: 20,
          background: D.verified + "10", border: `1px solid ${D.verified}30`,
          color: D.verified, fontSize: 12, display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={14} />
          <strong>{newDomain.domainName}</strong> added. Add these DNS records to verify ownership.
        </div>

        <RecordRow label="SPF"          recordJson={newDomain.spfRecord}   domainStatus="pending" />
        <RecordRow label="DKIM"         recordJson={newDomain.dkimRecord}  domainStatus="pending" />
        <RecordRow label="Return-Path"  recordJson={newDomain.dmarcRecord} domainStatus="pending" />

        <div style={{
          marginTop: 16, padding: "9px 12px", borderRadius: 6,
          background: D.pending + "10", border: `1px solid ${D.pending}25`,
          color: D.pending, fontSize: 11, display: "flex", alignItems: "center", gap: 7,
        }}>
          <AlertCircle size={13} />
          Add these records to your DNS provider (Cloudflare, Dynadot, GoDaddy, etc.) then wait 5–30 minutes.
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: D.verified, border: "none", borderRadius: 6,
              color: "#0f1117", fontWeight: 700, padding: "9px 22px",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // ── Domain name input ──────────────────────────────────────────────────────
  return (
    <Modal title="Add Sending Domain" onClose={onClose} width={480}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: D.muted, margin: "0 0 16px" }}>
          Enter the domain you'll send emails from. You'll need to add DNS records to your provider.
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="yourdomain.com"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`,
            borderRadius: 6, padding: "9px 12px", color: D.text,
            fontSize: 13, outline: "none", fontFamily: "inherit",
          }}
          onFocus={e  => (e.target.style.borderColor = D.verified)}
          onBlur={e   => (e.target.style.borderColor = D.border)}
        />
      </div>

      {error && (
        <div style={{
          padding: "9px 12px", borderRadius: 6, marginBottom: 16,
          background: D.failed + "18", border: `1px solid ${D.failed}40`,
          color: D.failed, fontSize: 12,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: `1px solid ${D.verified}`,
            borderRadius: 6, color: D.verified, padding: "8px 16px",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          style={{
            background: D.verified, border: "none", borderRadius: 6,
            color: "#0f1117", fontWeight: 700, padding: "8px 18px",
            fontSize: 12, cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit", opacity: !name.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Adding…" : "Add Domain"}
        </button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PageDomains() {
  const [domains,    setDomains]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [lastCheck,  setLastCheck]  = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchDomains = useCallback(async () => {
    try {
      const data = await db.getDomains();
      setDomains(data);
      setLastCheck(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      console.error("Failed to load domains:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  // Auto-refresh every 30 seconds (webhook updates DB; this picks up changes)
  useEffect(() => {
    const id = setInterval(fetchDomains, 30_000);
    return () => clearInterval(id);
  }, [fetchDomains]);

  // "X seconds ago" ticker
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastCheck) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastCheck]);

  async function handleDelete(id) {
    await db.deleteDomain(id);
    setDomains(prev => prev.filter(d => d.id !== id));
  }

  function handleAdded(domain) {
    setDomains(prev => {
      const exists = prev.some(d => d.id === domain.id);
      return exists ? prev : [domain, ...prev];
    });
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 4 }}>Sending Domains</div>
          <div style={{ fontSize: 12, color: D.muted }}>
            Verify domains so your emails pass SPF and DKIM checks.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={fetchDomains}
            style={{
              background: "none", border: `1px solid ${D.border}`, borderRadius: 6,
              color: D.muted, padding: "6px 11px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "inherit",
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: D.verified, border: "none", borderRadius: 6,
              color: "#0f1117", fontWeight: 700, padding: "7px 14px",
              fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
            }}
          >
            <Plus size={13} /> Add Domain
          </button>
        </div>
      </div>

      {/* ── Last-checked indicator ──────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: 10, color: D.dim, marginBottom: 14, textAlign: "right" }}>
          Last checked: {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
          &nbsp;·&nbsp; auto-refreshes every 30s
        </div>
      )}

      {/* ── Domain list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: D.muted, fontSize: 13 }}>
          Loading domains…
        </div>
      ) : domains.length === 0 ? (
        <div style={{
          background: D.card, border: `0.5px solid ${D.border}`, borderRadius: 8,
          padding: "60px 24px", textAlign: "center",
        }}>
          <Globe size={32} color="rgba(255,255,255,0.10)" style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: D.text, marginBottom: 6 }}>
            No sending domains yet
          </div>
          <div style={{ fontSize: 12, color: D.muted, marginBottom: 22 }}>
            Add and verify a domain to start sending emails on behalf of your clients.
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: D.verified, border: "none", borderRadius: 6,
              color: "#0f1117", fontWeight: 700, padding: "9px 22px",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + Add Domain
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {domains.map(d => (
            <DomainCard key={d.id} domain={d} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <AddDomainModal
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
