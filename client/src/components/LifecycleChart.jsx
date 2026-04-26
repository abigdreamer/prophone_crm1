import { useState } from "react";
import Card from "./ui/Card";
import { Pill, StagePill } from "./ui/Pill";
import Btn from "./ui/Btn";
import LogActivityModal from "./modals/LogActivityModal";
import StageModal from "./modals/StageModal";
import ContactModal from "./modals/ContactModal";
import T from "../theme";
import { STAGE_DEF, LOST_STAGES } from "../data/stages";
import { ACT_DEF, ACT_CATS } from "../data/activities";

const CAT_LABEL = {
  all: "All", email: "Email", call: "Call", sms: "SMS",
  ad: "Ads", meeting: "Meeting", proposal: "Proposal",
  note: "Note", system: "System", inbound: "Inbound",
};
import fmt from "../utils/format";
import { calcLeadScore, scoreMeta } from "../utils/scoring";
import { addActivity, getContact, updateContact } from "../api/contacts.api";
import { useToast } from "../hooks/useToast";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 2) || "?";
}

function ActivityAvatar({ name, size = 14 }) {
  const bg = "#6366f120";
  const color = "#6366f1";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, border: "1px solid " + color + "40",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const meta  = scoreMeta(score);
  const r     = 18;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
        <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={24} cy={24} r={r} fill="none" stroke={T.border} strokeWidth={4} />
          <circle
            cx={24} cy={24} r={r} fill="none"
            stroke={meta.color} strokeWidth={4}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: meta.color,
        }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
        <div style={{ fontSize: 9, color: T.muted }}>Lead Score</div>
      </div>
    </div>
  );
}

// ─── Right-panel: lead lifecycle + activity timeline ─────────────────────────
export default function LifecycleChart({ contact, onUpdate, currentUser }) {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [modal,  setModal]  = useState(null);

  if (!contact) return null;

  const d          = STAGE_DEF[contact.lifecycleStage] || STAGE_DEF.new;
  const acts       = contact.activities || [];
  const stageOrder = ["new","contacted","engaged","proposal_sent","negotiating","customer"];
  const currentIdx = stageOrder.indexOf(contact.lifecycleStage);
  const isCustomer = contact.lifecycleStage === "customer";
  const isLost     = LOST_STAGES.includes(contact.lifecycleStage);

  // Always compute score live from contact data
  const score = calcLeadScore(contact);

  const filtered = filter === "all" ? acts : acts.filter(a => ACT_DEF[a.type]?.cat === filter);

  const byDay = {};
  filtered.forEach(a => {
    const day = new Date(a.ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  });

  // Subtitle: only show non-empty parts
  const subtitle = [contact.title, contact.company].filter(Boolean).join(" · ");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Modals */}
      {modal === "log" && (
        <LogActivityModal
          contact={contact}
          onSave={async act => {
            try {
              await addActivity(contact.id, act);
              const refreshed = await getContact(contact.id);
              onUpdate(refreshed);
              setModal(null);
              toast.success("Activity logged.");
            } catch {
              toast.error("Failed to log activity. Please try again.");
            }
          }}
          onClose={() => setModal(null)}
          currentUser={currentUser}
        />
      )}
      {modal === "stage" && (
        <StageModal
          contact={contact}
          onSave={async updated => {
            try {
              const newAct = updated.activities[updated.activities.length - 1];
              await updateContact(updated.id, updated);
              await addActivity(updated.id, newAct);
              const refreshed = await getContact(updated.id);
              onUpdate(refreshed);
              setModal(null);
              toast.success("Stage updated.");
            } catch {
              toast.error("Failed to update stage. Please try again.");
            }
          }}
          onClose={() => setModal(null)}
          currentUser={currentUser}
        />
      )}
      {modal === "edit" && (
        <ContactModal
          contact={contact}
          onSave={async updated => {
            try {
              const refreshed = await updateContact(updated.id, updated);
              onUpdate(refreshed);
              setModal(null);
              toast.success("Contact updated.");
            } catch {
              toast.error("Failed to update contact. Please try again.");
            }
          }}
          onClose={() => setModal(null)}
          pool={contact.pool}
          clientId={contact.clientId}
          currentUser={currentUser}
        />
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

        {/* ── Contact header ──────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 16px",
          background: d.color + "0d", border: "1px solid " + d.color + "28",
          borderRadius: 10, marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            {/* Avatar */}
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: d.color + "22", border: "1.5px solid " + d.color + "50",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800, color: d.color, flexShrink: 0,
            }}>
              {initials(`${contact.firstName || ""} ${contact.lastName || ""}`)}
            </div>

            {/* Name / subtitle / location */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                {contact.firstName} {contact.lastName}
              </div>
              {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
              {contact.city && (
                <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>📍 {contact.city}</div>
              )}
            </div>

            <StagePill stage={contact.lifecycleStage} />
          </div>

          {/* Score ring + key info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <ScoreRing score={score} />
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11 }}>
              {contact.email && (
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: T.muted }}>Email: </span>
                  <span style={{ color: T.accent, fontWeight: 600 }}>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div>
                  <span style={{ color: T.muted }}>Phone: </span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{contact.phone}</span>
                </div>
              )}
              <div>
                <span style={{ color: T.muted }}>Value: </span>
                <span style={{ color: T.green, fontWeight: 600 }}>
                  {contact.contractValue ? "$" + contact.contractValue.toLocaleString() : "—"}
                </span>
              </div>
              {contact.source && (
                <div>
                  <span style={{ color: T.muted }}>Source: </span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{contact.source}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <ActivityAvatar name={contact.addedBy || "?"} size={18} />
            <span style={{ fontSize: 9, color: T.muted }}>Added by {contact.addedBy || "Unknown"}</span>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
          <Btn onClick={() => setModal("log")}   style={{ fontSize: 10, padding: "6px 8px" }}>+ Log Activity</Btn>
          <Btn onClick={() => setModal("stage")} variant="secondary" style={{ fontSize: 10, padding: "6px 8px" }}>⇢ Stage</Btn>
          <Btn onClick={() => setModal("edit")}  variant="secondary" style={{ fontSize: 10, padding: "6px 8px" }}>✎ Edit</Btn>
        </div>

        {/* ── Lead Journey stepper ────────────────────────────────────────── */}
        <Card style={{ padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10 }}>Lead Journey</div>
          <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
            {stageOrder.map((s, i) => {
              const sd   = STAGE_DEF[s];
              const done = !isLost && currentIdx >= i;
              const curr = contact.lifecycleStage === s;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: curr ? sd.color : done ? sd.color + "40" : T.border,
                      border: "2px solid " + (curr ? sd.color : done ? sd.color + "80" : T.borderHi),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: curr ? "#fff" : done ? sd.color : T.muted,
                      fontWeight: 700,
                    }}>
                      {done && !curr ? "✓" : i + 1}
                    </div>
                    <div style={{
                      fontSize: 8, color: curr ? sd.color : done ? T.dim : T.muted,
                      fontWeight: curr ? 700 : 400,
                      textAlign: "center", maxWidth: 50, lineHeight: 1.2,
                    }}>
                      {sd.label}
                    </div>
                  </div>
                  {i < stageOrder.length - 1 && (
                    <div style={{
                      width: 16, height: 2,
                      background: done && currentIdx > i ? sd.color + "50" : T.border,
                      marginBottom: 14, flexShrink: 0,
                    }} />
                  )}
                </div>
              );
            })}
            {isLost && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: T.red + "20", border: "2px solid " + T.red,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: T.red, fontWeight: 700,
                }}>✕</div>
                <div style={{ fontSize: 8, color: T.red, fontWeight: 700 }}>
                  {STAGE_DEF[contact.lifecycleStage]?.label}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Activity stats ──────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
          {[
            ["Emails",   acts.filter(a => ACT_DEF[a.type]?.cat === "email").length,   T.blue],
            ["Calls",    acts.filter(a => ACT_DEF[a.type]?.cat === "call").length,    T.green],
            ["Ads",      acts.filter(a => ACT_DEF[a.type]?.cat === "ad").length,      T.purple],
            ["Meetings", acts.filter(a => ACT_DEF[a.type]?.cat === "meeting").length, T.amber],
            ["Total",    acts.length,                                                  T.accent],
            ["Last",     fmt.ago(contact.lastActivityAt),                              T.orange],
          ].map(([l, v, c]) => (
            <div key={l} style={{
              background: T.surface, border: "1px solid " + T.border,
              borderRadius: 6, padding: "8px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
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
                fontFamily: "inherit",
              }}
            >
              {CAT_LABEL[cat] || cat}
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
                const def = ACT_DEF[act.type] || { label: act.type, icon: "·", color: T.muted, cat: "system" };
                return (
                  <div
                    key={act.id}
                    style={{ display: "flex", gap: 9, padding: "8px 10px", borderRadius: 6, marginBottom: 2 }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surface)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: def.color + "18", border: "1px solid " + def.color + "40",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: def.color, marginTop: 1,
                    }}>
                      {def.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{def.label}</span>
                        <Pill color={def.color} small>{def.cat}</Pill>
                      </div>
                      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{act.note}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        <ActivityAvatar name={act.by || "System"} size={14} />
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
          <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>
            No {filter === "all" ? "" : filter + " "}activities yet.
          </div>
        )}

      </div>
    </div>
  );
}
