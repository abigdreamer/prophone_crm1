import { useTheme } from "../../context/ThemeContext";

export default function ScoreBar({ score }) {
  const T = useTheme();
  const c = score >= 70 ? T.green : score >= 40 ? T.amber : T.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 70 }}>
      <div style={{ flex: 1, height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: score + "%", background: c, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: c, fontWeight: 700, minWidth: 18, textAlign: "right" }}>{score}</span>
    </div>
  );
}
