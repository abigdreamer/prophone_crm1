import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import T from "../theme";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: 400, gap: 16, padding: 40,
    }}>
      <div style={{ fontSize: 72, fontWeight: 900, color: T.border, letterSpacing: "-0.05em", lineHeight: 1 }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Page not found</div>
      <div style={{ fontSize: 13, color: T.muted, textAlign: "center", maxWidth: 300 }}>
        The page you're looking for doesn't exist or has been moved.
      </div>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7,
          padding: "10px 20px", background: T.accent, border: "none", borderRadius: 8,
          color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <LayoutDashboard size={14} /> Go to Dashboard
      </button>
    </div>
  );
}
