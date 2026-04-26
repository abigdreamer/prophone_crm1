import { useState, useEffect } from "react";
import { Trash2, LoaderCircle, Copy, Check } from "lucide-react";

const C = {
  surface: "#ffffff",
  bg:      "#f1f5f9",
  border:  "#e2e8f0",
  text:    "#0f172a",
  sub:     "#64748b",
  muted:   "#94a3b8",
  red:     "#dc2626",
  redBg:   "#fef2f2",
  redBdr:  "#fecaca",
  shadow:  "0 8px 32px rgba(0,0,0,0.14)",
};

/**
 * Shared destructive-action confirmation modal.
 *
 * Props:
 *   title        — modal heading, e.g. "Delete domain"
 *   itemName     — string the user must type to unlock the button
 *   description  — JSX/string body text (slot before the input)
 *   confirmLabel — button label, e.g. "Delete domain"
 *   onConfirm    — called when the user clicks the enabled button
 *   onClose      — called to dismiss without acting
 *   busy         — shows spinner / disables button while true
 */
export default function ConfirmDeleteModal({
  title        = "Confirm deletion",
  itemName     = "",
  description,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
  busy = false,
}) {
  const [input,   setInput]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const valid = input.trim() === itemName.trim();

  function handleCopy() {
    navigator.clipboard.writeText(itemName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px", boxShadow: C.shadow, width: "100%", maxWidth: 460, fontFamily: "inherit" }}>

        {/* Icon */}
        <div style={{ width: 38, height: 38, background: C.redBg, border: `1px solid ${C.redBdr}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Trash2 size={18} color={C.red} />
        </div>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex", flexShrink: 0, marginLeft: 12 }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
          </button>
        </div>

        {/* Description slot */}
        {description && (
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginBottom: 18 }}>
            {description}
          </div>
        )}

        {/* Confirmation label */}
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginBottom: 8, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          Type
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <code style={{ background: C.bg, border: `1px solid ${C.border}`, padding: "1px 7px", borderRadius: 5, fontSize: 12, fontFamily: "monospace", color: C.text }}>
              {itemName}
            </code>
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", color: copied ? "#22c55e" : C.muted, display: "inline-flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s" }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.sub; }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.color = C.muted; }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </span>
          to confirm.
        </div>

        {/* Input */}
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && valid && !busy) onConfirm(); }}
          placeholder={`Type "${itemName}" to confirm`}
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.surface,
            border: `1.5px solid ${valid ? "#86efac" : C.border}`,
            borderRadius: 9, padding: "10px 13px",
            fontSize: 13, color: C.text, outline: "none",
            fontFamily: "inherit", marginBottom: 20,
            transition: "border-color 0.2s",
          }}
          onFocus={e => { if (!valid) e.currentTarget.style.borderColor = "#94a3b8"; }}
          onBlur={e => { if (!valid) e.currentTarget.style.borderColor = C.border; }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!valid || busy}
            style={{
              flex: 1, border: "none", borderRadius: 9, padding: "10px 0",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: valid && !busy ? C.red : C.redBg,
              color:      valid && !busy ? "#fff" : "#fca5a5",
              cursor:     valid && !busy ? "pointer" : "not-allowed",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {busy
              ? <><LoaderCircle size={13} style={{ animation: "cdm-spin 0.8s linear infinite" }} /> Deleting…</>
              : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes cdm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
