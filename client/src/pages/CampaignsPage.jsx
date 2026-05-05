import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Megaphone, Plus, RefreshCw, Mail, Users, MousePointerClick,
  AlertCircle, Send, ChevronRight, Trash2, MoreVertical, FlaskConical,
  CheckCircle2, Clock, Loader2,
} from "lucide-react";
import T from "../theme";
import {
  getCampaigns, createCampaign, deleteCampaign,
  getPublishedTemplates, getActivePool,
} from "../services/api";
import { getClients } from "../services/api";

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
      borderRadius: 4, padding: "2px 7px",
    }}>{label}</span>
  );
}

// ── Metric pill ───────────────────────────────────────────────────────────────
function Metric({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon size={11} color={color || T.muted} />
        <span style={{ fontSize: 10, color: T.muted }}>{label}</span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: color || T.text }}>{value}</span>
    </div>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onOpen, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sentPct = campaign.recipientsCount
    ? Math.round((campaign.sentCount / campaign.recipientsCount) * 100)
    : 0;
  const openRate = campaign.sentCount
    ? +(campaign.openedCount / campaign.sentCount * 100).toFixed(1)
    : 0;
  const clickRate = campaign.sentCount
    ? +(campaign.clickedCount / campaign.sentCount * 100).toFixed(1)
    : 0;

  return (
    <div
      onClick={() => onOpen(campaign)}
      style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
        padding: "16px 18px", cursor: "pointer", position: "relative",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.accent + "60"}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {campaign.name}
            </span>
            <StatusBadge status={campaign.status} />
            {campaign.type === "ab_test" && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: T.purple,
                background: T.purple + "18", border: "1px solid " + T.purple + "40",
                borderRadius: 4, padding: "2px 7px",
              }}>A/B</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: T.muted }}>
            {campaign.template?.name || "No template"}
            {campaign.createdAt && ` · ${new Date(campaign.createdAt).toLocaleDateString()}`}
          </span>
        </div>

        {/* 3-dot menu */}
        <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4, borderRadius: 4 }}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", top: "100%", right: 0, zIndex: 200,
              background: T.card, border: "1px solid " + T.border, borderRadius: 8,
              minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", overflow: "hidden",
            }}>
              <button
                onClick={() => { setMenuOpen(false); onDelete(campaign); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", background: "none", border: "none",
                  color: T.red, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recipients progress bar */}
      {campaign.recipientsCount > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.muted }}>
              {campaign.recipientsCount} recipient{campaign.recipientsCount !== 1 ? "s" : ""}
            </span>
            {campaign.status === "sent" && (
              <span style={{ fontSize: 10, color: T.green }}>{sentPct}% sent</span>
            )}
          </div>
          <div style={{ height: 3, background: T.border, borderRadius: 2 }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: campaign.status === "sent" ? T.green : T.accent,
              width: campaign.status === "sent" ? sentPct + "%" : "100%",
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", borderTop: "1px solid " + T.border, paddingTop: 12, marginTop: 4 }}>
        <Metric icon={Send}              label="Sent"    value={campaign.sentCount}    color={T.blue}   />
        <Metric icon={Mail}              label="Opened"  value={campaign.openedCount}  color={T.green}  />
        <Metric icon={MousePointerClick} label="Clicked" value={campaign.clickedCount} color={T.accent} />
        <Metric icon={AlertCircle}       label="Bounced" value={campaign.bouncedCount} color={T.red}    />
        {campaign.status === "sent" && campaign.sentCount > 0 && (
          <>
            <div style={{ width: 1, background: T.border }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, color: T.muted }}>Open rate</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{openRate}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, color: T.muted }}>Click rate</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{clickRate}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Wizard: Step 1 ────────────────────────────────────────────────────────────
function WizardStep1({ form, setForm, clients, onNext, onClose }) {
  const nameOk = form.name.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
        borderBottom: "1px solid " + T.border,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: T.accent, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
        }}>1</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Campaign info</div>
        </div>
        <div style={{ flex: 1, height: 1, background: T.border, margin: "0 4px" }} />
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.muted }}>2</div>
        <div style={{ fontSize: 13, color: T.muted }}>Template &amp; content</div>
      </div>

      <div style={{ padding: "24px 24px 0" }}>
        {/* Campaign type */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Campaign type</div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden",
          }}>
            {[
              { id: "regular",  label: "Regular",    icon: Mail },
              { id: "ab_test",  label: "A/B Test",   icon: FlaskConical },
            ].map(({ id, label, icon: Icon }) => {
              const active = form.type === id;
              return (
                <button
                  key={id}
                  onClick={() => setForm(f => ({ ...f, type: id }))}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "12px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: active ? T.accent + "18" : T.surface,
                    color: active ? T.accent : T.muted,
                    fontWeight: active ? 700 : 400, fontSize: 13,
                    borderRight: id === "regular" ? "1px solid " + T.border : "none",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
          {form.type === "ab_test" && (
            <div style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 7,
              background: T.purple + "14", border: "1px solid " + T.purple + "30",
              borderRadius: 6, padding: "8px 12px",
            }}>
              <FlaskConical size={13} color={T.purple} />
              <span style={{ fontSize: 11, color: T.purple }}>Recipients will be split 50/50 between Variant A and Variant B.</span>
            </div>
          )}
        </div>

        {/* Account / client selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Account <span style={{ color: T.accent }}>*</span>
          </div>
          <select
            value={form.clientId}
            onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 7,
              background: T.surface, border: "1px solid " + T.border,
              color: form.clientId ? T.text : T.muted, fontSize: 13,
              fontFamily: "inherit", outline: "none", cursor: "pointer",
            }}
          >
            <option value="" disabled>Select account...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Campaign name */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Campaign name <span style={{ color: T.accent }}>*</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Q2 Towing Outreach"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && nameOk && form.clientId && onNext()}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 7, boxSizing: "border-box",
              background: T.surface, border: "1px solid " + T.border,
              color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
            autoFocus
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px", borderTop: "1px solid " + T.border,
      }}>
        <button
          onClick={onClose}
          style={{
            padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >Cancel</button>
        <button
          onClick={onNext}
          disabled={!nameOk || !form.clientId}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 20px", borderRadius: 7, border: "none",
            background: nameOk && form.clientId ? T.accent : T.border,
            color: nameOk && form.clientId ? "#fff" : T.muted,
            fontSize: 13, fontWeight: 600, cursor: nameOk && form.clientId ? "pointer" : "default", fontFamily: "inherit",
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Wizard: Step 2 (template selection) ──────────────────────────────────────
function WizardStep2({ form, setForm, templates, saving, onBack, onCreate }) {
  const [loadingTpls, setLoadingTpls] = useState(false);
  const [tpls, setTpls] = useState(templates);

  useEffect(() => {
    if (templates.length) { setTpls(templates); return; }
    setLoadingTpls(true);
    getPublishedTemplates()
      .then(setTpls)
      .catch(() => {})
      .finally(() => setLoadingTpls(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
        borderBottom: "1px solid " + T.border,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: T.border,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: T.muted,
        }}>1</div>
        <div style={{ fontSize: 13, color: T.muted }}>Campaign info</div>
        <div style={{ flex: 1, height: 1, background: T.border, margin: "0 4px" }} />
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: T.accent, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
        }}>2</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Template &amp; content</div>
        </div>
      </div>

      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Select a published template
        </div>

        {loadingTpls ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 20, color: T.muted, fontSize: 12 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading templates…
          </div>
        ) : tpls.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center", background: T.surface,
            border: "1px solid " + T.border, borderRadius: 8,
          }}>
            <Mail size={28} color={T.muted} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: T.muted }}>No published templates found.</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
              Go to Templates and publish one first.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {tpls.map(t => {
              const selected = form.templateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, templateId: t.id }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: "1px solid " + (selected ? T.accent : T.border),
                    background: selected ? T.accent + "10" : T.surface,
                    transition: "border-color 0.12s",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, background: T.accent + "20",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Mail size={15} color={T.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.subject || "No subject"}
                    </div>
                  </div>
                  {selected && <CheckCircle2 size={16} color={T.accent} />}
                </div>
              );
            })}
          </div>
        )}

        {/* A/B test: if ab_test allow selecting variant B template */}
        {form.type === "ab_test" && form.templateId && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.purple, marginBottom: 8 }}>
              Variant B template (optional)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
              <div
                onClick={() => setForm(f => ({ ...f, templateIdB: null }))}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 7, cursor: "pointer",
                  border: "1px solid " + (!form.templateIdB ? T.purple : T.border),
                  background: !form.templateIdB ? T.purple + "10" : T.surface,
                  fontSize: 12, color: T.muted,
                }}
              >
                Same as Variant A
              </div>
              {tpls.filter(t => t.id !== form.templateId).map(t => {
                const sel = form.templateIdB === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, templateIdB: t.id }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      borderRadius: 7, cursor: "pointer",
                      border: "1px solid " + (sel ? T.purple : T.border),
                      background: sel ? T.purple + "10" : T.surface,
                      fontSize: 12, color: T.text,
                    }}
                  >
                    {t.name}
                    {sel && <CheckCircle2 size={14} color={T.purple} style={{ marginLeft: "auto" }} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px", borderTop: "1px solid " + T.border, marginTop: 20,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >← Back</button>
        <button
          onClick={onCreate}
          disabled={!form.templateId || saving}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 20px", borderRadius: 7, border: "none",
            background: form.templateId && !saving ? T.accent : T.border,
            color: form.templateId && !saving ? "#fff" : T.muted,
            fontSize: 13, fontWeight: 600,
            cursor: form.templateId && !saving ? "pointer" : "default",
            fontFamily: "inherit",
          }}
        >
          {saving
            ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Creating…</>
            : <><Plus size={13} /> Create Campaign</>
          }
        </button>
      </div>
    </div>
  );
}

// ── New campaign wizard modal ─────────────────────────────────────────────────
function NewCampaignModal({ clients, onClose, onCreated }) {
  const { clientId: poolClientId } = getActivePool();
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    type:        "regular",
    clientId:    poolClientId || "",
    name:        "",
    templateId:  null,
    templateIdB: null,
  });

  // Pre-fetch templates when user moves to step 2
  const goStep2 = useCallback(() => {
    setStep(2);
    getPublishedTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      const campaign = await createCampaign({
        name:        form.name.trim(),
        type:        form.type,
        clientId:    form.clientId,
        templateId:  form.templateId,
        templateIdB: form.templateIdB || null,
      });
      onCreated(campaign);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [form, onCreated]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card, border: "1px solid " + T.border, borderRadius: 14,
          width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px 14px",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Create an email campaign</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {step === 1 ? (
          <WizardStep1
            form={form} setForm={setForm} clients={clients}
            onNext={goStep2} onClose={onClose}
          />
        ) : (
          <WizardStep2
            form={form} setForm={setForm} templates={templates}
            saving={saving} onBack={() => setStep(1)} onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ campaign, onClose, onConfirm, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete campaign?</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
          "<strong style={{ color: T.text }}>{campaign.name}</strong>" will be permanently deleted.
          This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 7, border: "none",
            background: T.red, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: loading ? "default" : "pointer", fontFamily: "inherit",
          }}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const navigate    = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [toDelete,  setToDelete]  = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, cl] = await Promise.all([getCampaigns(), getClients()]);
      setCampaigns(Array.isArray(c) ? c : []);
      setClients(Array.isArray(cl) ? cl : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = useCallback((campaign) => {
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
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }, [toDelete]);

  const running   = campaigns.filter(c => c.status === "sending").length;
  const completed = campaigns.filter(c => c.status === "sent").length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Email Campaigns
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            {" · "}{running} running
            {" · "}{completed} completed
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 7, border: "1px solid " + T.border,
              background: T.surface, color: T.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 7, border: "none",
              background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13, padding: 40 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 20px",
          background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        }}>
          <Megaphone size={44} color={T.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
            Create your first campaign to start reaching out to contacts.
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onOpen={() => navigate("/campaigns/" + c.id)}
              onDelete={setToDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewCampaignModal
          clients={clients}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
      {toDelete && (
        <DeleteModal
          campaign={toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
