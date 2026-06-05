import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAppToast } from "../../context/ToastContext";
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, HelpCircle, Zap, Shield, RefreshCw } from "lucide-react";
import * as db from "../../services/api";

// ── Shared UI primitives ──────────────────────────────────────────────────────

function FieldRow({ label, hint, children }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: T.muted, opacity: 0.6 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  const T = useTheme();
  const accent = "#6366f1";
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "9px 12px", boxSizing: "border-box",
        background: disabled ? T.border + "30" : T.bg,
        border: `1.5px solid ${T.border}`, borderRadius: 8,
        color: disabled ? T.muted : T.text, fontSize: 12,
        outline: "none", fontFamily: "inherit", cursor: disabled ? "not-allowed" : "text",
        transition: "border-color 0.15s",
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = accent; }}
      onBlur={e => { e.target.style.borderColor = T.border; }}
    />
  );
}

function MaskedKeyInput({ masked, value, onChange, placeholder }) {
  const T = useTheme();
  const accent = "#6366f1";
  const [editing, setEditing] = useState(!masked);
  const [show, setShow] = useState(false);

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          flex: 1, padding: "9px 12px", boxSizing: "border-box",
          background: T.border + "30", border: `1.5px solid ${T.border}`, borderRadius: 8,
          color: T.muted, fontSize: 12, fontFamily: "monospace", letterSpacing: "0.05em",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Shield size={11} color={T.muted} />
          <span>{masked}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.border}`,
            background: "transparent", color: T.text, fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text; }}
        >
          Change Key
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Enter API key"}
        autoFocus
        style={{
          width: "100%", padding: "9px 36px 9px 12px", boxSizing: "border-box",
          background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8,
          color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
        onFocus={e => { e.target.style.borderColor = accent; }}
        onBlur={e => { e.target.style.borderColor = T.border; }}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", padding: 0,
      }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function Btn({ onClick, disabled, children, variant = "primary", small, loading }) {
  const T = useTheme();
  const accent = "#6366f1";
  const styles = {
    primary: { bg: accent,     color: "#fff",   border: "none"                         },
    ghost:   { bg: "transparent", color: T.text, border: `1.5px solid ${T.border}`     },
    success: { bg: "#22c55e",  color: "#fff",   border: "none"                         },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: small ? "6px 13px" : "9px 18px",
        borderRadius: 8,
        border: s.border,
        background: (disabled || loading) ? T.border + "80" : s.bg,
        color: (disabled || loading) ? T.muted : s.color,
        fontSize: 12, fontWeight: 600,
        cursor: (disabled || loading) ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 6,
        transition: "opacity 0.15s, transform 0.1s",
        opacity: (disabled || loading) ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = (disabled || loading) ? "0.6" : "1"; }}
    >
      {loading && <RefreshCw size={11} style={{ animation: "spin 0.8s linear infinite" }} />}
      {children}
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connected:           { color: "#22c55e", bg: "#22c55e12", border: "#22c55e25", Icon: CheckCircle2, label: "Connected"           },
  invalid_credentials: { color: "#ef4444", bg: "#ef444412", border: "#ef444425", Icon: XCircle,      label: "Invalid Credentials" },
  error:               { color: "#f97316", bg: "#f9731612", border: "#f9731625", Icon: AlertCircle,  label: "Connection Error"    },
  not_configured:      { color: "#6b7280", bg: "#6b728012", border: "#6b728025", Icon: HelpCircle,   label: "Not Configured"      },
};

function StatusBadge({ status, message }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_configured;
  const { color, bg, border, Icon, label } = cfg;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "7px 12px", borderRadius: 8,
      background: bg, border: `1px solid ${border}`,
    }}>
      <Icon size={13} color={color} />
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>
      {message && status !== "connected" && (
        <span style={{ fontSize: 11, color: "#6b7280" }}>— {message}</span>
      )}
    </div>
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────

const PROVIDER_META = {
  resend: {
    label: "Resend",
    tag:   "API",
    desc:  "Transactional email with high deliverability",
    color: "#6366f1",
    dot:   "●",
  },
  brevo: {
    label: "Brevo",
    tag:   "SMTP",
    desc:  "Email via Brevo SMTP relay",
    color: "#0ea5e9",
    dot:   "●",
  },
};

function ProviderSelector({ value, onChange }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {Object.entries(PROVIDER_META).map(([id, meta]) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 10, textAlign: "left",
              border: `1.5px solid ${active ? meta.color + "80" : T.border}`,
              background: active ? meta.color + "0d" : T.bg,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
              position: "relative", overflow: "hidden",
            }}
          >
            {active && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                borderRadius: "10px 10px 0 0",
              }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? meta.color : T.text }}>{meta.label}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4,
                background: active ? meta.color + "20" : T.border + "60",
                color: active ? meta.color : T.muted,
                letterSpacing: "0.06em",
              }}>{meta.tag}</span>
            </div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{meta.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EmailConfigPage() {
  const T = useTheme();
  const { toast } = useAppToast();

  const [configs, setConfigs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("resend");

  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");

  const [testStatus, setTestStatus] = useState(null);
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await db.getEmailConfig();
      setConfigs(data.configs || []);
      setActiveId(data.activeId || null);
    } catch {
      toast.error("Failed to load email configuration");
    }
  }

  // Reset form + clear test result only when the user switches providers
  const prevProviderRef = useRef(selectedProvider);
  useEffect(() => {
    if (prevProviderRef.current === selectedProvider) return;
    prevProviderRef.current = selectedProvider;
    const saved = configs.find(c => c.providerName === selectedProvider);
    setApiKey("");
    setFromEmail(saved?.defaultFromEmail || "");
    setFromName(saved?.defaultFromName  || "");
    setTestStatus(null);
    setTestMsg("");
  }, [selectedProvider, configs]);

  // Pre-fill form fields from saved config on initial load (when fields are still empty)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (configs.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const saved = configs.find(c => c.providerName === selectedProvider);
    if (saved) {
      setFromEmail(saved.defaultFromEmail || "");
      setFromName(saved.defaultFromName  || "");
    }
  }, [configs]);

  const savedConfig = configs.find(c => c.providerName === selectedProvider);
  const isActive    = savedConfig && savedConfig.id === activeId;
  const selMeta     = PROVIDER_META[selectedProvider];

  async function handleTest() {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await db.testEmailConfig({
        providerName: selectedProvider,
        apiKey:       apiKey || undefined,
        fromEmail:    fromEmail || undefined,
        fromName:     fromName  || undefined,
      });
      setTestStatus(res.status);
      setTestMsg(res.message || "");
    } catch {
      setTestStatus("error");
      setTestMsg("Request failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    // Optimistic update — reflect the new from email/name immediately in the saved list
    setConfigs(prev => {
      const existing = prev.find(c => c.providerName === selectedProvider);
      if (existing) {
        return prev.map(c => c.providerName === selectedProvider
          ? { ...c, defaultFromEmail: fromEmail, defaultFromName: fromName }
          : c
        );
      }
      return prev;
    });
    try {
      const res = await db.saveEmailConfig({
        providerName:     selectedProvider,
        apiKey:           apiKey || undefined,
        defaultFromEmail: fromEmail,
        defaultFromName:  fromName,
      });
      // Update configs with the real server response (includes new masked key if key changed)
      setConfigs(prev => {
        const updated = res.config;
        const exists = prev.find(c => c.providerName === updated.providerName);
        return exists
          ? prev.map(c => c.providerName === updated.providerName ? updated : c)
          : [...prev, updated];
      });
      setApiKey("");
      toast.success("Configuration saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save configuration");
      load(); // revert optimistic update on error
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id, providerName) {
    if (!id) {
      toast.error("Save a configuration first before activating");
      return;
    }
    // Optimistic update — flip the active badge instantly
    setActiveId(id);
    setActivating(true);
    try {
      await db.activateEmailConfig(id);
      toast.success(`${PROVIDER_META[providerName]?.label} is now the active email provider`);
    } catch (err) {
      toast.error(err?.message || "Failed to activate provider");
      load(); // revert on error
    } finally {
      setActivating(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Centered layout wrapper */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        minHeight: "100%", paddingBottom: 48,
      }}>

        {/* ── Main card ── */}
        <div style={{
          width: "100%", maxWidth: 620,
          background: T.surface, border: `1.5px solid ${T.border}`,
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        }}>

          {/* Card header */}
          <div style={{
            padding: "16px 22px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: selMeta.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={13} color={selMeta.color} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                Provider Settings
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
              padding: "3px 8px", borderRadius: 5,
              background: selMeta.color + "18",
              color: selMeta.color,
            }}>
              {selMeta.label.toUpperCase()}
            </span>
          </div>

          <div style={{ padding: "22px 22px 24px" }}>

            {/* Provider selector */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Select Provider
              </div>
              <ProviderSelector value={selectedProvider} onChange={setSelectedProvider} />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: T.border, marginBottom: 22 }} />

            {/* Credentials form */}
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              {selMeta.label} Credentials
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FieldRow label="API Key" hint="required">
                <MaskedKeyInput
                  masked={savedConfig?.apiKeyMasked || ""}
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder={selectedProvider === "resend" ? "re_••••••••••••••••••••" : "xkeysib-••••••••••••••"}
                />
              </FieldRow>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FieldRow label="From Email" hint="optional">
                  <Input
                    value={fromEmail}
                    onChange={setFromEmail}
                    placeholder="hello@yourdomain.com"
                  />
                </FieldRow>
                <FieldRow label="From Name" hint="optional">
                  <Input
                    value={fromName}
                    onChange={setFromName}
                    placeholder="ProPhone"
                  />
                </FieldRow>
              </div>
            </div>

            {/* Connection status */}
            {testStatus && (
              <div style={{ marginTop: 16 }}>
                <StatusBadge status={testStatus} message={testMsg} />
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: T.border, margin: "20px 0 16px" }} />

            {/* Action row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Btn onClick={handleTest} loading={testing} variant="ghost">
                {testing ? "Testing…" : "Test Connection"}
              </Btn>
              <Btn onClick={handleSave} loading={saving}>
                {saving ? "Saving…" : "Save Configuration"}
              </Btn>
              <div style={{ flex: 1 }} />
              {savedConfig && !isActive && (
                <Btn onClick={() => handleActivate(savedConfig.id, selectedProvider)} loading={activating} variant="ghost">
                  {activating ? "Activating…" : "Set as Active"}
                </Btn>
              )}
              {isActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
                  <CheckCircle2 size={13} />
                  <span>Currently Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Saved configurations ── */}
        {configs.length > 0 && (
          <div style={{ width: "100%", maxWidth: 620, marginTop: 16 }}>
            <div style={{
              background: T.surface, border: `1.5px solid ${T.border}`,
              borderRadius: 14, overflow: "hidden",
            }}>
              <div style={{
                padding: "13px 20px", borderBottom: `1px solid ${T.border}`,
                fontSize: 10, fontWeight: 700, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Saved Configurations
              </div>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {configs.map(cfg => {
                  const meta = PROVIDER_META[cfg.providerName] || {};
                  const rowActive = cfg.id === activeId;
                  return (
                    <div key={cfg.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: 9,
                      background: rowActive ? meta.color + "0a" : T.bg,
                      border: `1.5px solid ${rowActive ? meta.color + "30" : T.border}`,
                      transition: "border-color 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: rowActive ? meta.color : T.border,
                          boxShadow: rowActive ? `0 0 5px ${meta.color}60` : "none",
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: rowActive ? meta.color : T.text }}>
                          {meta.label || cfg.providerName}
                        </span>
                        {cfg.apiKeyMasked && (
                          <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{cfg.apiKeyMasked}</span>
                        )}
                        {cfg.defaultFromEmail && (
                          <span style={{ fontSize: 11, color: T.muted }}>{cfg.defaultFromEmail}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {rowActive ? (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
                            padding: "3px 8px", borderRadius: 5,
                            background: meta.color + "18", color: meta.color,
                            border: `1px solid ${meta.color}30`,
                          }}>ACTIVE</span>
                        ) : (
                          <Btn small variant="ghost" onClick={() => handleActivate(cfg.id, cfg.providerName)}>
                            Activate
                          </Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
