import { useState } from "react";
import Modal from "../ui/Modal";
import { StagePill } from "../ui/Pill";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { ALL_STAGES, STAGE_DEF } from "../../data/stages";
import { Spinner } from "../ui/Loader";

// ─── Change Stage modal ───────────────────────────────────────────────────────
export default function StageModal({ contact, onSave, onClose, currentUser }) {
  const T = useTheme();
  const [stage,  setStage]  = useState(contact.lifecycleStage);
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const act = {
      id:   "a" + Date.now(),
      type: "stage_changed",
      note: `Stage: ${STAGE_DEF[contact.lifecycleStage]?.label} → ${STAGE_DEF[stage]?.label}. ${note}`.trim(),
      ts:   new Date().toISOString(),
      by:   currentUser?.name || "Unknown",
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

  return (
    <Modal title={`Change Stage — ${contact.firstName}`} onClose={onClose} width={420}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
          Current: <StagePill stage={contact.lifecycleStage} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ALL_STAGES.map(s => {
            const d      = STAGE_DEF[s];
            const active = stage === s;
            return (
              <button
                key={s}
                onClick={() => setStage(s)}
                style={{
                  padding: "5px 10px", borderRadius: 5,
                  border: "1px solid " + (active ? d.color : T.border),
                  background: active ? d.color + "20" : "transparent",
                  color: active ? d.color : T.dim,
                  fontSize: 11, fontWeight: active ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Note
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional note..."
          className="crm-input"
          style={{
            width: "100%", marginTop: 4,
            background: T.surface, border: "1px solid " + T.border,
            borderRadius: 6, padding: "8px 11px",
            color: T.text, fontSize: 12,
            outline: "none", fontFamily: "inherit",
            minHeight: 60, resize: "vertical", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = T.accent)}
          onBlur={e  => (e.target.style.borderColor = T.border)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving
            ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Spinner size={13} color="#fff" /> Updating…
              </span>
            : "Update Stage"
          }
        </Btn>
      </div>
    </Modal>
  );
}
