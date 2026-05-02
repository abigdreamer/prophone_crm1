import T from "../../theme";

// ─── Search-term highlighter ──────────────────────────────────────────────────
export default function Hi({ text, q }) {
  if (!q || !text) return <span>{text}</span>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <mark style={{ background: T.accentLow, color: T.accent, borderRadius: 2, padding: "0 1px" }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </span>
  );
}
