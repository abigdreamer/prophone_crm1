import { Clock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ComingSoon({ page }) {
  const T = useTheme();
  const label = page.charAt(0).toUpperCase() + page.slice(1);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", gap: 14, color: T.muted,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: T.card, border: "1px solid " + T.border,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Clock size={22} color={T.muted} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 13, color: T.muted }}>This feature is coming soon.</div>
      </div>
    </div>
  );
}
