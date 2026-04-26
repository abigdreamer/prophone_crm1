import { useState } from "react";
import Modal from "../ui/Modal";
import Sel from "../ui/Sel";
import Btn from "../ui/Btn";
import T from "../../theme";
import { ACT_DEF } from "../../data/activities";
import { Spinner } from "../ui/Loader";

// ─── Log Activity modal ───────────────────────────────────────────────────────
export default function LogActivityModal({ contact, onSave, onClose, currentUser }) {
  const [type,     setType]     = useState("call_made");
  const [note,     setNote]     = useState("");
  const [noteErr,  setNoteErr]  = useState("");
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    if (!note.trim()) { setNoteErr("Note is required"); return; }
    setNoteErr("");
    setSaving(true);
    try {
      await onSave({
        id:   "a" + Date.now(),
        type,
        note,
        ts:   new Date().toISOString(),
        by:   currentUser?.name || "Unknown",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Log Activity — ${contact.firstName}`} onClose={onClose} width={480}>
      <Sel
        label="Activity Type"
        value={type}
        onChange={setType}
        options={Object.entries(ACT_DEF).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
      />

      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 10, color: noteErr ? "#ef4444" : T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); if (noteErr) setNoteErr(""); }}
          placeholder="Describe what happened..."
          style={{
            width: "100%", marginTop: 4,
            background: T.surface,
            border: "1px solid " + (noteErr ? "#ef4444" : T.border),
            borderRadius: 6, padding: "8px 11px",
            color: T.text, fontSize: 12,
            outline: "none", fontFamily: "inherit",
            minHeight: 90, resize: "vertical", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = noteErr ? "#ef4444" : T.accent)}
          onBlur={e  => (e.target.style.borderColor = noteErr ? "#ef4444" : T.border)}
        />
        {noteErr && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{noteErr}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving
            ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Spinner size={13} color="#fff" /> Logging…
              </span>
            : "Log Activity"
          }
        </Btn>
      </div>
    </Modal>
  );
}
