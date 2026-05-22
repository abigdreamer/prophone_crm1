import { useState } from "react";
import { useAppToast } from "../../context/ToastContext";
import Sel from "../ui/Sel";
import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { ACT_DEF } from "../../data/activities";
import { Spinner } from "../ui/Loader";

function contactName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Contact";
}

export default function LogActivityInline({ contact, onSave, onBack, currentUser }) {
  const T = useTheme();
  const [type, setType] = useState("call_made");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  async function handleSave() {
    if (!note.trim()) { toast.warning("Please add a note."); return; }
    setSaving(true);
    try {
      await onSave({
        id: "a" + Date.now(),
        type,
        note,
        ts: new Date().toISOString(),
        by: currentUser?.name || "Unknown",
      });
      toast.success("Activity logged.");
    } catch (err) {
      toast.error(err.message || "Failed to log activity.");
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
    minHeight: 120, resize: "vertical", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Log Activity</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{contactName(contact)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onBack} disabled={saving}>← Back</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Spinner size={13} color="#fff" /> Logging…</span>
              : "Log Activity"
            }
          </Btn>
        </div>
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
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
            placeholder="Describe what happened…"
            style={taStyle}
            onFocus={e => (e.target.style.borderColor = T.accent)}
            onBlur={e => (e.target.style.borderColor = T.border)}
          />
        </div>
      </div>
    </div>
  );
}
