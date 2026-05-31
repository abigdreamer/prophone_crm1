import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { portalUpdateProfile } from "../../services/api";
import { Building2, User, Mail, Shield } from "lucide-react";

export default function ClientPortalProfile({ clientUser, onUpdate }) {
  const T = useTheme();
  const [name,  setName]  = useState(clientUser?.name  || "");
  const [email, setEmail] = useState(clientUser?.email || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [saved,  setSaved]  = useState(false);
  const accent = clientUser?.clientColor || "#6366f1";

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await portalUpdateProfile({ name, email });
      onUpdate?.({ ...clientUser, name: updated.name, email: updated.email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>My Profile</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Manage your portal account information.</p>
      </div>

      {/* Company info (read-only) */}
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 12, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Company</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: accent, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff",
          }}>
            {(clientUser?.clientName || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{clientUser?.clientName}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {clientUser?.client?.industry || ""}{clientUser?.client?.industry && clientUser?.client?.plan ? " · " : ""}{clientUser?.client?.plan || ""}
            </div>
          </div>
        </div>
      </div>

      {/* Account info (editable) */}
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 12, padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Account</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Display Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px", boxSizing: "border-box",
                background: T.bg, border: "1.5px solid " + T.border,
                borderRadius: 8, color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit",
              }}
              onFocus={e => { e.target.style.borderColor = accent; }}
              onBlur={e => { e.target.style.borderColor = T.border; }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Email (optional)</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              style={{
                width: "100%", padding: "9px 12px", boxSizing: "border-box",
                background: T.bg, border: "1.5px solid " + T.border,
                borderRadius: 8, color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit",
              }}
              onFocus={e => { e.target.style.borderColor = accent; }}
              onBlur={e => { e.target.style.borderColor = T.border; }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Username</label>
            <input
              value={clientUser?.username || ""}
              disabled
              style={{
                width: "100%", padding: "9px 12px", boxSizing: "border-box",
                background: T.border + "40", border: "1.5px solid " + T.border,
                borderRadius: 8, color: T.muted, fontSize: 13, fontFamily: "inherit", cursor: "not-allowed",
              }}
            />
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>Username cannot be changed. Contact your administrator.</div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: "9px 12px", borderRadius: 7,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{
            marginTop: 12, padding: "9px 12px", borderRadius: 7,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981", fontSize: 12,
          }}>
            Profile saved successfully.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 16, padding: "9px 22px",
            background: saving ? accent + "60" : accent,
            border: "none", borderRadius: 8, color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Role info */}
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 12, padding: "16px 22px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Shield size={18} color={accent} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {clientUser?.role === "admin" ? "Portal Admin" : "Read-Only Viewer"}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
            {clientUser?.role === "admin"
              ? "You have admin access to this client portal."
              : "You have read-only access to your company's data. Contact your ProPhone administrator to request changes."}
          </div>
        </div>
      </div>
    </div>
  );
}
