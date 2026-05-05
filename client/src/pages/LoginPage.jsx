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
        width: 440, background: T.card,
        backdropFilter: "blur(20px)",
        border: "1px solid " + T.border,
        borderRadius: 28, padding: "48px 40px",
        boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff",
            margin: "0 auto 16px",
            boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
          }}>G</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>GeniusAI</div>
          <div style={{ fontSize: 11, color: T.muted, letterSpacing: "2px", marginTop: 4 }}>PROPHONE CRM</div>
        </div>

        {/* Quick Select */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>Quick Select</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {USERS_DB.slice(0, 4).map(u => {
              const active = email === u.email;
              return (
                <button
                  key={u.id}
                  onClick={() => setEmail(u.email)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px",
                    background: active ? T.accent + "15" : T.surface,
                    border: `1px solid ${active ? T.accent : T.border}`,
                    borderRadius: 16, cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    textAlign: "left", position: "relative",
                  }}
                >
                  <Avatar user={u} size={34} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? T.text : T.dim }}>{u.name.split(" ")[0]}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{u.role || "Staff"}</div>
                  </div>
                  {active && <Check size={14} color="#6366f1" style={{ position: "absolute", right: 12, top: 12 }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.5px" }}>EMAIL ADDRESS</label>
            <Input value={email} onChange={setEmail} placeholder="name@company.com" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.5px" }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <Input
                value={password}
                onChange={setPassword}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: 12, bottom: 12,
                  background: "none", border: "none", cursor: "pointer",
                  color: T.muted,
                }}
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 20, padding: "12px", borderRadius: 12,
            background: T.red + "18", border: "1px solid " + T.red + "30",
            color: T.red, fontSize: 12, textAlign: "center",
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "16px", marginTop: 32,
            background: loading ? "rgba(99, 102, 241, 0.5)" : "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
            border: "none", borderRadius: 14, color: "#fff",
            fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: "0 10px 25px rgba(99, 102, 241, 0.3)",
            transition: "transform 0.2s",
          }}
        >
          {loading
            ? <><Spinner size={16} color="#fff" /> Logging in…</>
            : <>Sign in <ArrowRight size={18} /></>}
        </button>

        <div style={{
          marginTop: 40, fontSize: 10, color: T.muted,
          textAlign: "center", letterSpacing: "1px", fontWeight: 500,
        }}>
          SECURED BY GENIUSAI ECOSYSTEM
        </div>
      </div>
    </div>
  );
}
