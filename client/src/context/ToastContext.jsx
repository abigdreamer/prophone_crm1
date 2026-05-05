import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useTheme } from "./ThemeContext";

const ToastCtx = createContext(null);

let _uid = 0;

const CFG_META = {
  success: { icon: "✓", defaultMs: 3500, colorKey: "green"  },
  error:   { icon: "✕", defaultMs: 5000, colorKey: "red"    },
  warning: { icon: "⚠", defaultMs: 4000, colorKey: "amber"  },
  info:    { icon: "ℹ", defaultMs: 3500, colorKey: "accent" },
};

function ToastItem({ toast, onRemove }) {
  const T = useTheme();
  const meta = CFG_META[toast.type] || CFG_META.info;
  const color = T[meta.colorKey];

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${color}35`,
      borderRadius: 10,
      boxShadow: T.shadowMd,
      minWidth: 280, maxWidth: 380,
      overflow: "hidden",
      animation: "toastSlideIn 0.2s ease",
      fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
    }}>
      <div style={{ height: 3, background: color + "25", borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: "100%", background: color,
          transformOrigin: "left",
          animation: `toastProgress ${toast.ms}ms linear forwards`,
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 13px 11px 12px" }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          background: color + "1a",
          border: `1px solid ${color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, fontSize: 13, color: T.text, lineHeight: 1.45 }}>
          {toast.message}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.muted, padding: "1px 2px", fontSize: 13, lineHeight: 1,
            flexShrink: 0, marginTop: 1,
          }}
        >✕</button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback((type, message, duration) => {
    const id  = ++_uid;
    const ms  = duration ?? CFG_META[type]?.defaultMs ?? 3500;
    setToasts(p => [...p, { id, type, message, ms }]);
    timers.current[id] = setTimeout(() => remove(id), ms);
  }, [remove]);

  const toast = {
    success: (msg, dur) => push("success", msg, dur),
    error:   (msg, dur) => push("error",   msg, dur),
    warning: (msg, dur) => push("warning", msg, dur),
    info:    (msg, dur) => push("info",    msg, dur),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <style>{`
        @keyframes toastSlideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastProgress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
      `}</style>
      <div style={{
        position: "fixed", bottom: 22, right: 22,
        zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useAppToast must be used inside ToastProvider");
  return ctx;
}
