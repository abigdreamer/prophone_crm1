import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { clientLoginUser } from "../services/api";
import { Eye, EyeOff, ArrowRight, Building2, Users, BarChart2, Shield } from "lucide-react";

const accent = "#6366f1";

const FEATURES = [
  { icon: Users,     label: "Your Leads",       desc: "View all your company's leads and contacts"       },
  { icon: BarChart2, label: "Campaign Reports",  desc: "Track performance of email campaigns sent to you" },
  { icon: Building2, label: "Company Overview",  desc: "See all activity tied to your account"            },
  { icon: Shield,    label: "Secure Access",     desc: "Read-only portal — your data stays protected"     },
];

export default function ClientLoginPage({ onLogin }) {
  const T = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  async function handleLogin() {
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await clientLoginUser(username, password);
      if (user) {
        onLogin(user);
        navigate("/portal/dashboard", { replace: true });
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Connection error. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "'Inter', sans-serif", background: "#0a0a12",
    }}>
      {/* LEFT PROMO PANEL */}
      {!isMobile && (
        <div style={{
          width: "42%", flexShrink: 0,
          background: "linear-gradient(160deg, #0f0e1c 0%, #0b0b18 60%, #080c18 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "44px", display: "flex", flexDirection: "column",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: accent + "12", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 80, right: -40, width: 240, height: 240, borderRadius: "50%", background: "#3b82f610", filter: "blur(70px)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 44, position: "relative" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, boxShadow: "0 0 6px " + accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Powered by GeniusAI
            </span>
          </div>

          <div style={{ position: "relative", marginBottom: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: "linear-gradient(135deg, " + accent + " 0%, #3b82f6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 28px " + accent + "44", marginBottom: 18,
            }}>
              <Building2 size={28} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 6 }}>
              Client Portal
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              ProPhone CRM · Secure Access
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36, position: "relative" }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: accent + "18", border: "1px solid " + accent + "30",
                  display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                }}>
                  <Icon size={14} color={accent} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "auto", position: "relative",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "16px 20px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>
              This portal provides read-only access to your company data. For account changes, contact your ProPhone administrator.
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SIGN-IN PANEL */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: T.bg, padding: "32px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {isMobile && (
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: "0 auto 10px",
                background: "linear-gradient(135deg, " + accent + " 0%, #3b82f6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Building2 size={24} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Client Portal</div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, marginBottom: 5, letterSpacing: "-0.02em" }}>Client Login</h1>
            <p style={{ fontSize: 13, color: T.muted }}>Sign in to your company portal</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="username"
                style={{
                  width: "100%", padding: "11px 14px", boxSizing: "border-box",
                  background: T.surface, border: "1.5px solid " + T.border,
                  borderRadius: 10, color: T.text, fontSize: 13,
                  outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = accent; }}
                onBlur={e => { e.target.style.borderColor = T.border; }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPass ? "text" : "password"}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  autoComplete="current-password"
                  style={{
                    width: "100%", padding: "11px 42px 11px 14px", boxSizing: "border-box",
                    background: T.surface, border: "1.5px solid " + T.border,
                    borderRadius: 10, color: T.text, fontSize: 13,
                    outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = accent; }}
                  onBlur={e => { e.target.style.borderColor = T.border; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: T.muted, display: "flex", padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 9,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", marginTop: 20, padding: "13px 0",
              borderRadius: 10, border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? accent + "60" : "linear-gradient(90deg, " + accent + " 0%, #4f46e5 100%)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 20px " + accent + "44",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 28px " + accent + "66"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = "0 4px 20px " + accent + "44"; }}
          >
            {loading ? "Signing in…" : <><span>Sign in to Portal</span><ArrowRight size={15} /></>}
          </button>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link
              to="/login"
              style={{ fontSize: 12, color: T.muted, textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.color = accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}
            >
              ProPhone admin? Sign in here
            </Link>
          </div>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: T.muted, letterSpacing: "0.1em", opacity: 0.5 }}>
            GENIUSAI · PROPHONE SUITE
          </div>
        </div>
      </div>
    </div>
  );
}
