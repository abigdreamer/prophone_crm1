import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid, Users, FolderOpen, ChevronLeft, ChevronRight, Mail,
} from "lucide-react";

import ClientsPage from "./ClientsPage";
import ComingSoon from "../components/layout/ComingSoon";

import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import { useAppToast } from "../context/ToastContext";
import * as db from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_OPEN = 230;
const SIDEBAR_COLLAPSED = 60;

const NAV_ITEMS = [
  { id: "contact_fields",  label: "Contact Fields", Icon: LayoutGrid },
  { id: "clients",         label: "Clients",        Icon: FolderOpen },
  { id: "email_provider",  label: "Email",          Icon: Mail       },
  { id: "user_settings",   label: "User",           Icon: Users      },
];

const CONTACT_FIELD_GROUPS = [
  {
    group: "Contact Info",
    fields: [
      { key: "email", label: "Show Email" },
      { key: "phone", label: "Show Phone" },
      { key: "website", label: "Show Website" },
      { key: "address", label: "Show Address" },
    ],
  },
  {
    group: "Company & Acquisition",
    fields: [
      { key: "company", label: "Show Company" },
      { key: "title", label: "Show Job Title" },
      { key: "accountSize", label: "Show Account Size" },
      { key: "source", label: "Show Source" },
      { key: "campaign", label: "Show Campaign" },
    ],
  },
  {
    group: "Metrics",
    fields: [
      { key: "leadScore", label: "Show Lead Score" },
      { key: "contractValue", label: "Show Contract Value" },
      { key: "trucks", label: "Show Fleet Size (Trucks)" },
    ],
  },
  {
    group: "CRM",
    fields: [
      { key: "notes", label: "Show Notes" },
      { key: "tags", label: "Show Tags" },
    ],
  },
  {
    group: "Social Media",
    span: 2,
    fields: [
      { key: "social_facebook", label: "Show Facebook" },
      { key: "social_instagram", label: "Show Instagram" },
      { key: "social_linkedin", label: "Show LinkedIn" },
      { key: "social_twitter", label: "Show Twitter / X" },
      { key: "social_youtube", label: "Show YouTube" },
      { key: "social_yelp", label: "Show Yelp" },
      { key: "social_pinterest", label: "Show Pinterest" },
      { key: "social_tiktok", label: "Show TikTok" },
    ],
  },
];

const DEFAULT_VISIBILITY = Object.fromEntries(
  CONTACT_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, true]))
);

const PROVIDER_META = {
  resend: {
    label:       "Resend",
    description: "Default provider. Best for transactional email with webhooks and domain management.",
    docsUrl:     "https://resend.com",
    envKey:      "RESEND_API_KEY",
  },
  brevo: {
    label:       "Brevo",
    description: "Alternative provider with broad SMTP support and marketing automation.",
    docsUrl:     "https://brevo.com",
    envKey:      "BREVO_API_KEY",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small Components
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  const T = useTheme();

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? T.accent : T.border,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function SmallButton({ children, onClick }) {
  const T = useTheme();

  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 5,
        border: "1px solid " + T.border,
        background: "transparent",
        color: T.muted,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Field Settings
// ─────────────────────────────────────────────────────────────────────────────

function ContactFieldSettings({ clientId }) {
  const T = useTheme();
  const toast = useAppToast();

  const [vis, setVis] = useState(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setDirty(false);

      try {
        const res = await db.getSettings(clientId, "contact_fields");
        if (!mounted) return;

        if (res?.config && Object.keys(res.config).length > 0) {
          setVis({ ...DEFAULT_VISIBILITY, ...res.config });
        } else {
          setVis({ ...DEFAULT_VISIBILITY });
        }
      } catch {
        if (mounted) setVis({ ...DEFAULT_VISIBILITY });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [clientId]);

  const toggleField = useCallback((key) => {
    setVis((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }, []);

  const toggleGroup = useCallback((keys, value) => {
    setVis((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = value));
      return next;
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.saveSettings(clientId, "contact_fields", vis);
      setDirty(false);
      toast.success("Visibility settings updated.");
    } catch {
      toast.error("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: T.muted }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
          Show/Hide Details from Contact
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
          Choose which fields are displayed in the lead profile view.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {CONTACT_FIELD_GROUPS.map(({ group, fields, span }) => {
          const keys = fields.map((f) => f.key);
          const onCount = fields.filter((f) => vis[f.key] !== false).length;

          return (
            <div
              key={group}
              style={{
                gridColumn: span === 2 ? "1 / -1" : undefined,
                background: T.card,
                border: "1px solid " + T.border,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: "1px solid " + T.border,
                  background: T.surface,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
                  {group}{" "}
                  <span style={{ fontWeight: 500, color: T.muted }}>
                    ({onCount}/{fields.length})
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmallButton onClick={() => toggleGroup(keys, true)}>All On</SmallButton>
                  <SmallButton onClick={() => toggleGroup(keys, false)}>All Off</SmallButton>
                </div>
              </div>

              <div style={span === 2 ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : {}}>
                {fields.map((f, idx) => {
                  const isOn = vis[f.key] !== false;
                  return (
                    <div
                      key={f.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "13px 18px",
                        borderBottom: idx === fields.length - 1 ? "none" : "1px solid " + T.border + "44",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: isOn ? T.text : T.muted }}>
                        {f.label}
                      </span>
                      <Toggle checked={isOn} onChange={() => toggleField(f.key)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: dirty ? T.accent : T.surface,
            color: dirty ? "#fff" : T.muted,
            fontWeight: 800,
            cursor: dirty ? "pointer" : "not-allowed",
            transition: "0.2s",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Provider Settings
// ─────────────────────────────────────────────────────────────────────────────

function ProviderCard({ providerKey, selected, onSelect }) {
  const T = useTheme();
  const meta = PROVIDER_META[providerKey] || { label: providerKey, description: "" };
  const isActive = selected === providerKey;

  return (
    <button
      onClick={() => onSelect(providerKey)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: 12,
        border: `2px solid ${isActive ? T.accent : T.border}`,
        background: isActive ? T.accent + "10" : T.card,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      {/* Radio dot */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${isActive ? T.accent : T.border}`,
          background: isActive ? T.accent : "transparent",
          flexShrink: 0,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isActive && (
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? T.accent : T.text }}>
            {meta.label}
          </span>
          {isActive && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: T.accent + "25",
                color: T.accent,
                padding: "2px 7px",
                borderRadius: 20,
                letterSpacing: "0.03em",
              }}
            >
              ACTIVE
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          {meta.description}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: T.dim, fontFamily: "monospace" }}>
          env: {meta.envKey}
        </div>
      </div>
    </button>
  );
}

function EmailProviderSettings() {
  const T = useTheme();
  const toast = useAppToast();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);

  const [effective, setEffective]               = useState(null);
  const [supportedProviders, setSupportedProviders] = useState([]);

  // Local edits
  const [provider, setProvider]               = useState("resend");
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackProvider, setFallbackProvider] = useState("brevo");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    db.getEmailProviderSettings()
      .then((data) => {
        if (!mounted) return;
        setEffective(data.effective);
        setSupportedProviders(data.supportedProviders || []);
        setProvider(data.effective.provider || "resend");
        setFallbackEnabled(data.effective.fallbackEnabled || false);
        setFallbackProvider(data.effective.fallbackProvider || "brevo");
      })
      .catch(() => toast.error("Could not load email provider settings."))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  function markDirty() {
    setDirty(true);
  }

  const handleProviderSelect = (key) => {
    setProvider(key);
    markDirty();
  };

  const handleFallbackToggle = (val) => {
    setFallbackEnabled(val);
    markDirty();
  };

  const handleFallbackProviderSelect = (key) => {
    setFallbackProvider(key);
    markDirty();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await db.saveEmailProviderSettings({
        provider,
        fallbackEnabled,
        fallbackProvider: fallbackEnabled ? fallbackProvider : null,
      });
      setEffective(res.effective);
      setDirty(false);
      toast.success(`Email provider switched to ${PROVIDER_META[provider]?.label ?? provider}.`);
    } catch (err) {
      toast.error(err?.message || "Failed to save email provider settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: T.muted }}>Loading...</div>;
  }

  const fallbackOptions = supportedProviders.filter((p) => p !== provider);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Email Provider</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
          Choose which email delivery service is used for all outbound campaign and transactional email.
          Changes take effect immediately — no server restart required.
        </div>
      </div>

      {/* Current active banner */}
      {effective && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: T.accent + "12",
            border: "1px solid " + T.accent + "30",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: T.dim,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              flexShrink: 0,
              boxShadow: "0 0 6px #22c55e88",
            }}
          />
          Currently sending via{" "}
          <strong style={{ color: T.text }}>
            {PROVIDER_META[effective.provider]?.label ?? effective.provider}
          </strong>
          {effective.fallbackEnabled && effective.fallbackProvider && (
            <span style={{ color: T.muted }}>
              {" "}· fallback:{" "}
              {PROVIDER_META[effective.fallbackProvider]?.label ?? effective.fallbackProvider}
            </span>
          )}
        </div>
      )}

      {/* Provider cards */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: "0.06em" }}>
        SELECT PROVIDER
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {supportedProviders.map((key) => (
          <ProviderCard
            key={key}
            providerKey={key}
            selected={provider}
            onSelect={handleProviderSelect}
          />
        ))}
      </div>

      {/* Fallback section */}
      <div
        style={{
          background: T.card,
          border: "1px solid " + T.border,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: fallbackEnabled ? "1px solid " + T.border : "none",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Automatic Fallback</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              If the primary provider fails, retry with a secondary provider automatically.
            </div>
          </div>
          <Toggle checked={fallbackEnabled} onChange={handleFallbackToggle} />
        </div>

        {fallbackEnabled && (
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 10, letterSpacing: "0.05em" }}>
              FALLBACK PROVIDER
            </div>
            {fallbackOptions.length === 0 ? (
              <div style={{ fontSize: 12, color: T.muted }}>
                No other providers available. Add another provider to enable fallback.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                {fallbackOptions.map((key) => {
                  const isSelected = fallbackProvider === key;
                  const meta = PROVIDER_META[key] || { label: key };
                  return (
                    <button
                      key={key}
                      onClick={() => handleFallbackProviderSelect(key)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                        background: isSelected ? T.accent + "12" : T.surface,
                        color: isSelected ? T.accent : T.dim,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "0.15s",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Env var reminder */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: T.surface,
          border: "1px solid " + T.border,
          marginBottom: 28,
          fontSize: 12,
          color: T.muted,
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: T.dim }}>API keys must be set in your server environment.</strong>{" "}
        Add <code style={{ fontFamily: "monospace", color: T.accent }}>RESEND_API_KEY</code> or{" "}
        <code style={{ fontFamily: "monospace", color: T.accent }}>BREVO_API_KEY</code> to{" "}
        <code style={{ fontFamily: "monospace", color: T.dim }}>server/.env</code>. The setting here
        only controls which configured provider is active.
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            background: dirty ? T.accent : T.surface,
            color: dirty ? "#fff" : T.muted,
            fontWeight: 800,
            fontSize: 14,
            cursor: dirty ? "pointer" : "not-allowed",
            transition: "0.2s",
          }}
        >
          {saving ? "Saving..." : "Apply Changes"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const T = useTheme();
  const { clientId } = usePool();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "contact_fields";
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_OPEN;

  return (
    <div style={{ display: "flex", height: "100%", margin: "-20px", overflow: "hidden" }}>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          background: T.surface,
          borderRight: "1px solid " + T.border,
          transition: "width 0.2s",
          position: "relative",
        }}
      >
        <button
          onClick={() => setCollapsed((p) => !p)}
          style={{
            position: "absolute",
            right: -12,
            top: 18,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid " + T.border,
            background: T.surface,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div style={{ padding: 12 }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setSearchParams({ tab: id })}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: active ? T.accent + "15" : "transparent",
                  color: active ? T.accent : T.dim,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  marginBottom: 6,
                  transition: "0.2s",
                  textAlign: "left",
                }}
              >
                <Icon size={18} />
                {!collapsed && label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {activeTab === "contact_fields" && (
          <ContactFieldSettings clientId={clientId} />
        )}
        {activeTab === "clients" && <ClientsPage />}
        {activeTab === "email_provider" && <EmailProviderSettings />}
        {activeTab === "user_settings" && <ComingSoon page="User Settings" />}
      </div>
    </div>
  );
}
