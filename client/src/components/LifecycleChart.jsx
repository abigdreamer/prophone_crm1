import { useState, useEffect } from "react";
import { Activity, XCircle, RotateCcw } from "lucide-react";
import Card from "./ui/Card";
import { Pill, StagePill } from "./ui/Pill";
import Avatar from "./ui/Avatar";
import Btn from "./ui/Btn";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import USERS_DB from "../data/users";
import { STAGE_DEF, LOST_STAGES } from "../data/stages";
import { ACT_DEF, ACT_CATS } from "../data/activities";
import fmt from "../utils/format";
import { Spinner } from "./ui/Loader";

const PIPELINE = ["new", "contacted", "engaged", "demo_scheduled", "demo_done", "proposal_sent", "negotiating", "customer"];

function ScoreRing({ score = 0 }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="44" height="44" style={{ display: "block", margin: "0 auto 2px" }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 22 22)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
}

function fmtActivityDate(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd2 = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd2}/${yy} ${day} ${h}:${m}`;
}

export default function LifecycleChart({ contact, onLogActivity, onCancelContact, onRestoreContact, currentUser }) {
  const T = useTheme();
  const toast = useAppToast();
  const [filter, setFilter] = useState("all");
  const [logOpen, setLogOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTouched, setCancelTouched] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreSaving, setRestoreSaving] = useState(false);
  const [actType, setActType] = useState("call_made");
  const [actNote, setActNote] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [hoveredActId, setHoveredActId] = useState(null);

  useEffect(() => {
    setLogOpen(false);
    setCancelOpen(false);
    setCancelReason("");
    setCancelTouched(false);
    setRestoreOpen(false);
    setActNote("");
  }, [contact?.id]);

  useEffect(() => {
    if (!logOpen && !cancelOpen && !restoreOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setLogOpen(false);
        setCancelOpen(false);
        setRestoreOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [logOpen, cancelOpen, restoreOpen]);

  async function handleRestoreConfirm() {
    setRestoreSaving(true);
    try {
      await onRestoreContact?.();
      setRestoreOpen(false);
    } catch (err) {
      toast.error(err?.message || "Failed to restore contact.");
    } finally {
      setRestoreSaving(false);
    }
  }

  async function handleCancelConfirm() {
    setCancelTouched(true);
    if (!cancelReason.trim()) return;
    setCancelSaving(true);
    try {
      await onCancelContact?.(cancelReason.trim());
      setCancelOpen(false);
      setCancelReason("");
      setCancelTouched(false);
    } catch (err) {
      toast.error(err?.message || "Failed to cancel contact.");
    } finally {
      setCancelSaving(false);
    }
  }

  if (!contact) return null;

  const d = STAGE_DEF[contact.lifecycleStage] || STAGE_DEF.new;
  const acts = contact.activities || [];
  const addedByUser = USERS_DB.find(u => u.name === contact.addedBy) || USERS_DB[0];

  const personName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  const avatarText = personName
    ? ((contact.firstName?.[0] || "") + (contact.lastName?.[0] || "")).toUpperCase()
    : (contact.company?.[0] || contact.email?.[0] || "?").toUpperCase();
  const displayName = personName || contact.email || "Unknown Contact";

  const btnSm = { fontSize: 10, padding: "5px 8px", display: "flex", alignItems: "center", gap: 4 };

  const filtered = filter === "all" ? acts : acts.filter(a => ACT_DEF[a.type]?.cat === filter);
  const byDay = {};
  filtered.forEach(a => {
    const day = new Date(a.ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  });

  const inputStyle = {
    width: "100%", background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "7px 10px", color: T.text, fontSize: 11,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const taStyle = {
    ...inputStyle, resize: "vertical", minHeight: 72, marginTop: 6,
  };

  async function handleLogSave() {
    if (!actNote.trim()) { toast.warning("Please add a note."); return; }
    setLogSaving(true);
    try {
      await onLogActivity({
        id: "a" + Date.now(), type: actType, note: actNote,
        ts: new Date().toISOString(), by: currentUser?.name || "Unknown",
      });
      setLogOpen(false);
      setActNote("");
      toast.success("Activity logged.");
    } catch (err) {
      toast.error(err?.message || "Failed to log activity.");
    } finally {
      setLogSaving(false);
    }
  }


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

        {/* ── Contact header card ────────────────────────────────────────── */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
          {/* Color accent top stripe */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${d.color}, ${d.color}44, transparent)` }} />

          <div style={{ padding: "12px 14px 10px" }}>
            {/* Avatar + name row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: d.color + "1a", border: "2px solid " + d.color + "55",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: d.color, letterSpacing: "-0.03em",
                boxShadow: `0 0 12px ${d.color}22`,
              }}>
                {avatarText}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, marginBottom: 2 }}>
                  {displayName}
                </div>
                {(contact.title || contact.company) && (
                  <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[contact.title, contact.company].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              {contact.trucks > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, background: T.orange + "15", border: "1px solid " + T.orange + "35", borderRadius: 6, padding: "3px 7px", flexShrink: 0 }}>
                  🚛 {contact.trucks}
                </div>
              )}
            </div>

            {/* Contact info — each line truncates cleanly */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
              {contact.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>✉</span>
                  <span style={{ fontSize: 10, color: T.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>📞</span>
                  <span style={{ fontSize: 10, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {contact.phone.split(/[|,]/).map(s => s.trim()).filter(Boolean)[0]}
                    {contact.phone.split(/[|,]/).length > 1 && <span style={{ color: T.muted }}> +{contact.phone.split(/[|,]/).length - 1} more</span>}
                  </span>
                </div>
              )}
              {contact.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>📍</span>
                  <span style={{ fontSize: 10, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.address}</span>
                </div>
              )}
              {contact.website && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 11, flexShrink: 0 }}>🌐</span>
                  <span style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.website.replace(/^https?:\/\//, "")}</span>
                </div>
              )}
            </div>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 9, padding: "8px 6px", textAlign: "center" }}>
                <ScoreRing score={contact.leadScore ?? 0} />
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>Score</div>
              </div>
              <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 9, padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.green, lineHeight: 1, marginBottom: 5 }}>
                  {contact.contractValue ? (contact.contractValue >= 1000 ? "$" + (contact.contractValue / 1000).toFixed(1) + "k" : "$" + contact.contractValue) : "—"}
                </div>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>Value</div>
              </div>
              <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 9, padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, lineHeight: 1, marginBottom: 5 }}>
                  {fmt.ago(contact.lastActivityAt)}
                </div>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>Activity</div>
              </div>
            </div>
          </div>

          {/* Footer: added by + status */}
          <div style={{ padding: "7px 14px", borderTop: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 6 }}>
            <Avatar user={addedByUser} size={16} />
            <span style={{ fontSize: 9, color: T.muted }}>Added by {contact.addedBy}</span>
            <div style={{ flex: 1 }} />
            {contact.isCanceled && (
              <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: T.red + "18", border: "1px solid " + T.red + "30", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>CANCELED</span>
            )}
          </div>
        </div>

        {/* Stats mini-cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, padding: "0 0 12px" }}>
          {/* Lead Score — uses the ScoreRing already defined in the file */}
          <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <ScoreRing score={contact.leadScore ?? 0} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Lead Score</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", lineHeight: 1.1 }}>{contact.leadScore ?? 0}</div>
            </div>
          </div>
          {/* Contract Value */}
          <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Contract Value</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: contact.contractValue > 0 ? T.green : T.muted }}>
              {contact.contractValue > 0 ? "$" + (contact.contractValue >= 1000 ? (contact.contractValue / 1000).toFixed(1) + "k" : contact.contractValue) : "—"}
            </div>
          </div>
          {/* Fleet Size */}
          <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Fleet Size</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: (contact.trucks ?? 0) > 0 ? T.orange : T.muted }}>
              {(contact.trucks ?? 0) > 0 ? contact.trucks : "—"}
              {(contact.trucks ?? 0) > 0 && <span style={{ fontSize: 10, color: T.muted, marginLeft: 4 }}>trucks</span>}
            </div>
          </div>
          {/* Account Size */}
          <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Account Size</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: contact.accountSize ? T.blue : T.muted }}>
              {contact.accountSize || "—"}
            </div>
          </div>
        </div>

        {/* ── Stage pipeline ─────────────────────────────────────────────── */}
        {(() => {
          const isLost = LOST_STAGES.includes(contact.lifecycleStage);
          const pipeIdx = PIPELINE.indexOf(contact.lifecycleStage);
          const progress = pipeIdx >= 0 ? (pipeIdx / (PIPELINE.length - 1)) * 100 : 0;
          return (
            <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {isLost ? "Stage" : "Stage Journey"}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: d.color, background: d.color + "18", border: "1px solid " + d.color + "35", borderRadius: 5, padding: "2px 9px" }}>
                  {d.label}
                </div>
              </div>
              {isLost ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, boxShadow: `0 0 8px ${d.color}88` }} />
                  <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2 }}>
                    <div style={{ width: "100%", height: "100%", background: d.color, borderRadius: 2, opacity: 0.5 }} />
                  </div>
                </div>
              ) : (
                <>
                  {/* Progress bar track */}
                  <div style={{ position: "relative", height: 4, background: T.border, borderRadius: 2, marginBottom: 12 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: progress + "%", background: d.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    {/* Glowing thumb */}
                    <div style={{
                      position: "absolute", top: "50%", left: progress + "%",
                      transform: "translate(-50%, -50%)",
                      width: 10, height: 10, borderRadius: "50%",
                      background: d.color, border: "2px solid " + T.bg,
                      boxShadow: `0 0 8px ${d.color}88`,
                    }} />
                  </div>
                  {/* Stage dots row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    {PIPELINE.map((stage, i) => {
                      const sd = STAGE_DEF[stage];
                      const isActive = stage === contact.lifecycleStage;
                      const isPast = i < pipeIdx;
                      return (
                        <div key={stage} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
                          <div style={{
                            width: isActive ? 10 : 7, height: isActive ? 10 : 7, borderRadius: "50%",
                            background: isActive ? sd.color : isPast ? sd.color + "88" : T.border,
                            border: isActive ? "2px solid " + T.bg : "none",
                            boxShadow: isActive ? `0 0 7px ${sd.color}99` : "none",
                            transition: "all 0.3s",
                          }} />
                          {isActive && (
                            <div style={{ fontSize: 8, fontWeight: 700, color: sd.color, whiteSpace: "nowrap", lineHeight: 1 }}>
                              {sd.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        {contact.isCanceled ? (
          <div style={{ marginBottom: 14 }}>
            {!restoreOpen ? (
              <Btn onClick={() => setRestoreOpen(true)} variant="secondary" style={{ width: "100%", ...btnSm, justifyContent: "center", borderColor: T.green, color: T.green }}>
                <RotateCcw size={11} /> Restore Contact
              </Btn>
            ) : (
              <div style={{ background: T.green + "08", border: "1px solid " + T.green + "30", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 6 }}>Restore Contact</div>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 12, lineHeight: 1.5 }}>
                  This contact will be moved back to the <strong style={{ color: T.text }}>active list</strong> and their previous stage will be restored.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn
                    onClick={handleRestoreConfirm}
                    disabled={restoreSaving}
                    style={{ flex: 1, ...btnSm, justifyContent: "center", background: T.green, borderColor: T.green, color: "#fff" }}
                  >
                    {restoreSaving ? <><Spinner size={12} color="#fff" /> Restoring…</> : <><RotateCcw size={11} /> Confirm Restore</>}
                  </Btn>
                  <Btn variant="ghost" onClick={() => setRestoreOpen(false)} disabled={restoreSaving} style={btnSm}>
                    Keep Canceled
                  </Btn>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!logOpen && !cancelOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                <Btn onClick={() => setLogOpen(true)} style={{ ...btnSm, justifyContent: "center" }}>
                  <Activity size={11} /> Log Activity
                </Btn>
                <Btn onClick={() => setCancelOpen(true)} variant="secondary" style={{ ...btnSm, justifyContent: "center", borderColor: T.red, color: T.red }}>
                  <XCircle size={11} /> Cancel Contact
                </Btn>
              </div>
            )}

            {cancelOpen && (
              <div style={{ background: T.red + "08", border: "1px solid " + T.red + "30", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 6 }}>Cancel Contact</div>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 10, lineHeight: 1.5 }}>
                  This contact will be removed from the active list. You can restore them at any time from the <strong style={{ color: T.text }}>Canceled</strong> view.
                </div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                  Reason <span style={{ color: T.red }}>*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => { setCancelReason(e.target.value); setCancelTouched(true); }}
                  placeholder="e.g. Lost interest, competitor chosen…"
                  style={{
                    ...taStyle, minHeight: 60,
                    border: "1px solid " + (cancelTouched && !cancelReason.trim() ? T.red : T.border),
                  }}
                  onFocus={e => (e.target.style.borderColor = cancelTouched && !cancelReason.trim() ? T.red : T.accent)}
                  onBlur={e => (e.target.style.borderColor = cancelTouched && !cancelReason.trim() ? T.red : T.border)}
                />
                {cancelTouched && !cancelReason.trim() && (
                  <div style={{ fontSize: 10, color: T.red, marginTop: 3 }}>A reason is required.</div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Btn
                    onClick={handleCancelConfirm}
                    disabled={cancelSaving}
                    style={{ flex: 1, ...btnSm, justifyContent: "center", background: T.red, borderColor: T.red, color: "#fff" }}
                  >
                    {cancelSaving ? <><Spinner size={12} color="#fff" /> Canceling…</> : "Confirm Cancel"}
                  </Btn>
                  <Btn variant="ghost" onClick={() => { setCancelOpen(false); setCancelReason(""); setCancelTouched(false); }} disabled={cancelSaving} style={btnSm}>
                    Keep Active
                  </Btn>
                </div>
              </div>
            )}

            {logOpen && (
              <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10 }}>Log Activity</div>
                <select
                  value={actType}
                  onChange={e => setActType(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                >
                  {Object.entries(ACT_DEF).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                <textarea
                  value={actNote}
                  onChange={e => setActNote(e.target.value)}
                  placeholder="Describe what happened…"
                  style={taStyle}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Btn onClick={handleLogSave} disabled={logSaving} style={{ flex: 1, ...btnSm, justifyContent: "center" }}>
                    {logSaving ? <><Spinner size={12} color="#fff" /> Logging…</> : "Log Activity"}
                  </Btn>
                  <Btn variant="ghost" onClick={() => { setLogOpen(false); setActNote(""); }} disabled={logSaving} style={btnSm}>
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Activity stats ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
          {[
            ["Emails", acts.filter(a => ACT_DEF[a.type]?.cat === "email").length, T.blue],
            ["Calls", acts.filter(a => ACT_DEF[a.type]?.cat === "call").length, T.green],
            ["Ads", acts.filter(a => ACT_DEF[a.type]?.cat === "ad").length, T.purple],
            ["Meetings", acts.filter(a => ACT_DEF[a.type]?.cat === "meeting").length, T.amber],
            ["Total", acts.length, T.accent],
            ["Last", fmt.ago(contact.lastActivityAt), T.orange],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 5, padding: "7px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Timeline</div>
          <div style={{ flex: 1 }} />
          {ACT_CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: "2px 7px", fontSize: 9, borderRadius: 4, cursor: "pointer",
                background: filter === cat ? T.accent + "20" : "transparent",
                border: "1px solid " + (filter === cat ? T.accent : T.border),
                color: filter === cat ? T.accent : T.muted,
                fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {Object.entries(byDay).reverse().map(([day, dayActs]) => (
          <div key={day} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{day}</div>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <div style={{ fontSize: 9, color: T.muted }}>{dayActs.length} events</div>
            </div>
            <div style={{ paddingLeft: 14, borderLeft: "2px solid " + T.border }}>
              {dayActs.map(act => {
                const def = ACT_DEF[act.type] || { label: act.type.replace(/_/g, " "), icon: "·", color: T.muted, cat: "system" };
                const byUser = USERS_DB.find(u => u.name === act.by);
                const hovered = hoveredActId === act.id;
                return (
                  <div
                    key={act.id}
                    style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 6, marginBottom: 2, background: hovered ? T.surface : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={() => setHoveredActId(act.id)}
                    onMouseLeave={() => setHoveredActId(null)}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: def.color + "18", border: "1px solid " + def.color + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: def.color, marginTop: 1 }}>
                      {def.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{def.label}</span>
                        <Pill color={def.color} small>{def.cat}</Pill>
                        {act.points > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: T.amber, background: T.amber + "1a", border: "1px solid " + T.amber + "40", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em", flexShrink: 0 }}>
                            +{act.points} pts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{act.note}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        {byUser && <Avatar user={byUser} size={14} />}
                        <span style={{ fontSize: 9, color: T.muted }}>
                          by {act.by || "System"} · {hovered ? fmtActivityDate(act.ts) : new Date(act.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 12 }}>
            No {filter} activities yet.
          </div>
        )}

      </div>
    </div>
  );
}
