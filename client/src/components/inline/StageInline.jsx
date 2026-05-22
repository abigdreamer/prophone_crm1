import { useState } from "react";
import { StagePill } from "../ui/Pill";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { ALL_STAGES, STAGE_DEF } from "../../data/stages";
import { Spinner } from "../ui/Loader";

function contactName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Contact";
}

export default function StageInline({ contact, onSave, onBack, currentUser }) {
  const T = useTheme();
  const [stage, setStage] = useState(contact.lifecycleStage);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const act = {
      id: "a" + Date.now(),
      type: "stage_changed",
      note: `Stage: ${STAGE_DEF[contact.lifecycleStage]?.label} → ${STAGE_DEF[stage]?.label}. ${note}`.trim(),
      ts: new Date().toISOString(),
      by: currentUser?.name || "Unknown",
    };
    setSaving(true);
    try {
      await onSave({
        ...contact,
        lifecycleStage: stage,
        lastActivityAt: new Date().toISOString(),
        activities: [...(contact.activities || []), act],
      });
    } finally {
      setSaving(false);
    }
  }

  const taStyle = {
    width: "100%", marginTop: 4,
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "8px 11px",
    color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit",
    minHeight: 80, resize: "vertical", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Change Stage</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{contactName(contact)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onBack} disabled={saving}>← Back</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Spinner size={13} color="#fff" /> Updating…</span>
              : "Update Stage"
            }
          </Btn>
        </div>
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
          Current: <StagePill stage={contact.lifecycleStage} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {ALL_STAGES.map(s => {
            const d = STAGE_DEF[s];
            const active = stage === s;
            return (
              <button
                key={s}
                onClick={() => setStage(s)}
                style={{
                  padding: "7px 14px", borderRadius: 6,
                  border: "1px solid " + (active ? d.color : T.border),
                  background: active ? d.color + "20" : "transparent",
                  color: active ? d.color : T.dim,
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div>
          <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note about this stage change…"
            style={taStyle}
            onFocus={e => (e.target.style.borderColor = T.accent)}
            onBlur={e => (e.target.style.borderColor = T.border)}
          />
        </div>
      </div>
    </div>
  );
}
