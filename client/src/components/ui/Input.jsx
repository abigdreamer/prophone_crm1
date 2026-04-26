import T from "../../theme";

// ─── Labelled text input ──────────────────────────────────────────────────────
export default function Input({ label, value, onChange, placeholder, type = "text", style = {}, error, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: T.surface,
          border: "1px solid " + (error ? "#ef4444" : T.border),
          borderRadius: 6,
          padding: "8px 11px",
          color: T.text,
          fontSize: 12,
          outline: "none",
          fontFamily: "inherit",
        }}
        onFocus={e => (e.target.style.borderColor = error ? "#ef4444" : T.accent)}
        onBlur={e  => (e.target.style.borderColor = error ? "#ef4444" : T.border)}
      />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 1 }}>{error}</div>}
    </div>
  );
}
