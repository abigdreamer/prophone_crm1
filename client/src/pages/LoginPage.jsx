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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
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

  const themeAccent = T.accent || "#6366f1";
  const themeBlue   = T.blue   || "#38bdf8";

  // FIX: Identify if the current theme configuration behaves as a light background variant
  const isLightTheme = T.bg === "#f1f5f9" || T.text === "#0f172a" || T.surface === "#ffffff";

  // Dynamic Contrast Maps specifically protecting text readabilities inside left workspace container
  const promoPanelBg   = isLightTheme ? T.card : T.navBg;
  const promoPanelText = isLightTheme ? T.text : (T.navText || "#ffffff");
  const promoPanelDim  = isLightTheme ? T.dim  : (T.navDim  || "rgba(255,255,255,0.7)");
  const promoPanelMute = isLightTheme ? T.muted: (T.navMuted || "rgba(255,255,255,0.45)");
  const promoBorder    = isLightTheme ? T.border : (T.navBorder || T.border);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      background: `radial-gradient(circle at 50% 50%, ${themeAccent}12 0%, ${T.bg} 100%)`,
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "24px 16px" : "40px 60px",
      transition: "background 0.2s ease",
    }}>
      
      <style>{`
        .team-scroll-container::-webkit-scrollbar {
          width: 5px;
        }
        .team-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .team-scroll-container::-webkit-scrollbar-thumb {
          background: ${T.borderHi}cc;
          border-radius: 10px;
        }
        .team-scroll-container::-webkit-scrollbar-thumb:hover {
          background: ${themeAccent};
        }
      `}</style>

      {/* Main UI Canvas Card Layout Box */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 1320, 
        minHeight: isMobile ? "auto" : 840,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: T.surface,
        boxShadow: T.shadowLg || "0 24px 48px rgba(0,0,0,0.15)",
        border: "1px solid " + T.border,
        transition: "background-color 0.2s ease, border-color 0.2s ease",
       }}>

        {/* LEFT BRAND PROMO PANEL */}
        {!isMobile && (
          <div style={{
            width: "44%",
            flexShrink: 0,
            background: promoPanelBg,
            borderRight: "1px solid " + promoBorder,
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            transition: "background-color 0.2s ease, border-color 0.2s ease",
          }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: themeAccent + "12", filter: "blur(90px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, right: -40, width: 260, height: 260, borderRadius: "50%", background: themeBlue + "06", filter: "blur(80px)", pointerEvents: "none" }} />

            {/* Powered Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48, position: "relative" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: themeAccent, boxShadow: `0 0 10px ${themeAccent}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: promoPanelMute, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Powered by GeniusAI
              </span>
            </div>

            {/* Brand Logo Title Headers */}
            <div style={{ position: "relative", marginBottom: 44 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `linear-gradient(135deg, ${themeAccent} 0%, ${themeBlue} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 12px 28px ${themeAccent}25`,
                marginBottom: 20,
              }}>
                <Phone size={26} color="#fff" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: promoPanelText, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 6px 0" }}>
                ProPhone CRM
              </h1>
              <div style={{ fontSize: 11, fontWeight: 700, color: promoPanelDim, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Towing &amp; Roadside Sales Suite
              </div>
            </div>

            {/* Platform Feature Loop */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40, position: "relative" }}>
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isLightTheme ? T.bg : T.surface, border: "1px solid " + T.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 2,
                  }}>
                    <Icon size={16} color={themeAccent} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: promoPanelText, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, color: promoPanelMute, lineHeight: 1.45 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform Highlights Component Block */}
            <div style={{
              marginTop: "auto", position: "relative",
              background: isLightTheme ? T.bg : T.surface, 
              border: "1px solid " + T.border,
              borderRadius: 16, padding: "20px 24px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {STATS.map(({ icon: Icon, value, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: themeAccent + "14",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={14} color={themeAccent} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: promoPanelText }}>{value}</div>
                      <div style={{ fontSize: 11, color: promoPanelMute }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT INPUT & MANIPULATION FORM PANEL */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: T.surface, 
          padding: isMobile ? "40px 20px" : "56px 80px",
          transition: "background-color 0.2s ease",
        }}>
          <div style={{ width: "100%", maxWidth: 440 }}>

            {isMobile && (
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                  background: `linear-gradient(135deg, ${themeAccent} 0%, ${themeBlue} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 8px 24px ${themeAccent}35`,
                }}>
                  <Phone size={26} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: T.text }}>ProPhone CRM</div>
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: themeAccent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
                Welcome back
              </div>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: T.text, margin: "0 0 6px 0", letterSpacing: "-0.03em" }}>
                Sign in to continue
              </h2>
              <p style={{ fontSize: 13, color: T.dim, margin: 0 }}>
                Access your ProPhone workspace
              </p>
            </div>

            {/* Dynamic Scalable Scroll Directory for >7 Active Team Profiles */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: 10 
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Quick Select Team ({USERS_DB.length})
                </div>
                {USERS_DB.length > 4 && (
                  <span style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>
                    Scroll to view all
                  </span>
                )}
              </div>

              <div 
                className="team-scroll-container"
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  gap: 10,
                  maxHeight: 145, 
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {USERS_DB.map((u) => {
                  const active = email === u.email;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setEmail(u.email)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: active ? themeAccent + "18" : T.card,
                        border: "1px solid " + (active ? themeAccent : T.border),
                        borderRadius: 12, cursor: "pointer", position: "relative",
                        transition: "all 0.15s ease",
                        textAlign: "left",
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                    >
                      <Avatar user={u} size={26} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.name.split(" ")[0]}
                        </div>
                        <div style={{ fontSize: 10, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.role || "Staff"}
                        </div>
                      </div>
                      {active && (
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%",
                          background: themeAccent,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: `0 0 6px ${themeAccent}aa`,
                          flexShrink: 0,
                        }}>
                          <Check size={8} color="#fff" strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: "0.12em" }}>OR ENTER MANUALLY</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            {/* Manual Form Fields Layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, display: "block", marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="you@example.com"
                  style={{
                    width: "100%", padding: "12px 14px", boxSizing: "border-box",
                    background: T.card, border: "1px solid " + T.border,
                    borderRadius: 12, color: T.text, fontSize: 13,
                    outline: "none", fontFamily: "inherit", transition: "all 0.2s ease",
                  }}
                  onFocus={e => { e.target.style.borderColor = themeAccent; e.target.style.boxShadow = `0 0 0 3px ${themeAccent}25`; }}
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
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "12px 42px 12px 14px", boxSizing: "border-box",
                      background: T.card, border: "1px solid " + T.border,
                      borderRadius: 12, color: T.text, fontSize: 13,
                      outline: "none", fontFamily: "inherit", transition: "all 0.2s ease",
                    }}
                    onFocus={e => { e.target.style.borderColor = themeAccent; e.target.style.boxShadow = `0 0 0 3px ${themeAccent}25`; }}
                    onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
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
                marginTop: 16, padding: "11px 14px", borderRadius: 12,
                background: T.red + "15", border: "1px solid " + T.red + "40",
                color: T.red, fontSize: 12, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%", marginTop: 24, padding: "14px 0",
                borderRadius: 12, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? themeAccent + "80" : themeAccent,
                color: "#FFFFFF", fontWeight: 700, fontSize: 14,
                display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                boxShadow: loading ? "none" : `0 8px 24px ${themeAccent}35`,
                transition: "all 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : <><span>Sign in</span><ArrowRight size={15} /></>}
            </button>

            <div style={{ marginTop: 32, textAlign: "center", fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              GeniusAI · ProPhone Suite
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}