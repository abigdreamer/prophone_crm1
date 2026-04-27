import T from "../../theme";

// ─── Labelled select dropdown ─────────────────────────────────────────────────
export default function Sel({ label, value, onChange, options, style = {}, error, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: T.surface,
          border: "1px solid " + (error ? "#dc2626" : T.border),
          borderRadius: 6,
          padding: "8px 11px",
          color: T.text,
          fontSize: 12,
          outline: "none",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
    </div>
  );
}
