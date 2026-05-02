import T from "../../theme";
import { STAGE_DEF } from "../../data/stages";

// ─── Generic coloured pill ────────────────────────────────────────────────────
export function Pill({ color = T.muted, children, small, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        background: color + "1a", color,
        border: "1px solid " + color + "40",
        borderRadius: 4,
        padding: small ? "1px 5px" : "2px 7px",
        fontSize: small ? 9 : 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </span>
  );
}

// ─── Stage-specific pill ──────────────────────────────────────────────────────
export function StagePill({ stage }) {
  const d = STAGE_DEF[stage];
  if (!d) return null;
  return <Pill color={d.color}>{d.label}</Pill>;
}
