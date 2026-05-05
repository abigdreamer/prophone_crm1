import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useTheme } from "./ThemeContext";

const ConfirmCtx = createContext(null);

const TYPE_META = {
  danger:  { icon: "✕", colorKey: "red"    },
  warning: { icon: "⚠", colorKey: "amber"  },
  default: { icon: "?", colorKey: "accent" },
};

function ConfirmDialog({ title, description, confirmText, cancelText, type, onConfirm, onCancel }) {
  const T = useTheme();
  const meta = TYPE_META[type] || TYPE_META.default;
  const color = T[meta.colorKey];

  useEffect(() => {
    function handle(e) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onConfirm();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onConfirm, onCancel]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
        fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
        animation: "confirmFadeIn 0.15s ease",
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <style>{`@keyframes confirmFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: "24px 24px 20px",
        boxShadow: T.shadowLg,
        width: "100%", maxWidth: 420,
        animation: "confirmSlideUp 0.18s ease",
      }}>
        <style>{`@keyframes confirmSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: color + "18",
            border: `1.5px solid ${color}45`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color,
          }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>
              {title}
            </div>
            {description && (
              <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>
                {description}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "8px 18px",
              fontSize: 13, fontWeight: 600, color: T.dim,
              cursor: "pointer", fontFamily: "inherit",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >{cancelText}</button>
          <button
            onClick={onConfirm}
            style={{
              background: color, border: "none",
              borderRadius: 8, padding: "8px 20px",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 2px 10px ${color}40`,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({
    title,
    description = "",
    confirmText = "Confirm",
    cancelText  = "Cancel",
    type        = "danger",
  }) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setDialog({ title, description, confirmText, cancelText, type });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setDialog(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setDialog(null);
  }, []);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {dialog && (
        <ConfirmDialog
          {...dialog}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirmDialog must be used inside ConfirmProvider");
  return ctx;
}
