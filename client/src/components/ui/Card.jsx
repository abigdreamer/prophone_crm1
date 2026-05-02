import T from "../../theme";

// ─── Surface card wrapper ─────────────────────────────────────────────────────
export default function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, ...style }}>
      {children}
    </div>
  );
}
