import { useState, useEffect } from "react";
import { StagePill, Pill } from "./ui/Pill";
import Btn from "./ui/Btn";
import LogActivityModal from "./modals/LogActivityModal";
import StageModal from "./modals/StageModal";
import ContactModal from "./modals/ContactModal";
import CancelModal from "./modals/CancelModal";
import { RestoreModal } from "./modals/RestoreModal";
import { useTheme } from "../context/ThemeContext";
import { STAGE_DEF } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";
import { useAppToast } from "../context/ToastContext";
import { SkeletonActivityRow } from "./ui/Loader";

const DESC_LIMIT = 260;

const ACTION_CFG = {
  CREATE:  { label: "Created",  color: "#22c55e", icon: "✦" },
  UPDATE:  { label: "Updated",  color: "#6366f1", icon: "✎" },
  CANCEL:  { label: "Canceled", color: "#ef4444", icon: "✕" },
  RESTORE: { label: "Restored", color: "#22c55e", icon: "↩" },
};

const SOCIAL_META = {
  facebook:  { label: "Facebook",   color: "#1877f2" },
  instagram: { label: "Instagram",  color: "#e1306c" },
  linkedin:  { label: "LinkedIn",   color: "#0a66c2" },
  twitter:   { label: "Twitter / X", color: "#1da1f2" },
  youtube:   { label: "YouTube",    color: "#ff0000" },
  yelp:      { label: "Yelp",       color: "#d32323" },
  pinterest: { label: "Pinterest",  color: "#e60023" },
  tiktok:    { label: "TikTok",     color: "#010101" },
};

const DEFAULT_FIELD_SETTINGS = {
  email: true, phone: true, website: true, address: true, city: true,
  description: true,
  company: true, title: true, accountSize: true, source: true, campaign: true,
  notes: true, tags: true, trucks: true, contractValue: true, leadScore: true,
  social_facebook: true, social_instagram: true, social_linkedin: true,
  social_twitter: true, social_youtube: true, social_yelp: true,
  social_pinterest: true, social_tiktok: true,
};

export default function ContactDetailPanel({ contact, onUpdate, currentUser }) {
  const T = useTheme();
  const [modal,          setModal]          = useState(null);
  const [auditLog,       setAuditLog]       = useState([]);
  const [auditLoading,   setAuditLoading]   = useState(false);
  const [auditOpen,      setAuditOpen]      = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [fieldVis,       setFieldVis]       = useState(DEFAULT_FIELD_SETTINGS);
  const [descExpanded,   setDescExpanded]   = useState(false);
  const toast = useAppToast();

  useEffect(() => {
    if (!contact?.id) return;
    setAuditLog([]);
    setDescExpanded(false);
    setAuditLoading(true);
    db.getContactClientActivities(contact.id)
      .then(setAuditLog)
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  }, [contact?.id]);

  useEffect(() => {
    db.getSettings(contact?.clientId || null, 'contact_fields')
      .then(res => {
        if (res?.config && Object.keys(res.config).length > 0) {
          setFieldVis({ ...DEFAULT_FIELD_SETTINGS, ...res.config });
        }
      })
      .catch(() => {});
  }, [contact?.clientId]);

  if (!contact) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: T.muted, fontSize: 13 }}>
      Select a contact from the list to view details
    </div>
  );

  const d    = STAGE_DEF[contact.lifecycleStage] || STAGE_DEF.new;
  const tags = parseTags(contact.tags);
  const socialLinks = contact.socialLinks || {};
  const enabledSocials = Object.entries(SOCIAL_META).filter(
    ([k]) => fieldVis[`social_${k}`] !== false
  );

  const show = (key) => fieldVis[key] !== false;

  async function handleLogActivity(act) {
    try {
      await db.addActivity(contact.id, act);
      const refreshed = await db.getContact(contact.id);
      onUpdate(refreshed);
      setModal(null);
      toast.success("Activity logged.");
    } catch {
      toast.error("Failed to log activity.");
    }
  }

  async function handleStageChange(updated) {
    try {
      await db.updateContact(updated.id, updated);
      const refreshed = await db.getContact(updated.id);
      onUpdate(refreshed);
      setModal(null);
      toast.success("Stage updated.");
    } catch {
      toast.error("Failed to update stage.");
    }
  }

  async function handleEdit(updated) {
    try {
      const refreshed = await db.updateContact(updated.id, updated);
      onUpdate(refreshed);
      setModal(null);
      toast.success("Contact saved.");
    } catch (err) {
      toast.error(err.message || "Failed to update contact.");
    }
  }

  async function handleCancel(reason) {
    const refreshed = await db.cancelContact(contact.id, reason);
    onUpdate(refreshed);
    setModal(null);
    toast.success("Contact canceled.");
  }

  async function handleRestoreConfirm() {
    setRestoreLoading(true);
    try {
      const refreshed = await db.restoreContact(contact.id);
      onUpdate(refreshed);
      setModal(null);
      toast.success("Contact restored.");
    } catch {
      toast.error("Failed to restore contact.");
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>

      {modal === "log" && (
        <LogActivityModal contact={contact} onSave={handleLogActivity} onClose={() => setModal(null)} currentUser={currentUser} />
      )}
      {modal === "stage" && (
        <StageModal contact={contact} onSave={handleStageChange} onClose={() => setModal(null)} currentUser={currentUser} />
      )}
      {modal === "edit" && (
        <ContactModal
          contact={contact} onSave={handleEdit} onClose={() => setModal(null)}
          pool={contact.pool} clientId={contact.clientId} currentUser={currentUser}
        />
      )}
      {modal === "cancel" && (
        <CancelModal
          contact={contact}
          onSave={handleCancel}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "restore" && (
        <RestoreModal
          title="Restore Contact"
          message={`Restore ${contact.firstName} ${contact.lastName} back to active contacts?`}
          loading={restoreLoading}
          onRestore={handleRestoreConfirm}
          onClose={() => { if (!restoreLoading) setModal(null); }}
        />
      )}

      {/* Hero header */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 18,
        padding: "20px 22px",
        background: d.color + "0a", border: "1px solid " + d.color + "25",
        borderRadius: 10, marginBottom: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
          background: d.color + "20", border: "2px solid " + d.color + "55",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 800, color: d.color,
        }}>
          {(contact.firstName || "?")[0]}{(contact.lastName || "")[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 5 }}>
            {contact.firstName} {contact.lastName}
          </div>
          {(contact.title || contact.company) && (
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 8 }}>
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <StagePill stage={contact.lifecycleStage} />
            {contact.isCanceled && (
              <Pill color={T.red} small>CANCELED</Pill>
            )}
            {show("trucks") && contact.trucks > 0 && <Pill color={T.orange} small>🚛 {contact.trucks} trucks</Pill>}
            {contact.address && <span style={{ fontSize: 11, color: T.muted }}>📍 {contact.address}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {!contact.isCanceled && (
            <>
              <Btn onClick={() => setModal("log")} style={{ fontSize: 11, padding: "7px 14px" }}>
                + Log Activity
              </Btn>
              <Btn onClick={() => setModal("stage")} variant="secondary" style={{ fontSize: 11, padding: "7px 14px" }}>
                ⇢ Stage
              </Btn>
              <Btn onClick={() => setModal("edit")} variant="secondary" style={{ fontSize: 11, padding: "7px 14px" }}>
                ✎ Edit
              </Btn>
              <Btn onClick={() => setModal("cancel")} variant="secondary" style={{ fontSize: 11, padding: "7px 14px", borderColor: T.red, color: T.red }}>
                ✕ Cancel
              </Btn>
            </>
          )}
          {contact.isCanceled && (
            <Btn onClick={() => setModal("restore")} variant="secondary" style={{ fontSize: 11, padding: "7px 14px", borderColor: T.green, color: T.green }}>
              ↩ Restore
            </Btn>
          )}
        </div>
      </div>

      {/* Metrics strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {show("leadScore") && (
          <MetricCard label="Lead Score" color={T.amber}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: T.amber, lineHeight: 1 }}>
                {contact.leadScore}
              </span>
              <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${contact.leadScore}%`, height: "100%", background: T.amber, borderRadius: 3 }} />
              </div>
            </div>
          </MetricCard>
        )}
        {show("contractValue") && (
          <MetricCard label="Contract Value" color={T.green}>
            <span style={{ fontSize: 22, fontWeight: 800, color: contact.contractValue > 0 ? T.green : T.muted, lineHeight: 1 }}>
              {contact.contractValue > 0 ? "$" + contact.contractValue.toLocaleString() : "—"}
            </span>
          </MetricCard>
        )}
        {show("trucks") && (
          <MetricCard label="Fleet Size" color={T.orange}>
            <span style={{ fontSize: 20, fontWeight: 800, color: contact.trucks > 0 ? T.orange : T.muted, lineHeight: 1 }}>
              {contact.trucks > 0 ? contact.trucks : "—"}
            </span>
            {contact.trucks > 0 && (
              <span style={{ fontSize: 10, color: T.muted, marginLeft: 5 }}>trucks</span>
            )}
          </MetricCard>
        )}
        {show("accountSize") && (
          <MetricCard label="Account Size" color={T.blue}>
            <span style={{ fontSize: 18, fontWeight: 800, color: contact.accountSize ? T.blue : T.muted, lineHeight: 1 }}>
              {contact.accountSize || "—"}
            </span>
          </MetricCard>
        )}
      </div>

      {/* Info sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Section title="Contact Info">
          {show("email")   && <Field label="Email"   value={contact.email}   href={contact.email   ? `mailto:${contact.email}` : null} color={T.accent} />}
          {show("phone")   && <Field label="Phone"   value={contact.phone}   href={contact.phone   ? `tel:${contact.phone}`    : null} color={T.text}   />}
          {show("website") && <Field label="Website" value={contact.website} href={contact.website || null}                            color={T.blue}   />}
          {show("address") && <Field label="Address" value={contact.address} />}
        </Section>

        <Section title="Company & Acquisition">
          {show("company")     && <Field label="Company"      value={contact.company}     />}
          {show("accountSize") && <Field label="Account Size" value={contact.accountSize} />}
          {show("source")      && <Field label="Source"       value={contact.source}      />}
          {show("campaign")    && <Field label="Campaign"     value={contact.campaign}    />}
        </Section>
      </div>

      {/* Description */}
      {show("description") && (
        <Section title="Description" style={{ marginBottom: 12 }}>
          {contact.description ? (() => {
            const isLong = contact.description.length > DESC_LIMIT;
            const visible = isLong && !descExpanded
              ? contact.description.slice(0, DESC_LIMIT).trimEnd()
              : contact.description;
            return (
              <>
                <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {visible}{isLong && !descExpanded ? "…" : ""}
                </div>
                {isLong && (
                  <button
                    onClick={() => setDescExpanded(x => !x)}
                    style={{
                      marginTop: 8, background: "none", border: "none",
                      color: T.accent, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", padding: 0, fontFamily: "inherit",
                    }}
                  >
                    {descExpanded ? "Show Less ▲" : "Load More ▼"}
                  </button>
                )}
              </>
            );
          })() : (
            <span style={{ fontSize: 12, color: T.muted }}>—</span>
          )}
        </Section>
      )}

      {/* Social Links */}
      {enabledSocials.length > 0 && (
        <Section title="Social Media" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {enabledSocials.map(([key, meta]) => {
              const url = socialLinks[key];
              return (
                <div key={key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: "1px solid " + T.border + "55",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: url ? meta.color : T.muted,
                    minWidth: 90, flexShrink: 0,
                  }}>
                    {meta.label}
                  </span>
                  {url ? (
                    <a
                      href={url.startsWith("http") ? url : `https://${url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12, color: meta.color, textDecoration: "none",
                        fontWeight: 500, textAlign: "right",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: 220,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {url}
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: T.muted }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* CRM metadata */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        background: T.card, border: "1px solid " + T.border, borderRadius: 8,
        marginBottom: 12, overflow: "hidden",
      }}>
        {[
          ["Owner",         contact.ownedBy || "—"],
          ["Added By",      contact.addedBy || "—"],
          ["Created",       fmt.date(contact.createdAt)],
          ["Last Activity", fmt.ago(contact.lastActivityAt)],
        ].map(([label, value], i, arr) => (
          <div
            key={label}
            style={{
              padding: "12px 16px",
              borderRight: i < arr.length - 1 ? "1px solid " + T.border : "none",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, color: T.dim, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Cancellation info */}
      {contact.isCanceled && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
          background: T.red + "08", border: "1px solid " + T.red + "30",
          borderRadius: 8, marginBottom: 12, overflow: "hidden",
        }}>
          {[
            ["Canceled By", contact.canceledBy  || "—"],
            ["Canceled At", fmt.date(contact.canceledAt)],
            ["Reason",      contact.cancelReason || "—"],
          ].map(([label, value], i, arr) => (
            <div
              key={label}
              style={{
                padding: "10px 16px",
                borderRight: i < arr.length - 1 ? "1px solid " + T.red + "25" : "none",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: T.red + "aa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {show("notes") && (
        <Section title="Notes" style={{ marginBottom: 12 }}>
          {contact.notes ? (
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {contact.notes}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              No notes yet — use Edit to add notes.
            </div>
          )}
        </Section>
      )}

      {/* Tags */}
      {show("tags") && (
        <Section title="Tags" style={{ marginBottom: 12 }}>
          {tags.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: "4px 11px", borderRadius: 12, fontSize: 11,
                    background: T.accent + "15", color: T.accent,
                    border: "1px solid " + T.accent + "30", fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: T.muted }}>—</span>
          )}
        </Section>
      )}

      {/* Audit Log */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => setAuditOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Audit Log{" "}
            {auditLoading
              ? <span style={{ color: T.muted, fontWeight: 400 }}>…</span>
              : <span style={{ color: T.dim, fontWeight: 500 }}>({auditLog.length})</span>
            }
          </span>
          <span style={{ fontSize: 12, color: T.muted, transform: auditOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
        </button>

        {auditOpen && (
          <div style={{ borderTop: "1px solid " + T.border }}>
            {auditLoading ? (
              <div style={{ padding: "10px 16px" }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonActivityRow key={i} />)}
              </div>
            ) : auditLog.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 12, color: T.muted, fontStyle: "italic" }}>
                No audit events yet.
              </div>
            ) : (
              auditLog.map((entry, i) => {
                const cfg = ACTION_CFG[entry.action] || { label: entry.action, color: T.muted, icon: "·" };
                const meta = entry.metadata || {};
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex", gap: 11, padding: "10px 16px",
                      borderBottom: i < auditLog.length - 1 ? "1px solid " + T.border + "66" : "none",
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: cfg.color + "18", border: "1px solid " + cfg.color + "40",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: cfg.color, marginTop: 1,
                    }}>
                      {cfg.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                          padding: "1px 6px", borderRadius: 4,
                          background: cfg.color + "18", color: cfg.color,
                          border: "1px solid " + cfg.color + "35",
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 10, color: T.muted }}>
                          by {entry.performedBy || "system"} · {fmt.date(entry.ts)}
                        </span>
                      </div>

                      {entry.action === "CREATE" && (
                        <div style={{ fontSize: 11, color: T.dim }}>
                          {meta.name}{meta.company ? ` · ${meta.company}` : ""}
                          {meta.email ? <span style={{ color: T.muted }}> · {meta.email}</span> : null}
                        </div>
                      )}
                      {entry.action === "UPDATE" && meta.changes && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                          {Object.entries(meta.changes).map(([field, { from, to }]) => (
                            <span key={field} style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              background: T.accent + "12", color: T.dim,
                              border: "1px solid " + T.border,
                            }}>
                              {field}: <span style={{ color: T.muted, textDecoration: "line-through" }}>{String(from)}</span>
                              {" → "}
                              <span style={{ color: T.text, fontWeight: 600 }}>{String(to)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.action === "CANCEL" && meta.reason && (
                        <div style={{ fontSize: 11, color: T.dim, fontStyle: "italic" }}>"{meta.reason}"</div>
                      )}
                      {entry.action === "RESTORE" && meta.previousReason && (
                        <div style={{ fontSize: 11, color: T.muted }}>
                          Previously canceled: <span style={{ fontStyle: "italic" }}>"{meta.previousReason}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, style }) {
  const T = useTheme();
  return (
    <div style={{
      background: T.card, border: "1px solid " + T.border,
      borderRadius: 8, overflow: "hidden", ...style,
    }}>
      <div style={{
        padding: "8px 16px", borderBottom: "1px solid " + T.border,
        fontSize: 10, fontWeight: 700, color: T.muted,
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        {title}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, href, color }) {
  const T = useTheme();
  const missing = !value;
  const text = value || "—";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid " + T.border + "55",
    }}>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 500, minWidth: 90, flexShrink: 0 }}>
        {label}
      </span>
      {href && !missing ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          style={{ fontSize: 12, color: color || T.text, textDecoration: "none", fontWeight: 500, textAlign: "right" }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          {text}
        </a>
      ) : (
        <span style={{ fontSize: 12, color: missing ? T.muted : (color || T.text), fontWeight: missing ? 400 : 500, textAlign: "right" }}>
          {text}
        </span>
      )}
    </div>
  );
}

function MetricCard({ label, color, children }) {
  const T = useTheme();
  return (
    <div style={{
      background: T.card, border: "1px solid " + T.border,
      borderRadius: 8, padding: "12px 16px",
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: T.muted,
        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags); } catch { return []; }
}
