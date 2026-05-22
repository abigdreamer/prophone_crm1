import { useState } from "react";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { Spinner } from "../ui/Loader";

function contactName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Contact";
}

export default function CancelInline({ contact, onSave, onBack }) {
  const T = useTheme();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
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
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Cancel Contact</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{contactName(contact)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onBack} disabled={saving}>← Keep Active</Btn>
          <Btn
            onClick={handleConfirm}
            disabled={saving}
            style={{ background: T.red, borderColor: T.red, color: "#fff" }}
          >
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Spinner size={13} color="#fff" /> Canceling…</span>
              : "Confirm Cancel"
            }
          </Btn>
        </div>
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        <div style={{
          background: T.red + "12", border: "1px solid " + T.red + "30",
          borderRadius: 7, padding: "10px 14px", marginBottom: 16,
          fontSize: 12, color: T.dim, lineHeight: 1.6,
        }}>
          This contact will be removed from the active list. You can restore them at any time from the{" "}
          <strong style={{ color: T.text }}>Canceled</strong> view.
        </div>

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
          }}
          onFocus={e => (e.target.style.borderColor = invalid ? T.red : T.accent)}
          onBlur={e => (e.target.style.borderColor = invalid ? T.red : T.border)}
        />
        {invalid && (
          <div style={{ fontSize: 10, color: T.red, marginTop: 4 }}>
            A reason is required before canceling.
          </div>
        )}
      </div>
    </div>
  );
}
