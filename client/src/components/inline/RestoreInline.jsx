import Btn from "../ui/Btn";
import { useTheme } from "../../context/ThemeContext";
import { Spinner } from "../ui/Loader";

function contactName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Contact";
}

export default function RestoreInline({ contact, onConfirm, onBack, loading }) {
  const T = useTheme();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Restore Contact</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{contactName(contact)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onBack} disabled={loading}>← Back</Btn>
          <Btn
            onClick={onConfirm}
            disabled={loading}
            style={{ borderColor: T.green, color: T.green }}
          >
            {loading
              ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Spinner size={13} color={T.green} /> Restoring…</span>
              : "↩ Restore Contact"
            }
          </Btn>
        </div>
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        <div style={{
          background: T.green + "0e", border: "1px solid " + T.green + "30",
          borderRadius: 7, padding: "12px 16px",
          fontSize: 12, color: T.dim, lineHeight: 1.6,
        }}>
          <strong style={{ color: T.text }}>{contactName(contact)}</strong> will be moved back to the active
          contacts list and their canceled status will be removed.
        </div>
        {contact?.cancelReason && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Original Cancellation Reason
            </div>
            <div style={{
              background: T.surface, border: "1px solid " + T.border, borderRadius: 6,
              padding: "9px 12px", fontSize: 12, color: T.dim, fontStyle: "italic",
            }}>
              "{contact.cancelReason}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
