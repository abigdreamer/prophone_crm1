import T from "../../theme";

// Inject keyframe animations once
const _s = document.createElement("style");
_s.textContent = `
  @keyframes crm-spin    { to { transform: rotate(360deg); } }
  @keyframes crm-pulse   { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.6; transform:scale(0.92); } }
  @keyframes crm-fadein  { from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:translateY(0); } }
  @keyframes crm-shimmer { 0%{ background-position:-400px 0; } 100%{ background-position:400px 0; } }
  @keyframes crm-dot1    { 0%,80%,100%{ transform:scale(0); opacity:0.3; } 40%{ transform:scale(1); opacity:1; } }
  @keyframes crm-dot2    { 0%,80%,100%{ transform:scale(0); opacity:0.3; } 40%{ transform:scale(1); opacity:1; } }
  @keyframes crm-dot3    { 0%,80%,100%{ transform:scale(0); opacity:0.3; } 40%{ transform:scale(1); opacity:1; } }
`;
document.head.appendChild(_s);

// ── Spinner ring ──────────────────────────────────────────────────────────────
export function Spinner({ size = 26, color, style: sx }) {
  const c = color || T.accent;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        border: `2.5px solid ${c}28`,
        borderTopColor: c,
        animation: "crm-spin 0.65s linear infinite",
        ...sx,
      }}
    />
  );
}

// ── Three dots loader ─────────────────────────────────────────────────────────
export function Dots({ color }) {
  const c = color || T.accent;
  const dot = (delay) => ({
    width: 7, height: 7, borderRadius: "50%",
    background: c, display: "inline-block",
    animation: `crm-spin 1.4s ease-in-out ${delay}s infinite`,
    margin: "0 3px",
  });
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ ...dot(0),    animation: `crm-dot1 1.4s ease-in-out 0s    infinite` }} />
      <div style={{ ...dot(0.16), animation: `crm-dot2 1.4s ease-in-out 0.16s infinite` }} />
      <div style={{ ...dot(0.32), animation: `crm-dot3 1.4s ease-in-out 0.32s infinite` }} />
    </div>
  );
}

// ── Full-page loader (first load / auth) ──────────────────────────────────────
export function PageLoader({ text = "Loading CRM…" }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: T.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        animation: "crm-fadein 0.25s ease",
        fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
      }}
    >
      {/* Glow ring behind logo */}
      <div style={{ position: "relative", marginBottom: 4 }}>
        <div
          style={{
            position: "absolute", inset: -14,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${T.accent}28 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}, #818cf8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff",
            boxShadow: `0 0 32px ${T.accent}55`,
            animation: "crm-pulse 2s ease infinite",
            position: "relative",
          }}
        >
          G
        </div>
      </div>

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
          Prophone
        </div>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em", marginTop: 1 }}>
          PROPHONE CRM
        </div>
      </div>

      {/* Spinner */}
      <Spinner size={34} />

      {/* Text */}
      <div style={{ fontSize: 11, color: T.muted }}>{text}</div>

      {/* Progress bar */}
      <div
        style={{
          width: 160, height: 2,
          background: T.border, borderRadius: 2, overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%", width: "40%", borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
            backgroundSize: "400px 100%",
            animation: "crm-shimmer 1.4s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

// ── Content-area overlay (pool/client switch) ─────────────────────────────────
export function ContentLoader({ text = "Loading contacts…" }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        background: T.bg + "e0",
        backdropFilter: "blur(2px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 14,
        animation: "crm-fadein 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          background: T.card, border: "1px solid " + T.border,
          borderRadius: 12, padding: "24px 32px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: T.accent + "18", border: "1px solid " + T.accent + "30",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: T.accent,
            animation: "crm-pulse 1.8s ease infinite",
          }}
        >
          G
        </div>
        <Spinner size={28} />
        <div style={{ fontSize: 11, color: T.muted }}>{text}</div>
      </div>
    </div>
  );
}

// ── Inline mini spinner (for buttons, small spaces) ───────────────────────────
export function InlineLoader({ text = "Saving…" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Spinner size={13} />
      <span style={{ fontSize: 11, color: T.muted }}>{text}</span>
    </div>
  );
}

// ── Skeleton row (for table/list placeholders) ────────────────────────────────
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "10px 11px" }}>
          <div
            style={{
              height: 10, borderRadius: 4,
              background: `linear-gradient(90deg, ${T.border}, ${T.surface}, ${T.border})`,
              backgroundSize: "400px 100%",
              animation: "crm-shimmer 1.4s linear infinite",
              width: i === 0 ? "80%" : i === cols - 1 ? "40%" : "65%",
            }}
          />
        </td>
      ))}
    </tr>
  );
}
