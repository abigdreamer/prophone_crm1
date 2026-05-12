import { useState } from "react";
import { Activity, ArrowRight, Pencil, XCircle, RotateCcw } from "lucide-react";
import Card from "./ui/Card";
import { Pill, StagePill } from "./ui/Pill";
import Avatar from "./ui/Avatar";
import Btn from "./ui/Btn";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { STAGE_DEF, LOST_STAGES } from "../data/stages";
import { ACT_DEF, ACT_CATS } from "../data/activities";
import fmt from "../utils/format";

// ─── Right-panel: lead lifecycle + activity timeline ─────────────────────────
export default function LifecycleChart({ contact, onUpdate, onEdit, onAction, currentUser }) {
  const T = useTheme();
  const [filter, setFilter] = useState("all");

  if (!contact) return null;

  const d = STAGE_DEF[contact.lifecycleStage] || STAGE_DEF.new;
  const acts = contact.activities || [];
  const stageOrder = ["new", "contacted", "engaged", "demo_scheduled", "demo_done", "proposal_sent", "negotiating", "customer"];
  const currentIdx = stageOrder.indexOf(contact.lifecycleStage);
  const isCustomer = contact.lifecycleStage === "customer";
  const isLost = LOST_STAGES.includes(contact.lifecycleStage);
  const addedByUser = USERS_DB.find(u => u.name === contact.addedBy) || USERS_DB[0];

  const personName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  const avatarText = personName
    ? ((contact.firstName?.[0] || "") + (contact.lastName?.[0] || "")).toUpperCase()
    : (contact.company?.[0] || contact.email?.[0] || "U").toUpperCase();
  const displayName = personName || contact.company || contact.email || "Unknown Contact";

  const btnSm = { fontSize: 10, padding: "5px 8px", display: "flex", alignItems: "center", gap: 4 };

  const filtered = filter === "all" ? acts : acts.filter(a => ACT_DEF[a.type]?.cat === filter);

  // Group activities by calendar day
  const byDay = {};
  filtered.forEach(a => {
    const day = new Date(a.ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

        {/* Contact header card */}
        <div
          style={{
            padding: "12px 14px",
            background: d.color + "0d", border: "1px solid " + d.color + "28",
            borderRadius: 8, marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: d.color + "22", border: "1.5px solid " + d.color + "50",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: avatarText.length > 1 ? 13 : 16, fontWeight: 800, color: d.color,
                flexShrink: 0, letterSpacing: "-0.03em",
              }}
            >
              {avatarText}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{displayName}</div>
              {(contact.title || contact.company) && (
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                  {[contact.title, contact.company].filter(Boolean).join(" · ")}
                </div>
              )}
              {contact.city && <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>📍 {contact.city}</div>}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <StagePill stage={contact.lifecycleStage} />
              {contact.isCanceled && <Pill color={T.red} small>CANCELED</Pill>}
              {contact.trucks > 0 && <Pill color={T.orange} small>🚛 {contact.trucks}</Pill>}
            </div>
          </div>

          {/* Key details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, marginBottom: 8 }}>
            {[
              ["Email", contact.email, T.accent],
              ["Phone", contact.phone, T.text],
              ["Score", contact.leadScore, T.amber],
              ["Value", contact.contractValue ? "$" + contact.contractValue.toLocaleString() : "—", T.green],
            ].map(([k, v, c]) => (
              <div key={k}>
                <span style={{ color: T.muted }}>{k}: </span>
                <span style={{ color: c, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Avatar user={addedByUser} size={18} />
            <span style={{ fontSize: 9, color: T.muted }}>Added by {contact.addedBy}</span>
          </div>
        </div>

        {/* Action buttons */}
        {contact.isCanceled ? (
          <div style={{ marginBottom: 14 }}>
            <Btn
              onClick={() => onAction?.("restore")}
              variant="secondary"
              style={{ width: "100%", ...btnSm, justifyContent: "center", borderColor: T.green, color: T.green }}
            >
              <RotateCcw size={11} /> Restore Contact
            </Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 14 }}>
            <Btn onClick={() => onAction?.("log")} style={{ ...btnSm, justifyContent: "center" }}>
              <Activity size={11} /> Log Activity
            </Btn>
            <Btn onClick={() => onAction?.("stage")} variant="secondary" style={{ ...btnSm, justifyContent: "center" }}>
              <ArrowRight size={11} /> Stage
            </Btn>
            <Btn onClick={() => onEdit?.(contact)} variant="secondary" style={{ ...btnSm, justifyContent: "center" }}>
              <Pencil size={11} /> Edit
            </Btn>
            <Btn onClick={() => onAction?.("cancel")} variant="secondary" style={{ ...btnSm, justifyContent: "center", borderColor: T.red, color: T.red }}>
              <XCircle size={11} /> Cancel
            </Btn>
          </div>
        )}

        {/* Journey stepper */}
        <Card style={{ padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10 }}>Lead Journey</div>
          <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 6 }}>
            {stageOrder.map((s, i) => {
              const sd = STAGE_DEF[s];
              const done = !isLost && currentIdx >= i;
              const curr = contact.lifecycleStage === s;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: curr ? sd.color : done ? sd.color + "40" : T.border,
                        border: "2px solid " + (curr ? sd.color : done ? sd.color + "80" : T.borderHi),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: curr ? "#fff" : done ? sd.color : T.muted,
                        fontWeight: 700,
                      }}
                    >
                      {done && !curr ? "✓" : i + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 8, color: curr ? sd.color : done ? T.dim : T.muted,
                        fontWeight: curr ? 700 : 400,
                        textAlign: "center", maxWidth: 50, lineHeight: 1.2,
                      }}
                    >
                      {sd.label}
                    </div>
                  </div>
                  {i < stageOrder.length - 1 && (
                    <div
                      style={{
                        width: 16, height: 2,
                        background: done && currentIdx > i ? sd.color + "50" : T.border,
                        marginBottom: 14, flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })}
            {isLost && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                <div
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: T.red + "20", border: "2px solid " + T.red,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: T.red, fontWeight: 700,
                  }}
                >
                  ✕
                </div>
                <div style={{ fontSize: 8, color: T.red, fontWeight: 700 }}>
                  {STAGE_DEF[contact.lifecycleStage]?.label}
                </div>
              </div>
            )}
            {isCustomer && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                <div
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: T.green + "30", border: "2px solid " + T.green,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: T.green, fontWeight: 700,
                  }}
                >
                  ★
                </div>
                <div style={{ fontSize: 8, color: T.green, fontWeight: 700 }}>Customer!</div>
              </div>
            )}
          </div>
        </Card>

        {/* Activity stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
          {[
            ["Emails", acts.filter(a => ACT_DEF[a.type]?.cat === "email").length, T.blue],
            ["Calls", acts.filter(a => ACT_DEF[a.type]?.cat === "call").length, T.green],
            ["Ads", acts.filter(a => ACT_DEF[a.type]?.cat === "ad").length, T.purple],
            ["Meetings", acts.filter(a => ACT_DEF[a.type]?.cat === "meeting").length, T.amber],
            ["Total", acts.length, T.accent],
            ["Last", fmt.ago(contact.lastActivityAt), T.orange],
          ].map(([l, v, c]) => (
            <div
              key={l}
              style={{
                background: T.surface, border: "1px solid " + T.border,
                borderRadius: 5, padding: "7px 8px", textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Timeline header & filters */}
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

        {/* Timeline days */}
        {Object.entries(byDay).reverse().map(([day, dayActs]) => (
          <div key={day} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{day}</div>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <div style={{ fontSize: 9, color: T.muted }}>{dayActs.length} events</div>
            </div>
            <div style={{ paddingLeft: 14, borderLeft: "2px solid " + T.border }}>
              {dayActs.map(act => {
                const def = ACT_DEF[act.type] || { label: act.type, icon: "·", color: T.muted, cat: "system" };
                const byUser = USERS_DB.find(u => u.name === act.by);
                return (
                  <div
                    key={act.id}
                    style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 6, marginBottom: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surface)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: def.color + "18", border: "1px solid " + def.color + "40",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: def.color, marginTop: 1,
                      }}
                    >
                      {def.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{def.label}</span>
                        <Pill color={def.color} small>{def.cat}</Pill>
                        {act.points > 0 && (
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: T.amber,
                            background: T.amber + "1a",
                            border: "1px solid " + T.amber + "40",
                            borderRadius: 4, padding: "1px 5px",
                            letterSpacing: "0.04em", flexShrink: 0,
                          }}>
                            +{act.points} pts
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{act.note}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        {byUser && <Avatar user={byUser} size={14} />}
                        <span style={{ fontSize: 9, color: T.muted }}>
                          by {act.by || "System"} · {new Date(act.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
