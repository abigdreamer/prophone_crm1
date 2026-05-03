import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, Plus, Copy, Check, RefreshCw, Trash2, AlertCircle, ExternalLink, ChevronDown } from "lucide-react";
import Modal from "../components/ui/Modal";
import T from "../theme";
import * as db from "../lib/db";
import CLIENTS from "../data/clients";

const statusColor = s => s === "verified" ? T.green : s === "failed" ? T.red : T.amber;
const statusLabel = s => s === "verified" ? "Verified" : s === "failed" ? "Failed" : "Pending";

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = statusColor(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: c + "18", color: c, border: `1px solid ${c}40`,
      flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
      {statusLabel(status)}
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
        background: "none", border: `1px solid ${T.border}`, borderRadius: 5,
        color: copied ? T.green : T.muted, cursor: "pointer",
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
  if (!rec.value) return null;

  const pass = domainStatus === "verified";
  const passColor = pass ? T.green : T.amber;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "11px 0", borderTop: `0.5px solid ${T.border}`,
    }}>
      <div style={{ width: 66, flexShrink: 0, paddingTop: 2 }}>
        <span style={{
          display: "inline-block", padding: "2px 7px", borderRadius: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
          background: passColor + "18", color: passColor,
        }}>
          {label}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {(rec.type || rec.name) && (
          <div style={{ fontSize: 10, color: T.muted, marginBottom: 5 }}>
            Type: {rec.type || "—"}
            {rec.name && <> &nbsp;·&nbsp; Host: <span style={{ color: T.text }}>{rec.name}</span></>}
            {rec.priority != null && <> &nbsp;·&nbsp; Priority: {rec.priority}</>}
          </div>
        )}
        <div style={{
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 10, color: T.text, wordBreak: "break-all",
          background: T.surface, padding: "7px 10px", borderRadius: 5, lineHeight: 1.5,
        }}>
          {rec.value}
        </div>
        {rec.note && (
          <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontStyle: "italic" }}>
            {rec.note}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: passColor, whiteSpace: "nowrap" }}>
          {pass ? "✓ Pass" : "· Waiting"}
        </span>
        <CopyBtn text={rec.value} />
      </div>
    </div>
  );
}

// ── DNS details modal ─────────────────────────────────────────────────────────
function DnsModal({ domain, onClose }) {
  return (
    <Modal title={`DNS Records — ${domain.domainName}`} onClose={onClose} width={580}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <StatusBadge status={domain.status} />
          <span style={{ fontSize: 11, color: T.muted }}>
            Added {new Date(domain.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <RecordRow label="SPF"          recordJson={domain.spfRecord}   domainStatus={domain.status} />
        <RecordRow label="DKIM"         recordJson={domain.dkimRecord}  domainStatus={domain.status} />
        <RecordRow label="Return-Path"  recordJson={domain.dmarcRecord} domainStatus={domain.status} />
      </div>

      {domain.status === "pending" && (
        <div style={{
          marginTop: 14, padding: "9px 12px", borderRadius: 6,
          background: T.amber + "10", border: `1px solid ${T.amber}25`,
          color: T.amber, fontSize: 11, display: "flex", alignItems: "center", gap: 7,
        }}>
          <AlertCircle size={13} />
          Add these records to your DNS provider, then wait 5–30 minutes for verification.
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
            color: T.text, padding: "8px 20px", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

// ── Domain card ───────────────────────────────────────────────────────────────
function DomainCard({ domain, onDelete }) {
  const [showDns,  setShowDns]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove ${domain.domainName}? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(domain.id).catch(() => setDeleting(false));
  }

  return (
    <>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 14,
        opacity: deleting ? 0.5 : 1, transition: "opacity 0.2s",
      }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: T.surface, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Globe size={16} color={T.muted} />
        </div>

        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {domain.domainName}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            Added {new Date(domain.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <StatusBadge status={domain.status} />
          <button
            onClick={() => setShowDns(true)}
            style={{
              background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
              color: T.dim, cursor: "pointer", padding: "5px 11px",
              fontSize: 11, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <ExternalLink size={11} /> View Details
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, display: "flex", opacity: 0.6 }}
            title="Remove domain"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showDns && <DnsModal domain={domain} onClose={() => setShowDns(false)} />}
    </>
  );
}

// ── Add domain modal ──────────────────────────────────────────────────────────
function AddDomainModal({ onClose, onAdded, clientId }) {
  const [name,             setName]             = useState("");
  const [selectedClientId, setSelectedClientId] = useState(clientId || null);
  const [clientOpen,       setClientOpen]       = useState(false);
  const [dropdownRect,     setDropdownRect]     = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [newDomain,        setNewDomain]        = useState(null);
  const triggerRef = useRef(null);

  const selectedClient = CLIENTS.find(c => c.id === selectedClientId) || null;

  function openClientDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setClientOpen(o => !o);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true); setError("");
    try {
      const domain = await db.addDomain(trimmed, selectedClientId);
      setNewDomain(domain);
      onAdded(domain);
    } catch (err) {
      setError(err.message || "Failed to add domain");
    } finally {
      setLoading(false);
    }
  }

  if (newDomain) {
    return (
      <Modal title="DNS Records" onClose={onClose} width={580}>
        <div style={{
          padding: "10px 12px", borderRadius: 6, marginBottom: 16,
          background: T.green + "10", border: `1px solid ${T.green}30`,
          color: T.green, fontSize: 12, display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={14} />
          <strong>{newDomain.domainName}</strong> added. Add these DNS records to verify ownership.
        </div>
        <RecordRow label="SPF"          recordJson={newDomain.spfRecord}   domainStatus="pending" />
        <RecordRow label="DKIM"         recordJson={newDomain.dkimRecord}  domainStatus="pending" />
        <RecordRow label="Return-Path"  recordJson={newDomain.dmarcRecord} domainStatus="pending" />
        <div style={{
          marginTop: 14, padding: "9px 12px", borderRadius: 6,
          background: T.amber + "10", border: `1px solid ${T.amber}25`,
          color: T.amber, fontSize: 11, display: "flex", alignItems: "center", gap: 7,
        }}>
          <AlertCircle size={13} />
          Add these records to your DNS provider (Cloudflare, GoDaddy, etc.) then wait 5–30 minutes.
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: T.accent, border: "none", borderRadius: 6,
            color: "#fff", fontWeight: 700, padding: "9px 22px",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add Sending Domain" onClose={onClose} width={480}>

      {/* Domain name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.04em" }}>
          DOMAIN NAME
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="yourdomain.com"
          style={{
            width: "100%", boxSizing: "border-box",
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: "9px 12px", color: T.text,
            fontSize: 13, outline: "none", fontFamily: "inherit",
          }}
          onFocus={e => (e.target.style.borderColor = T.accent)}
          onBlur={e  => (e.target.style.borderColor = T.border)}
        />
      </div>

      {/* Client selector */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.04em" }}>
          MAP TO CLIENT
        </label>
        <div style={{ position: "relative" }}>
          <button
            ref={triggerRef}
            onClick={openClientDropdown}
            style={{
              width: "100%", boxSizing: "border-box",
              display: "flex", alignItems: "center", gap: 10,
              background: T.surface, border: `1px solid ${clientOpen ? T.accent : T.border}`,
              borderRadius: 6, padding: "8px 12px", cursor: "pointer",
              fontFamily: "inherit", transition: "border-color 0.15s",
            }}
          >
            {selectedClient ? (
              <>
                <span style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: selectedClient.color + "25",
                  border: `1px solid ${selectedClient.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: selectedClient.color,
                }}>
                  {selectedClient.name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: T.text, fontWeight: 500 }}>
                  {selectedClient.name}
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>{selectedClient.plan}</span>
              </>
            ) : (
              <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: T.muted }}>
                No client — shared / GeniusAI only
              </span>
            )}
            <ChevronDown size={13} color={T.muted} style={{ flexShrink: 0, transform: clientOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>

          {clientOpen && dropdownRect && (
            <div style={{
              position: "fixed",
              top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 8, zIndex: 1100,
              boxShadow: "0 8px 28px rgba(0,0,0,0.7)",
              maxHeight: 220, overflowY: "auto",
            }}>
              {CLIENTS.map(c => {
                const sel = selectedClientId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClientId(c.id); setClientOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "9px 14px", border: "none",
                      background: sel ? c.color + "12" : "transparent",
                      borderLeft: sel ? `2px solid ${c.color}` : "2px solid transparent",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = T.surface; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: c.color + "25", border: `1px solid ${c.color}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, color: c.color,
                    }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: sel ? c.color : T.text, fontWeight: sel ? 600 : 400 }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 10, color: T.muted }}>{c.plan}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: "9px 12px", borderRadius: 6, marginTop: 14,
          background: T.red + "18", border: `1px solid ${T.red}40`,
          color: T.red, fontSize: 12,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: `1px solid ${T.border}`,
            borderRadius: 6, color: T.text, padding: "8px 16px",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          style={{
            background: T.accent, border: "none", borderRadius: 6,
            color: "#fff", fontWeight: 700, padding: "8px 18px",
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

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ domains }) {
  const total    = domains.length;
  const verified = domains.filter(d => d.status === "verified").length;
  const pending  = domains.filter(d => d.status === "pending").length;
  const failed   = domains.filter(d => d.status === "failed").length;

  const stats = [
    { label: "Total",    value: total,    color: T.dim   },
    { label: "Verified", value: verified, color: T.green },
    { label: "Pending",  value: pending,  color: T.amber },
    { label: "Failed",   value: failed,   color: T.red   },
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: 1, background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "12px 16px",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PageDomains({ clientId }) {
  const [domains,    setDomains]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [lastCheck,  setLastCheck]  = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchDomains = useCallback(async () => {
    try {
      const data = await db.getDomains(clientId);
      setDomains(data);
      setLastCheck(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      console.error("Failed to load domains:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  useEffect(() => {
    const id = setInterval(fetchDomains, 30_000);
    return () => clearInterval(id);
  }, [fetchDomains]);

  useEffect(() => {
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastCheck) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastCheck]);

  async function handleDelete(id) {
    await db.deleteDomain(id);
    setDomains(prev => prev.filter(d => d.id !== id));
  }

  function handleAdded(domain) {
    setDomains(prev => prev.some(d => d.id === domain.id) ? prev : [domain, ...prev]);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sending Domains</div>
          <div style={{ fontSize: 12, color: T.muted }}>
            Verify domains so your emails pass SPF and DKIM checks.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={fetchDomains}
            style={{
              background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
              color: T.muted, padding: "6px 11px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "inherit",
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: T.accent, border: "none", borderRadius: 6,
              color: "#fff", fontWeight: 700, padding: "7px 14px",
              fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
            }}
          >
            <Plus size={13} /> Add Domain
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && domains.length > 0 && <StatsBar domains={domains} />}

      {/* Last-checked */}
      {!loading && (
        <div style={{ fontSize: 10, color: T.muted + "80", marginBottom: 12, textAlign: "right" }}>
          Last checked: {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`} · auto-refreshes every 30s
        </div>
      )}

      {/* Domain list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>
          Loading domains…
        </div>
      ) : domains.length === 0 ? (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
          padding: "60px 24px", textAlign: "center",
        }}>
          <Globe size={32} color={T.border} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
            No sending domains yet
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 22 }}>
            Add and verify a domain to start sending emails on behalf of your clients.
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: T.accent, border: "none", borderRadius: 6,
              color: "#fff", fontWeight: 700, padding: "9px 22px",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + Add Domain
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {domains.map(d => (
            <DomainCard key={d.id} domain={d} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <AddDomainModal
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
          clientId={clientId}
        />
      )}
    </div>
  );
}
