import { useTheme } from "../../context/ThemeContext";
import { STAGE_DEF } from "../../data/stages";

export function Pill({ color, children, small, onClick }) {
  const T = useTheme();
  const c = color || T.muted;
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        background: c + "1a", color: c,
        border: "1px solid " + c + "40",
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

export function StagePill({ stage }) {
  const d = STAGE_DEF[stage];
  if (!d) return null;
  return <Pill color={d.color}>{d.label}</Pill>;
}
