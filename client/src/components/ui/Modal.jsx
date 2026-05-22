import { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function Modal({ title, onClose, children, width = 520, noHeader = false }) {
  const T = useTheme();

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 9000,
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
          boxShadow: T.shadowLg,
        }}
      >
        {!noHeader && (
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
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
