import { useTheme } from "../../context/ThemeContext";

export default function Btn({ children, onClick, variant = "primary", color, style = {}, disabled }) {
  const T = useTheme();
  const bg = disabled ? T.surface : color ? color : variant === "primary" ? T.accent : variant === "ghost" ? "transparent" : T.surface;
  const bd = color ? color : variant === "primary" ? T.accent : T.border;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background: bg,
        border: "1px solid " + bd,
        borderRadius: 6,
        padding: "6px 13px",
        color: disabled ? T.muted : (variant === "primary" || color) ? "#fff" : T.text,
        fontWeight: 600,
        fontSize: 11,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
