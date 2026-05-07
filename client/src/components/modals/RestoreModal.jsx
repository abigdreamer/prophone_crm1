import { useTheme } from "../../context/ThemeContext";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";

/* create: RestoreModal */
export function RestoreModal({
  title = "Restore Contact",
  message = "This contact will be restored back to active list.",
  confirmLabel = "Restore",
  loading = false,
  onRestore,
  onClose
}) {
  const T = useTheme();

  return (
    <Modal onClose={onClose} title={title} width={420}>
      
      {/* Info box */}
      <div style={{
        background: T.green + "12",
        border: "1px solid " + T.green + "30",
        borderRadius: 7,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: 12,
        color: T.dim,
        lineHeight: 1.6
      }}>
        {message}
      </div>

      {/* Actions */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 10
      }}>
        <Btn
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Btn>

        <Btn
          onClick={onRestore}
          disabled={loading}
          style={{
            background: T.green,
            borderColor: T.green,
            color: "#fff"
          }}
        >
          {loading ? "Restoring..." : confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}