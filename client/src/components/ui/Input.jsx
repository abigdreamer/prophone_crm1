import T from "../../theme";

// ─── Labelled text input ──────────────────────────────────────────────────────
export default function Input({ label, value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: T.surface,
          border: "1px solid " + T.border,
          borderRadius: 6,
          padding: "8px 11px",
          color: T.text,
          fontSize: 12,
          outline: "none",
          fontFamily: "inherit",
        }}
        onFocus={e => (e.target.style.borderColor = T.accent)}
        onBlur={e  => (e.target.style.borderColor = T.border)}
      />
    </div>
  );
}
