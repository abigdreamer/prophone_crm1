import { useTheme } from "../../context/ThemeContext";

// Inject keyframe animations once (no colors — transforms only)
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

// ─── Shimmer helper ──────────────────────────────────────────────────────────
function shimmerStyle(T, extra = {}) {
  return {
    background: `linear-gradient(90deg, ${T.border}, ${T.surface}, ${T.border})`,
    backgroundSize: "400px 100%",
    animation: "crm-shimmer 1.4s linear infinite",
    borderRadius: 4,
    ...extra,
  };
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 26, color, style: sx }) {
  const T = useTheme();
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

// ─── Dots ────────────────────────────────────────────────────────────────────
export function Dots({ color }) {
  const T = useTheme();
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

// ─── PageLoader (kept — branded initial load) ─────────────────────────────────
export function PageLoader({ text = "Loading CRM…" }) {
  const T = useTheme();
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
      <div style={{ position: "relative", marginBottom: 4 }}>
        <div style={{
          position: "absolute", inset: -14, borderRadius: "50%",
          background: `radial-gradient(circle, ${T.accent}28 0%, transparent 70%)`,
        }} />
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: `linear-gradient(135deg, ${T.accent}, #818cf8)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 900, color: "#fff",
          boxShadow: `0 0 32px ${T.accent}55`,
          animation: "crm-pulse 2s ease infinite",
          position: "relative",
        }}>G</div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>GeniusAI</div>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: "0.1em", marginTop: 1 }}>PROPHONE CRM</div>
      </div>
      <Spinner size={34} />
      <div style={{ fontSize: 11, color: T.muted }}>{text}</div>
      <div style={{ width: 160, height: 2, background: T.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: "40%", borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
          backgroundSize: "400px 100%",
          animation: "crm-shimmer 1.4s linear infinite",
        }} />
      </div>
    </div>
  );
}

// ─── ContentLoader (kept for compatibility — wraps SkeletonContactList) ───────
export function ContentLoader({ rows = 8, cols = 9 }) {
  const T = useTheme();
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: T.bg + "f2",
      padding: "0",
      animation: "crm-fadein 0.15s ease",
    }}>
      <div style={{
        background: T.card, border: "1px solid " + T.border,
        borderRadius: 8, overflow: "hidden", margin: "0",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── InlineLoader ─────────────────────────────────────────────────────────────
export function InlineLoader({ text = "Saving…" }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Spinner size={13} />
      <span style={{ fontSize: 11, color: T.muted }}>{text}</span>
    </div>
  );
}

// ─── SkeletonRow (table row) ──────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }) {
  const T = useTheme();
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "10px 11px" }}>
          <div style={shimmerStyle(T, {
            height: 10,
            width: i === 0 ? "80%" : i === cols - 1 ? "40%" : "65%",
          })} />
        </td>
      ))}
    </tr>
  );
}

// ─── SkeletonBlock (generic shimmer div) ──────────────────────────────────────
export function SkeletonBlock({ w = "100%", h = 12, radius = 4, style: sx }) {
  const T = useTheme();
  return (
    <div style={shimmerStyle(T, { width: w, height: h, borderRadius: radius, ...sx })} />
  );
}

// ─── SkeletonContactCard (sidebar list item) ─────────────────────────────────
export function SkeletonContactCard() {
  const T = useTheme();
  const b = (w, h = 9) => (
    <div style={shimmerStyle(T, { width: w, height: h, marginBottom: 5 })} />
  );
  return (
    <div style={{
      padding: "12px 14px",
      borderBottom: "1px solid " + T.border,
      borderLeft: "4px solid transparent",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        {b("55%", 11)}
        {b("22%", 9)}
      </div>
      {b("40%")}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={shimmerStyle(T, { flex: 1, height: 5, borderRadius: 3 })} />
        {b("18%")}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {b("50%")}
        {b("18%")}
      </div>
    </div>
  );
}

// ─── SkeletonActivityRow (timeline / audit-log entry) ────────────────────────
export function SkeletonActivityRow() {
  const T = useTheme();
  return (
    <div style={{ display: "flex", gap: 10, paddingBottom: 14 }}>
      <div style={shimmerStyle(T, {
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
      })} />
      <div style={{ flex: 1 }}>
        <div style={shimmerStyle(T, { width: "45%", height: 9, marginBottom: 6 })} />
        <div style={shimmerStyle(T, { width: "70%", height: 9 })} />
      </div>
    </div>
  );
}

// ─── SkeletonMetricCard ───────────────────────────────────────────────────────
export function SkeletonMetricCard() {
  const T = useTheme();
  return (
    <div style={{
      background: T.card, border: "1px solid " + T.border,
      borderRadius: 8, padding: "12px 16px",
    }}>
      <div style={shimmerStyle(T, { width: "50%", height: 9, marginBottom: 10 })} />
      <div style={shimmerStyle(T, { width: "60%", height: 20 })} />
    </div>
  );
}

// ─── SkeletonDetailPanel (full contact detail loading state) ─────────────────
export function SkeletonDetailPanel() {
  const T = useTheme();
  const block = (w, h = 10, mb = 0) => (
    <div style={shimmerStyle(T, { width: w, height: h, marginBottom: mb })} />
  );
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32, animation: "crm-fadein 0.2s ease" }}>
      {/* Hero */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 18,
        padding: "20px 22px", background: T.card, border: "1px solid " + T.border,
        borderRadius: 10, marginBottom: 16,
      }}>
        <div style={shimmerStyle(T, { width: 64, height: 64, borderRadius: "50%", flexShrink: 0 })} />
        <div style={{ flex: 1, paddingTop: 4 }}>
          {block("50%", 18, 10)}
          {block("35%", 11, 8)}
          <div style={{ display: "flex", gap: 6 }}>
            {block("18%", 20)}{" "}{block("18%", 20)}{" "}{block("18%", 20)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {block(72, 28)}{" "}{block(72, 28)}
        </div>
      </div>

      {/* Metrics strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {[0, 1, 2, 3].map(i => <SkeletonMetricCard key={i} />)}
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid " + T.border }}>
              {block("40%", 9)}
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2, 3].map(j => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between" }}>
                  {block("30%")}{block("45%")}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CRM metadata strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        background: T.card, border: "1px solid " + T.border, borderRadius: 8,
        marginBottom: 12, overflow: "hidden",
      }}>
        {[0, 1, 2, 3].map((_, i, arr) => (
          <div key={_} style={{ padding: "12px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.border : "none" }}>
            {block("55%", 8, 6)}{block("40%", 12)}
          </div>
        ))}
      </div>

      {/* Audit log placeholder */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "8px 16px" }}>{block("30%", 9)}</div>
      </div>
    </div>
  );
}
