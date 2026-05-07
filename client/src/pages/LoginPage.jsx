import { useState } from "react";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import { useTheme, useThemeName } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { loginUser } from "../services/api";
import { Spinner } from "../components/ui/Loader";
import { Check, Eye, ArrowRight } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const T = useTheme();
  const themeName = useThemeName();
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
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid credentials. Check your email and password.");
      }
    } catch {
      setError("Connection error. Make sure the API server is running on port 8080.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: T.bg,
      fontFamily: "'Inter', sans-serif",
      backgroundImage: themeName === "dark"
        ? "radial-gradient(circle at 50% -20%, #1e1b4b 0%, #05060a 100%)"
        : "radial-gradient(circle at 50% -20%, #e0e7ff 0%, #f1f5f9 100%)",
    }}>
      <div style={{
        width: 480, background: T.surface,
        backdropFilter: "blur(20px)",
        border: "1px solid " + T.border,
        borderRadius: 24, padding: "40px",
        boxShadow: themeName === "dark" 
          ? "0 40px 100px rgba(0,0,0,0.4)" 
          : "0 20px 50px rgba(99,102,241,0.1)",
      }}>

        {/* Header: Logo and Brand */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          textAlign: "center", 
          marginBottom: 40 
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 900, color: "#fff",
            marginBottom: 16,
            boxShadow: "0 10px 30px rgba(99, 102, 241, 0.3)",
          }}>G</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1.2, letterSpacing: "-0.5px" }}>GeniusAI</div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: "2.5px", marginTop: 4, fontWeight: 600 }}>PROPHONE CRM</div>
          </div>
        </div>

        {/* Title Section (Cleaned up) */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Sign in</h1>
        </div>

        {/* Quick Select Section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>QUICK SELECT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {USERS_DB.slice(0, 4).map(u => {
              const active = email === u.email;
              return (
                <button
                  key={u.id}
                  onClick={() => setEmail(u.email)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px",
                    background: active ? (themeName === "dark" ? "rgba(99, 102, 241, 0.08)" : "#f5f7ff") : T.card,
                    border: `1px solid ${active ? T.accent : T.border}`,
                    borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                    textAlign: "left", position: "relative",
                  }}
                >
                  <Avatar user={u} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? T.text : T.dim }}>{u.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{u.role || "Staff"}</div>
                  </div>
                  {active && (
                    <div style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      width: 18, height: 18, borderRadius: "50%", background: T.accent,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Check size={11} color="#fff" strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.5px" }}>EMAIL</label>
            <Input value={email} onChange={setEmail} placeholder="amy@geniusai.biz" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.5px" }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <Input
                value={password}
                onChange={setPassword}
                type={showPass ? "text" : "password"}
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: T.muted, opacity: 0.4
                }}
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 20, padding: "10px", borderRadius: 10,
            background: themeName === "dark" ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
            border: `1px solid ${themeName === "dark" ? "rgba(239, 68, 68, 0.2)" : "#fee2e2"}`,
            color: "#ef4444", fontSize: 12, textAlign: "center",
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "16px", marginTop: 32,
            background: "linear-gradient(90deg, #7c3aed 0%, #6366f1 100%)",
            border: "none", borderRadius: 12, color: "#fff",
            fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)",
          }}
        >
          {loading ? "Signing in..." : <>Sign in <ArrowRight size={18} /></>}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 40, fontSize: 9, color: T.muted,
          textAlign: "center", letterSpacing: "1.5px", fontWeight: 600,
          opacity: 0.6
        }}>
          PART OF THE GENIUSAI • PROPHONE SUITE
        </div>
      </div>
    </div>
  );
}