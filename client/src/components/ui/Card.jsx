import { useTheme } from "../../context/ThemeContext";

export default function Card({ children, style = {} }) {
  const T = useTheme();
  return (
    <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, ...style }}>
      {children}
    </div>
  );
}
