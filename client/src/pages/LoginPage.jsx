import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import { useTheme, useThemeName } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { loginUser } from "../services/api";
import { identifyUser, analytics } from "../services/analytics";
import { Check, Eye, ArrowRight } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const T = useTheme();
  const themeName = useThemeName();
  const navigate = useNavigate();

  const [email, setEmail] = useState("mike@geniusai.biz");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      if (user) { identifyUser(user); analytics.signedIn(user); onLogin(user); navigate('/contacts', { replace: true }); }
      else setError("Invalid credentials. Check your email and password.");
    } catch {
      setError("Connection error. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }

  const bgGradient =
    themeName === "dark"
      ? `radial-gradient(circle at 50% -20%, ${T.surface} 0%, ${T.bg} 100%)`
      : `radial-gradient(circle at 50% -20%, ${T.card} 0%, ${T.bg} 100%)`;

  const primaryGradient = `linear-gradient(90deg, ${T.accent} 0%, ${T.blue || T.accent} 100%)`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: T.bg,
        backgroundImage: bgGradient,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: 480,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          padding: 40,
          boxShadow: T.shadowLg,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: primaryGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 900,
              color: "#fff",
              margin: "0 auto 16px",
              boxShadow: T.shadowMd,
            }}
          >
            G
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>
            GeniusAI
          </div>

          <div
            style={{
              fontSize: 11,
              color: T.muted,
              letterSpacing: "2px",
              marginTop: 4,
              fontWeight: 600,
            }}
          >
            PROPHONE CRM
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text }}>
          Sign in
        </h1>

        {/* Quick Select */}
        <div style={{ marginTop: 24, marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              color: T.muted,
              fontWeight: 700,
              letterSpacing: "1px",
              marginBottom: 12,
            }}
          >
            QUICK SELECT
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {USERS_DB.slice(0, 4).map((u) => {
              const active = email === u.email;

              return (
                <button
                  key={u.id}
                  onClick={() => setEmail(u.email)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    background: active ? T.accentLow : T.card,
                    border: `1px solid ${active ? T.accent : T.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <Avatar user={u} size={28} />

                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: active ? T.text : T.dim,
                      }}
                    >
                      {u.name.split(" ")[0]}
                    </div>
                    <div style={{ fontSize: 10, color: T.muted }}>
                      {u.role || "Staff"}
                    </div>
                  </div>

                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: T.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>
              EMAIL
            </label>
            <Input value={email} onChange={setEmail} />
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>
              PASSWORD
            </label>

            <Input
              value={password}
              onChange={setPassword}
              type={showPass ? "text" : "password"}
            />

            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: "absolute",
                right: 14,
                top: "55%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.muted,
              }}
            >
              <Eye size={18} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 10,
              borderRadius: 10,
              background: T.accentLow,
              border: `1px solid ${T.red}`,
              color: T.red,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 28,
            padding: 16,
            borderRadius: 12,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: primaryGradient,
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            boxShadow: T.shadow,
          }}
        >
          {loading ? "Signing in..." : (
            <>
              Sign in <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Footer */}
        <div
          style={{
            marginTop: 36,
            textAlign: "center",
            fontSize: 9,
            color: T.muted,
            letterSpacing: "1.2px",
            opacity: 0.7,
          }}
        >
          GENIUSAI • PROPHONE SUITE
        </div>
      </div>
    </div>
  );
}