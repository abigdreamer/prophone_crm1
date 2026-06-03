import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { loginUser } from "../services/api";
import { identifyUser, analytics } from "../services/analytics";
import {
  Check, Eye, EyeOff, ArrowRight, Phone,
  Users, TrendingUp, Mail, BarChart2, Zap, Shield,
  PhoneCall, Clock, Star,
} from "lucide-react";

const FEATURES = [
  { icon: Users,      label: "Smart Contact Management",  desc: "Organize leads, clients & prospects in one place"    },
  { icon: TrendingUp, label: "Lead Pipeline Tracking",    desc: "Track every stage from prospect to closed customer"   },
  { icon: Mail,       label: "Email Campaigns",           desc: "Send targeted campaigns with real-time open tracking" },
  { icon: BarChart2,  label: "Live Analytics & Reports",  desc: "Dashboards built for towing & roadside sales teams"   },
  { icon: Zap,        label: "Activity Automation",       desc: "Auto-log calls, emails, and stage changes instantly"  },
  { icon: Shield,     label: "Role-Based Access",         desc: "Admins, managers, and reps — each with the right view"},
];

const STATS = [
  { icon: PhoneCall, value: "6 Stages",   label: "Lead Pipeline"      },
  { icon: Clock,     value: "Real-time",  label: "Activity Tracking"  },
  { icon: Star,      value: "Multi-user", label: "Team Roles & Access"},
  { icon: Mail,      value: "Built-in",   label: "Email Campaigns"    },
];

export default function LoginPage({ onLogin }) {
  const T = useTheme();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("mike@geniusai.biz");
  const [password, setPassword] = useState("123456");
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
    setError("");
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (user) {
        identifyUser(user);
        analytics.signedIn(user);
        onLogin(user);
        navigate("/contacts", { replace: true });
      } else {
        setError("Invalid credentials. Check your email and password.");
      }
    } catch {
      setError("Connection error. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      background: "#fff",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "20px 16px" : "40px 32px",
    }}>
      {/* Centered card container */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 1120,
        minHeight: isMobile ? "auto" : 700,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: T.shadowLg + ", 0 0 0 1px " + T.border,
      }}>

      {/* LEFT PROMO PANEL */}
      {!isMobile && (
        <div style={{
          width: "42%",
          flexShrink: 0,
          background: T.navBg,
          borderRight: "1px solid " + T.border,
          padding: "56px 52px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: T.accent + "12", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 80, right: -40, width: 240, height: 240, borderRadius: "50%", background: T.accent + "08", filter: "blur(70px)", pointerEvents: "none" }} />

          {/* Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 44, position: "relative" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, boxShadow: "0 0 6px " + T.accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: T.navMuted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Powered by GeniusAI
            </span>
          </div>

          {/* Brand */}
          <div style={{ position: "relative", marginBottom: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: "linear-gradient(135deg, " + T.accent + " 0%, " + T.blue + " 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 28px " + T.accent + "44",
              marginBottom: 18,
            }}>
              <Phone size={28} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: T.navText, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 6 }}>
              ProPhone CRM
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.navMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Towing &amp; Roadside Sales Suite
            </div>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36, position: "relative" }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: T.accent + "18", border: "1px solid " + T.accent + "30",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <Icon size={14} color={T.accent} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.navText, marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: T.navMuted, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Highlights */}
          <div style={{
            marginTop: "auto", position: "relative",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.navMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              Platform Highlights
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: T.accent + "18", border: "1px solid " + T.accent + "25",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={13} color={T.accent} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.navText }}>{value}</div>
                    <div style={{ fontSize: 10, color: T.navMuted }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SIGN-IN PANEL */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.surface,
        padding: isMobile ? "32px 20px" : "64px 60px",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {isMobile && (
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: "0 auto 12px",
                background: "linear-gradient(135deg, " + T.accent + " 0%, " + T.blue + " 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px " + T.accent + "44",
              }}>
                <Phone size={24} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>ProPhone CRM</div>
            </div>
          )}

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
              Welcome back
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              Sign in to continue
            </h1>
            <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
              Access your ProPhone workspace
            </p>
          </div>

          {/* Quick Select */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Quick Select
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {USERS_DB.slice(0, 4).map((u) => {
                const active = email === u.email;
                return (
                  <button
                    key={u.id}
                    onClick={() => setEmail(u.email)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: active ? T.accent + "14" : T.card,
                      border: "1.5px solid " + (active ? T.accent + "70" : T.border),
                      borderRadius: 10, cursor: "pointer", position: "relative",
                      transition: "border-color 0.15s, background 0.15s",
                      textAlign: "left",
                    }}
                  >
                    <Avatar user={u} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? T.text : T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.name.split(" ")[0]}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted }}>{u.role || "Staff"}</div>
                    </div>
                    {active && (
                      <div style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        width: 18, height: 18, borderRadius: "50%",
                        background: T.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 8px " + T.accent + "55",
                      }}>
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: "0.1em" }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "block", marginBottom: 7, letterSpacing: "0.04em" }}>Email address</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                style={{
                  width: "100%", padding: "12px 14px", boxSizing: "border-box",
                  background: T.bg, border: "1.5px solid " + T.border,
                  borderRadius: 10, color: T.text, fontSize: 13,
                  outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}20`; }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "block", marginBottom: 7, letterSpacing: "0.04em" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPass ? "text" : "password"}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{
                    width: "100%", padding: "12px 42px 12px 14px", boxSizing: "border-box",
                    background: T.bg, border: "1.5px solid " + T.border,
                    borderRadius: 10, color: T.text, fontSize: 13,
                    outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}20`; }}
                  onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
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
              marginTop: 16, padding: "11px 14px", borderRadius: 10,
              background: T.red + "12", border: "1px solid " + T.red + "35",
              color: T.red, fontSize: 12, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", marginTop: 22, padding: "14px 0",
              borderRadius: 10, border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? T.accent + "60" : T.accent,
              color: "#fff", fontWeight: 700, fontSize: 14,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
              boxShadow: loading ? "none" : `0 4px 20px ${T.accent}44`,
              transition: "box-shadow 0.15s, transform 0.1s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = `0 6px 28px ${T.accent}60`; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.boxShadow = `0 4px 20px ${T.accent}44`; e.currentTarget.style.transform = "translateY(0)"; } }}
          >
            {loading ? "Signing in…" : <><span>Sign in</span><ArrowRight size={15} /></>}
          </button>

          <div style={{ marginTop: 28, textAlign: "center", fontSize: 10, color: T.muted, letterSpacing: "0.12em", opacity: 0.4, textTransform: "uppercase" }}>
            GeniusAI · ProPhone Suite
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
