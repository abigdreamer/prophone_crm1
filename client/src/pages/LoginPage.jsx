import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { loginUser } from "../services/api";
import { identifyUser, analytics } from "../services/analytics";
import {
  Eye, EyeOff, ArrowRight, Phone,
  Users, TrendingUp, Mail, BarChart2, Zap, Shield,
  PhoneCall, Clock, Star, Check,
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

const DEMO_ACCOUNTS = [
  { name: "Mike Johnson",  email: "mike@geniusai.biz",  role: "Admin"   },
  { name: "Sarah Lee",     email: "sarah@geniusai.biz", role: "Manager" },
  { name: "James Davis",   email: "james@geniusai.biz", role: "Rep"     },
  { name: "Amy Wilson",    email: "amy@geniusai.biz",   role: "Rep"     },
];
const DEMO_PASSWORD = "123456";

const AVATAR_COLORS = ["#818cf8", "#34d399", "#fb923c", "#38bdf8", "#f472b6"];

function initials(name) {
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function avatarColor(email) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function roleBadgeStyle(role) {
  const r = (role || "").toLowerCase();
  if (r === "admin")   return { color: "#818cf8", background: "#818cf820", border: "1px solid #818cf840" };
  if (r === "manager") return { color: "#34d399", background: "#34d39920", border: "1px solid #34d39940" };
  return                      { color: "#fb923c", background: "#fb923c20", border: "1px solid #fb923c40" };
}

export default function LoginPage({ onLogin }) {
  const T = useTheme();
  const navigate = useNavigate();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showPass,     setShowPass]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);
  const [quickEnabled, setQuickEnabled] = useState(false);
  const [hoveredRow,   setHoveredRow]   = useState(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "ql-fade-style";
    style.textContent = "@keyframes qlFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }";
    if (!document.getElementById("ql-fade-style")) document.head.appendChild(style);
  }, []);

  const handleLogin = useCallback(async (overrideEmail, overridePassword) => {
    const loginEmail    = overrideEmail    ?? email;
    const loginPassword = overridePassword ?? password;
    setError("");
    if (!loginEmail.trim() || !loginPassword) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const user = await loginUser(loginEmail.trim(), loginPassword);
      if (user) {
        identifyUser(user);
        analytics.signedIn(user);
        onLogin(user);
        navigate("/contacts", { replace: true });
      } else {
        setError("Invalid credentials. Check your email and password.");
        setQuickEnabled(false);
      }
    } catch {
      setError("Connection error. Make sure the API server is running.");
      setQuickEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin, navigate]);

  function handleRowClick(account) {
    if (loading) return;
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    handleLogin(account.email, DEMO_PASSWORD);
  }

  const themeAccent = T.accent || "#6366f1";
  const themeBlue   = T.blue   || "#38bdf8";
  const isLightTheme = T.bg === "#f1f5f9" || T.text === "#0f172a" || T.surface === "#ffffff";
  const promoPanelBg   = isLightTheme ? T.card   : T.navBg;
  const promoPanelText = isLightTheme ? T.text   : (T.navText   || "#ffffff");
  const promoPanelDim  = isLightTheme ? T.dim    : (T.navDim    || "rgba(255,255,255,0.7)");
  const promoPanelMute = isLightTheme ? T.muted  : (T.navMuted  || "rgba(255,255,255,0.45)");
  const promoBorder    = isLightTheme ? T.border : (T.navBorder || T.border);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      background: `radial-gradient(circle at 50% 50%, ${themeAccent}12 0%, ${T.bg} 100%)`,
      padding: isMobile ? "16px" : "20px",
      boxSizing: "border-box",
    }}>
      {/* Card */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 1200,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: T.surface,
        boxShadow: T.shadowLg || "0 24px 48px rgba(0,0,0,0.15)",
        border: "1px solid " + T.border,
      }}>

        {/* LEFT PANEL */}
        {!isMobile && (
          <div style={{
            width: "42%",
            flexShrink: 0,
            background: promoPanelBg,
            borderRight: "1px solid " + promoBorder,
            padding: "44px 48px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: themeAccent + "12", filter: "blur(80px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -30, right: -30, width: 200, height: 200, borderRadius: "50%", background: themeBlue + "08", filter: "blur(70px)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, position: "relative" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: themeAccent, boxShadow: `0 0 10px ${themeAccent}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: promoPanelMute, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Powered by GeniusAI
              </span>
            </div>

            <div style={{ position: "relative", marginBottom: 32 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `linear-gradient(135deg, ${themeAccent} 0%, ${themeBlue} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 10px 24px ${themeAccent}25`,
                marginBottom: 16,
              }}>
                <Phone size={22} color="#fff" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: promoPanelText, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 5px 0" }}>
                ProPhone CRM
              </h1>
              <div style={{ fontSize: 10, fontWeight: 700, color: promoPanelDim, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Towing &amp; Roadside Sales Suite
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, position: "relative" }}>
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: isLightTheme ? T.bg : T.surface, border: "1px solid " + T.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 1,
                  }}>
                    <Icon size={14} color={themeAccent} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: promoPanelText, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: promoPanelMute, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "auto", position: "relative",
              background: isLightTheme ? T.bg : T.surface,
              border: "1px solid " + T.border,
              borderRadius: 14, padding: "16px 20px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {STATS.map(({ icon: Icon, value, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: themeAccent + "14",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={12} color={themeAccent} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: promoPanelText }}>{value}</div>
                      <div style={{ fontSize: 10, color: promoPanelMute }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT FORM PANEL */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: T.surface,
          padding: isMobile ? "36px 24px" : "48px 64px",
        }}>
          <div style={{ width: "100%", maxWidth: 400 }}>

            {isMobile && (
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                  background: `linear-gradient(135deg, ${themeAccent} 0%, ${themeBlue} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px ${themeAccent}35`,
                }}>
                  <Phone size={22} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>ProPhone CRM</div>
              </div>
            )}

            {/* Heading — always visible */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: themeAccent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
                Welcome back
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: "0 0 5px 0", letterSpacing: "-0.03em" }}>
                Sign in to continue
              </h2>
              <p style={{ fontSize: 12, color: T.dim, margin: 0 }}>
                Access your ProPhone workspace
              </p>
            </div>

            {/* Quick Login checkbox — above the email field */}
            <button
              type="button"
              onClick={() => { setQuickEnabled(v => !v); setError(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 18,
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: "inherit",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                background: quickEnabled ? themeAccent : "transparent",
                border: `2px solid ${quickEnabled ? themeAccent : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s ease",
              }}>
                {quickEnabled && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Quick Login</span>
            </button>

            {/* Swappable area: account rows OR form fields */}
            {quickEnabled ? (
              /* ---- ACCOUNT ROWS ---- */
              <div key="quick" style={{ animation: "qlFade 0.2s ease", display: "flex", flexDirection: "column", gap: 8 }}>
                {DEMO_ACCOUNTS.map((account) => {
                  const color   = avatarColor(account.email);
                  const badge   = roleBadgeStyle(account.role);
                  const hovered = hoveredRow === account.email;
                  return (
                    <div
                      key={account.email}
                      onClick={() => handleRowClick(account)}
                      onMouseEnter={() => setHoveredRow(account.email)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 14px", borderRadius: 12,
                        background: hovered ? (themeAccent + "10") : T.card,
                        border: "1px solid " + (hovered ? themeAccent + "50" : T.border),
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: color + "22", border: `1.5px solid ${color}45`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color,
                      }}>
                        {initials(account.name)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {account.name}
                        </div>
                        <div style={{ fontSize: 11, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {account.email}
                        </div>
                      </div>

                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                        letterSpacing: "0.04em", flexShrink: 0, ...badge,
                      }}>
                        {account.role}
                      </div>
                    </div>
                  );
                })}

                {error && (
                  <div style={{
                    marginTop: 6, padding: "10px 14px", borderRadius: 10,
                    background: T.red + "15", border: "1px solid " + T.red + "40",
                    color: T.red, fontSize: 12, lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                )}

                {loading && (
                  <div style={{ textAlign: "center", fontSize: 12, color: T.dim, marginTop: 4 }}>
                    Signing in…
                  </div>
                )}
              </div>
            ) : (
              /* ---- NORMAL FORM FIELDS ---- */
              <div key="form" style={{ animation: "qlFade 0.2s ease" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "block", marginBottom: 6 }}>Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      placeholder="Enter your email"
                      autoComplete="email"
                      style={{
                        width: "100%", padding: "11px 14px", boxSizing: "border-box",
                        background: T.card, border: "1px solid " + T.border,
                        borderRadius: 10, color: T.text, fontSize: 13,
                        outline: "none", fontFamily: "inherit", transition: "all 0.2s ease",
                      }}
                      onFocus={e => { e.target.style.borderColor = themeAccent; e.target.style.boxShadow = `0 0 0 3px ${themeAccent}20`; }}
                      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "block", marginBottom: 6 }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        type={showPass ? "text" : "password"}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        style={{
                          width: "100%", padding: "11px 42px 11px 14px", boxSizing: "border-box",
                          background: T.card, border: "1px solid " + T.border,
                          borderRadius: 10, color: T.text, fontSize: 13,
                          outline: "none", fontFamily: "inherit", transition: "all 0.2s ease",
                        }}
                        onFocus={e => { e.target.style.borderColor = themeAccent; e.target.style.boxShadow = `0 0 0 3px ${themeAccent}20`; }}
                        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        style={{
                          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
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
                    marginTop: 14, padding: "10px 14px", borderRadius: 10,
                    background: T.red + "15", border: "1px solid " + T.red + "40",
                    color: T.red, fontSize: 12, lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleLogin()}
                  disabled={loading}
                  style={{
                    width: "100%", marginTop: 22, padding: "13px 0",
                    borderRadius: 10, border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? themeAccent + "80" : themeAccent,
                    color: "#FFFFFF", fontWeight: 700, fontSize: 14,
                    display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                    boxShadow: loading ? "none" : `0 8px 24px ${themeAccent}35`,
                    transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  {loading ? "Signing in…" : <><span>Sign in</span><ArrowRight size={15} /></>}
                </button>
              </div>
            )}

            <div style={{ marginTop: 28, textAlign: "center", fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              GeniusAI · ProPhone Suite
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
