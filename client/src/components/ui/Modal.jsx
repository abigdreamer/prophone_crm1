import { useEffect } from "react";
import T from "../../theme";

// ─── Overlay modal ────────────────────────────────────────────────────────────
export default function Modal({ title, onClose, children, width = 520 }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: T.card,
          border: "1px solid " + T.border,
          borderRadius: 12,
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid " + T.border,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
