import { useState } from "react";
import { useAppToast } from "../../context/ToastContext";
import Modal from "../ui/Modal";
import Sel from "../ui/Sel";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { ACT_DEF } from "../../data/activities";
import { Spinner } from "../ui/Loader";

// ─── Log Activity modal ───────────────────────────────────────────────────────
export default function LogActivityModal({ contact, onSave, onClose, currentUser }) {
  const T = useTheme();
  const [type,   setType]   = useState("call_made");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  async function handleSave() {
    if (!note.trim()) { toast.warning("Please add a note."); return; }
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
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes *
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe what happened..."
          style={{
            width: "100%", marginTop: 4,
            background: T.surface, border: "1px solid " + T.border,
            borderRadius: 6, padding: "8px 11px",
            color: T.text, fontSize: 12,
            outline: "none", fontFamily: "inherit",
            minHeight: 90, resize: "vertical", boxSizing: "border-box",
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
                <Spinner size={13} color="#fff" /> Logging…
              </span>
            : "Log Activity"
          }
        </Btn>
      </div>
    </Modal>
  );
}
