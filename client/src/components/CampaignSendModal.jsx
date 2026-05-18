import { useState, useEffect } from "react";
import { Mail, Filter, CheckCircle, XCircle, Loader, ChevronRight, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import * as db from "../services/api";

const PRESET_DOMAINS = [
  { label: "@gmail.com",   value: "gmail.com" },
  { label: "@yahoo.com",   value: "yahoo.com" },
  { label: "@outlook.com", value: "outlook.com" },
  { label: "@hotmail.com", value: "hotmail.com" },
];

// ─── Step indicators ──────────────────────────────────────────────────────────

function Step({ n, label, active, done, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 800,
        background: done ? T.green : active ? T.accent : T.border,
        color: done || active ? "#fff" : T.muted,
        transition: "all 0.2s",
      }}>
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? T.text : T.muted }}>
        {label}
      </span>
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, selected, onClick, T }) {
  const statusColor = {
    draft: T.muted, sent: T.green, sending: T.amber,
  }[campaign.status] || T.muted;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px", borderRadius: 8, cursor: "pointer",
        border: "1px solid " + (selected ? T.accent : T.border),
        background: selected ? T.accent + "10" : T.surface,
        transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 10,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = T.accent + "66"; e.currentTarget.style.background = T.card; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; } }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: (selected ? T.accent : T.blue) + "18",
        border: "1px solid " + (selected ? T.accent : T.blue) + "30",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Mail size={14} color={selected ? T.accent : T.blue} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {campaign.name}
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
          {campaign.template?.name || "No template"} ·{" "}
          <span style={{ color: statusColor, fontWeight: 600 }}>{campaign.status}</span>
        </div>
      </div>
      {selected && <CheckCircle size={14} color={T.accent} style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CampaignSendModal({ contactIds = [], contacts = [], onClose, onSent }) {
  const T = useTheme();
  const toast = useAppToast();

  const [step, setStep] = useState(1);           // 1=pick, 2=filter, 3=confirm, 4=done
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [domainFilters, setDomainFilters] = useState([]);
  const [customDomain, setCustomDomain] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const contactCount = contactIds.length;

  // Live count: how many selected contacts match the active domain filters
  const filteredCount = domainFilters.length === 0
    ? contactCount
    : contacts.filter(c => {
        if (!c.email) return false;
        const domain = c.email.split("@")[1]?.toLowerCase();
        return domain && domainFilters.some(f => domain === f || domain.endsWith("." + f));
      }).length;

  useEffect(() => {
    db.getCampaigns()
      .then(r => setCampaigns(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => toast.error("Failed to load campaigns."))
      .finally(() => setLoadingCampaigns(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function toggleDomain(domain) {
    setDomainFilters(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  }

  function addCustomDomain() {
    const d = customDomain.trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "");
    if (!d || !d.includes(".")) return;
    if (!domainFilters.includes(d)) setDomainFilters(prev => [...prev, d]);
    setCustomDomain("");
  }

  async function handleSend() {
    if (!selectedCampaign) return;
    setSending(true);
    try {
      const res = await db.quickSendCampaign(selectedCampaign.id, {
        contactIds,
        domainFilter: domainFilters,
      });
      setResult(res);
      setStep(4);
      onSent?.(res);
      toast.success(`Sent to ${res.sent} contact${res.sent !== 1 ? "s" : ""}.`);
    } catch (err) {
      toast.error(err?.message || "Send failed. Check campaign configuration.");
    } finally {
      setSending(false);
    }
  }

  const activeDomains = [...domainFilters];
  const filterLabel = activeDomains.length
    ? activeDomains.map(d => "@" + d).join(", ")
    : "All email domains";

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 9000,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };

  const modalStyle = {
    background: T.card, border: "1px solid " + T.border,
    borderRadius: 16, width: "100%", maxWidth: 520,
    boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
    display: "flex", flexDirection: "column", maxHeight: "88vh",
  };

  const inputStyle = {
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 7, padding: "8px 11px", color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: T.accent + "18",
            border: "1px solid " + T.accent + "30",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Mail size={16} color={T.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Send Campaign Email</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
              {domainFilters.length > 0 ? (
                <>
                  <span style={{ color: T.accent, fontWeight: 700 }}>{filteredCount.toLocaleString()}</span>
                  <span> of {contactCount.toLocaleString()} contacts match filters</span>
                </>
              ) : (
                <>{contactCount.toLocaleString()} contact{contactCount !== 1 ? "s" : ""} selected</>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, borderRadius: 6, display: "flex" }}
            onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.muted; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid " + T.border,
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          }}>
            <Step n={1} label="Select Campaign" active={step === 1} done={step > 1} T={T} />
            <ChevronRight size={12} color={T.border} />
            <Step n={2} label="Filter Domains" active={step === 2} done={step > 2} T={T} />
            <ChevronRight size={12} color={T.border} />
            <Step n={3} label="Confirm & Send" active={step === 3} done={step > 3} T={T} />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {/* Step 1 — Campaign selection */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Choose a campaign
              </div>
              {loadingCampaigns ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20, color: T.muted, fontSize: 12 }}>
                  <Loader size={14} style={{ animation: "crm-spin 0.8s linear infinite" }} />
                  Loading campaigns…
                </div>
              ) : campaigns.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>
                  No campaigns found. Create one first.
                </div>
              ) : (
                campaigns.map(c => (
                  <CampaignCard
                    key={c.id} campaign={c}
                    selected={selectedCampaign?.id === c.id}
                    onClick={() => setSelectedCampaign(c)}
                    T={T}
                  />
                ))
              )}
            </div>
          )}

          {/* Step 2 — Domain filter */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Filter by email provider
                  </div>
                  {/* Live count badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 20,
                    background: domainFilters.length > 0 ? T.accent + "15" : T.surface,
                    border: "1px solid " + (domainFilters.length > 0 ? T.accent + "40" : T.border),
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: domainFilters.length > 0 ? T.accent : T.text, lineHeight: 1 }}>
                      {filteredCount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 10, color: T.muted }}>
                      {domainFilters.length > 0 ? `of ${contactCount.toLocaleString()}` : "contacts"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 12, lineHeight: 1.6 }}>
                  Select providers to limit who receives this email. Leave all unselected to send to everyone.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PRESET_DOMAINS.map(({ label, value }) => {
                    const active = domainFilters.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleDomain(value)}
                        style={{
                          padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit",
                          background: active ? T.accent + "18" : T.surface,
                          border: "1px solid " + (active ? T.accent : T.border),
                          color: active ? T.accent : T.dim,
                          transition: "all 0.15s",
                        }}
                      >
                        {active && "✓ "}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom domain input */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Add custom domain
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomDomain(); } }}
                    placeholder="e.g. company.com"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = T.accent)}
                    onBlur={e => (e.target.style.borderColor = T.border)}
                  />
                  <button
                    onClick={addCustomDomain}
                    style={{
                      padding: "8px 16px", borderRadius: 7, background: T.surface,
                      border: "1px solid " + T.border, color: T.dim, fontSize: 12,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Active filters */}
              {domainFilters.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Active filters
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {domainFilters.map(d => (
                      <span
                        key={d}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 20,
                          background: T.accent + "15", border: "1px solid " + T.accent + "40",
                          color: T.accent, fontSize: 11, fontWeight: 600,
                        }}
                      >
                        @{d}
                        <button
                          onClick={() => setDomainFilters(prev => prev.filter(x => x !== d))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, padding: 0, fontSize: 12, lineHeight: 1, display: "flex" }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && selectedCampaign && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Send summary
                </div>
                {[
                  ["Campaign",  selectedCampaign.name],
                  ["Template",  selectedCampaign.template?.name || "—"],
                  ["Recipients", domainFilters.length > 0
                    ? `${filteredCount.toLocaleString()} of ${contactCount.toLocaleString()} contacts`
                    : `${contactCount.toLocaleString()} contact${contactCount !== 1 ? "s" : ""}`],
                  ["Domain filter", filterLabel],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid " + T.border + "66" }}>
                    <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 11, color: T.text, fontWeight: 600, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{
                background: T.amber + "0d", border: "1px solid " + T.amber + "30",
                borderRadius: 8, padding: "10px 14px",
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: 11, color: T.dim, lineHeight: 1.6 }}>
                  Canceled contacts are automatically excluded. Each email address will only receive one copy (deduplication applied).
                </span>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && result && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
                background: T.green + "18", border: "2px solid " + T.green + "40",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle size={24} color={T.green} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                Emails Sent!
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, lineHeight: 1.6 }}>
                <span style={{ color: T.green, fontWeight: 700, fontSize: 20 }}>{result.sent}</span>
                {" "}email{result.sent !== 1 ? "s" : ""} sent successfully.
                {result.skipped > 0 && (
                  <> <span style={{ color: T.muted }}>{result.skipped} skipped</span> (no email, filtered out, or suppressed).</>
                )}
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                Open/click tracking is active. Check the campaign analytics page for results.
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid " + T.border,
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
        }}>
          {step === 4 ? (
            <button
              onClick={onClose}
              style={{
                padding: "9px 22px", borderRadius: 8, background: T.accent,
                border: "none", color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                disabled={sending}
                style={{
                  padding: "9px 18px", borderRadius: 8, background: T.surface,
                  border: "1px solid " + T.border, color: T.dim, fontSize: 12, fontWeight: 600,
                  cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 && !selectedCampaign}
                  style={{
                    padding: "9px 22px", borderRadius: 8,
                    background: (step === 1 && !selectedCampaign) ? T.border : T.accent,
                    border: "none",
                    color: (step === 1 && !selectedCampaign) ? T.muted : "#fff",
                    fontSize: 12, fontWeight: 700,
                    cursor: (step === 1 && !selectedCampaign) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  Next <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    padding: "9px 22px", borderRadius: 8,
                    background: sending ? T.accent + "88" : T.accent,
                    border: "none", color: "#fff", fontSize: 12, fontWeight: 700,
                    cursor: sending ? "wait" : "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {sending ? (
                    <><Loader size={13} style={{ animation: "crm-spin 0.8s linear infinite" }} /> Sending…</>
                  ) : (
                    <><Mail size={13} /> Send Now</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
