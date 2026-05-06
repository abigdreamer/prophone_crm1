import { useState } from "react";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { Spinner } from "../ui/Loader";

export default function CancelModal({ contact, onSave, onClose }) {
  const T = useTheme();
  const [reason,  setReason]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [touched, setTouched] = useState(false);

  const invalid = touched && !reason.trim();

  async function handleConfirm() {
    setTouched(true);
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onSave(reason.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Cancel Contact — ${contact.firstName} ${contact.lastName}`} onClose={onClose} width={460}>
      {/* Warning banner */}
      <div style={{
        background: T.red + "12", border: "1px solid " + T.red + "30",
        borderRadius: 7, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: T.dim, lineHeight: 1.6,
      }}>
        This contact will be removed from the active list. You can restore them at any time from the
        {" "}<strong style={{ color: T.text }}>Canceled</strong> tab.
      </div>

      {/* Reason textarea */}
      <div>
        <label style={{
          display: "block", fontSize: 10, fontWeight: 700,
          color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
        }}>
          Cancellation Reason <span style={{ color: T.red }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setTouched(true); }}
          placeholder="e.g. Lost interest, competitor chosen, no budget…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: T.surface,
            border: "1px solid " + (invalid ? T.red : T.border),
            borderRadius: 6, padding: "9px 12px",
            color: T.text, fontSize: 12,
            outline: "none", fontFamily: "inherit",
            minHeight: 90, resize: "vertical",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = invalid ? T.red : T.accent)}
          onBlur={e  => (e.target.style.borderColor = invalid ? T.red : T.border)}
        />
        {invalid && (
          <div style={{ fontSize: 10, color: T.red, marginTop: 4 }}>
            A reason is required before canceling.
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Keep Active</Btn>
        <Btn
          onClick={handleConfirm}
          disabled={saving}
          style={{ background: T.red, borderColor: T.red, color: "#fff" }}
        >
          {saving
            ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Spinner size={13} color="#fff" /> Canceling…
              </span>
            : "Confirm Cancel"
          }
        </Btn>
      </div>
    </Modal>
  );
}
