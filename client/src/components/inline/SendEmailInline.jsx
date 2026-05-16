import { useState, useEffect } from "react";
import { Mail, ChevronRight, CheckCircle, ArrowLeft, Loader } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAppToast } from "../../context/ToastContext";
import * as db from "../../services/api";

const PRESET_DOMAINS = [
  { label: "@gmail.com",   value: "gmail.com" },
  { label: "@yahoo.com",   value: "yahoo.com" },
  { label: "@outlook.com", value: "outlook.com" },
  { label: "@hotmail.com", value: "hotmail.com" },
];

function StepDot({ n, label, active, done, T }) {
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

function CampaignCard({ campaign, selected, onClick, T }) {
  const statusColor = { draft: T.muted, sent: T.green, sending: T.amber }[campaign.status] || T.muted;
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px", borderRadius: 8, cursor: "pointer",
        border: "1px solid " + (selected ? T.accent : T.border),
        background: selected ? T.accent + "10" : T.surface,
        display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = T.accent + "55"; e.currentTarget.style.background = T.card; } }}
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

export default function SendEmailInline({ contactIds = [], onBack, onSent }) {
  const T = useTheme();
  const toast = useAppToast();

  const [step, setStep] = useState(1);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [domainFilters, setDomainFilters] = useState([]);
  const [customDomain, setCustomDomain] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const contactCount = contactIds.length;

  useEffect(() => {
    db.getCampaigns()
      .then(r => setCampaigns(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => toast.error("Failed to load campaigns."))
      .finally(() => setLoadingCampaigns(false));
  }, []);

  function toggleDomain(domain) {
    setDomainFilters(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
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
      toast.success(`Sent to ${res.sent} contact${res.sent !== 1 ? "s" : ""}.`);
      onSent?.(res);
    } catch (err) {
      toast.error(err?.message || "Send failed. Check campaign configuration.");
    } finally {
      setSending(false);
    }
  }

  const filterLabel = domainFilters.length
    ? domainFilters.map(d => "@" + d).join(", ")
    : "All email domains";

  const inputStyle = {
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 7, padding: "8px 11px", color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid " + T.border,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        background: T.card,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "1px solid " + T.border, cursor: "pointer",
            color: T.muted, padding: "5px 10px", borderRadius: 7, display: "flex",
            alignItems: "center", gap: 5, fontSize: 11, fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: T.accent + "18",
          border: "1px solid " + T.accent + "30",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Mail size={15} color={T.accent} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Send Email Campaign</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
            {contactCount} contact{contactCount !== 1 ? "s" : ""} selected
          </div>
        </div>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div style={{
          padding: "10px 20px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          background: T.surface,
        }}>
          <StepDot n={1} label="Select Campaign" active={step === 1} done={step > 1} T={T} />
          <ChevronRight size={11} color={T.border} />
          <StepDot n={2} label="Filter Domains"  active={step === 2} done={step > 2} T={T} />
          <ChevronRight size={11} color={T.border} />
          <StepDot n={3} label="Confirm & Send"  active={step === 3} done={step > 3} T={T} />
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* Step 1 — Pick campaign */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Choose a campaign
            </div>
            {loadingCampaigns ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20, color: T.muted, fontSize: 12 }}>
                <Loader size={14} style={{ animation: "crm-spin 0.8s linear infinite" }} />
                Loading campaigns…
              </div>
            ) : campaigns.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 12 }}>
                No campaigns found. Create one in the Campaigns section first.
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Filter by email provider
              </div>
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 12, lineHeight: 1.6 }}>
                Select providers to limit recipients. Leave all unselected to send to everyone.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESET_DOMAINS.map(({ label, value }) => {
                  const active = domainFilters.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleDomain(value)}
                      style={{
                        padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
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

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Custom domain
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
                    padding: "8px 18px", borderRadius: 7, background: T.surface,
                    border: "1px solid " + T.border, color: T.dim, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >Add</button>
              </div>
            </div>

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
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, padding: 0, fontSize: 13, lineHeight: 1, display: "flex" }}
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && selectedCampaign && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
            <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Send summary
              </div>
              {[
                ["Campaign",     selectedCampaign.name],
                ["Template",     selectedCampaign.template?.name || "—"],
                ["Recipients",   `${contactCount} contact${contactCount !== 1 ? "s" : ""}`],
                ["Domain filter", filterLabel],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid " + T.border + "66" }}>
                  <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: T.text, fontWeight: 600, textAlign: "right", maxWidth: "55%", wordBreak: "break-word" }}>{value}</span>
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
                Canceled contacts are automatically excluded. Each address only receives one copy (deduplication applied). Open/click tracking is active.
              </span>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && result && (
          <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 400, margin: "0 auto" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
              background: T.green + "18", border: "2px solid " + T.green + "40",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CheckCircle size={28} color={T.green} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 10 }}>
              Emails Sent!
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 8, lineHeight: 1.7 }}>
              <span style={{ color: T.green, fontWeight: 800, fontSize: 28, display: "block", lineHeight: 1.2, marginBottom: 4 }}>{result.sent}</span>
              email{result.sent !== 1 ? "s" : ""} sent successfully.
              {result.skipped > 0 && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ color: T.muted }}>{result.skipped} skipped</span>
                  <span style={{ fontSize: 11 }}> (no email, filtered, or suppressed)</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 16 }}>
              Check the Campaigns page for open/click analytics.
            </div>
            <button
              onClick={onBack}
              style={{
                marginTop: 24, padding: "9px 24px", borderRadius: 8,
                background: T.accent, border: "none", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {step < 4 && (
        <div style={{
          padding: "14px 24px", borderTop: "1px solid " + T.border,
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
          background: T.card,
        }}>
          <button
            onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
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
        </div>
      )}
    </div>
  );
}
