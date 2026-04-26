import T from "../../theme";

// ─── Circular score ring ──────────────────────────────────────────────────────
export function ScoreRing({ score, size = 38 }) {
  const r   = 14;
  const circ = 2 * Math.PI * r; // ~87.96
  const fill = (score / 100) * circ;
  const c   = score >= 70 ? T.green : score >= 40 ? T.amber : T.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke={T.border} strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={c} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: c,
      }}>{score}</span>
    </div>
  );
}

// ─── Lead score progress bar (used in sidebar) ────────────────────────────────
export default function ScoreBar({ score }) {
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
