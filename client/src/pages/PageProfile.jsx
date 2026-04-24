import { ArrowLeft, Mail, Shield } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import T from "../theme";

export default function PageProfile({ user, onBack }) {
  if (!user) return null;

  return (
    <div style={{ maxWidth: 540, margin: "40px auto", padding: "0 20px" }}>
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none",
          color: T.muted, fontSize: 13, cursor: "pointer",
          fontFamily: "inherit", padding: "0 0 20px", fontWeight: 500,
          transition: "color 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = T.text)}
        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div
        style={{
          background: T.surface,
          border: "1px solid " + T.border,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header banner */}
        <div
          style={{
            background: T.header,
            padding: "28px 28px 24px",
            display: "flex", alignItems: "center", gap: 16,
          }}
        >
          <Avatar user={user} size={56} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
              {user.name}
            </div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 6, background: "rgba(255,255,255,0.12)",
                borderRadius: 5, padding: "3px 8px",
              }}
            >
              <Shield size={10} color="rgba(255,255,255,0.65)" />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "capitalize", fontWeight: 600 }}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
            Account Details
          </div>

          {[
            { label: "Full Name", value: user.name },
            { label: "Email",     value: user.email,  icon: <Mail size={12} color={T.accent} /> },
            { label: "Role",      value: user.role    },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 0",
                borderBottom: "1px solid " + T.border,
              }}
            >
              <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>{label}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: T.text, fontWeight: 600 }}>
                {icon} {value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: "4px 28px 24px" }}>
          <div
            style={{
              background: T.accentLow,
              border: "1px solid " + T.accent + "25",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 12, color: T.sub,
            }}
          >
            Profile editing is not available in this version. Contact your administrator to update account details.
          </div>
        </div>
      </div>
    </div>
  );
}
