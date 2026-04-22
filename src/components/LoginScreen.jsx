import { useState, useRef, useEffect } from "react";
import {
  Truck,
  BarChart2,
  Activity,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import Avatar from "./ui/Avatar";
import USERS_DB from "../data/users";
import * as db from "../lib/db";
import { Spinner } from "./ui/Loader";

const FEATURES = [
  {
    Icon: Truck,
    title: "Built for Towing & Trucking",
    desc: "Manage prospects and client accounts across your entire fleet operation.",
  },
  {
    Icon: BarChart2,
    title: "Full Pipeline Visibility",
    desc: "Track every lead stage from first contact through to closed deal.",
  },
  {
    Icon: Activity,
    title: "Activity & Timeline Logging",
    desc: "Log calls, emails, demos, and notes — all in one chronological view.",
  },
];

function QuickLoginDropdown({ users, selectedEmail, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = users.find((u) => u.email === selectedEmail);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 10.5,
          fontWeight: 600,
          color: "#64748b",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Quick login
      </label>

      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          background: open ? "#eff6ff" : "#f8fafc",
          border: "1.5px solid " + (open ? "#3b82f6" : "#e2e8f0"),
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
          transition: "all 0.15s",
        }}
      >
        {selected && <Avatar user={selected} size={22} />}
        <div style={{ flex: 1, textAlign: "left" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            {selected?.name}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            {selected?.role}
          </div>
        </div>
        <ChevronDown
          size={15}
          color="#3b82f6"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 10px 28px rgba(15,24,41,0.11)",
            zIndex: 50,
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 8,
              paddingLeft: 2,
            }}
          >
            Select an account
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map((u) => {
              const isActive = u.email === selectedEmail;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelect(u.email);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: isActive ? "#2563eb" : "#eff6ff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#eff6ff";
                  }}
                >
                  <Avatar user={u} size={28} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isActive ? "#fff" : "#1e40af",
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isActive ? "rgba(255,255,255,0.65)" : "#60a5fa",
                        marginTop: 1,
                      }}
                    >
                      {u.role}
                    </div>
                  </div>
                  {isActive && <CheckCircle2 size={15} color="#fff" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("mike@geniusai.biz");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const user = await db.loginUser(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid credentials. Password is 'demo' for all users.");
      }
    } catch {
      setError("Connection error. Check your Supabase credentials in .env");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .lr { display:flex; min-height:100vh; font-family:'Inter',system-ui,sans-serif; }
        .ll { flex:1; background:linear-gradient(145deg, #0f2d6b 0%, #1a4db8 55%, #2563eb 100%); display:flex; flex-direction:column; justify-content:space-between; padding:48px 52px; position:relative; overflow:hidden; }
        .ll-stripe { position:absolute; top:0; right:0; bottom:0; width:1px; background:rgba(255,255,255,0.1); }
        .ll-glow { position:absolute; top:-100px; right:-100px; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 65%); pointer-events:none; }
        .ll-glow2 { position:absolute; bottom:-120px; left:-80px; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle, rgba(30,58,138,0.5) 0%, transparent 70%); pointer-events:none; }
        .lright { flex:1; display:flex; align-items:center; justify-content:center; background:#0b0c10; padding:40px 32px; }
        .lcard { width:100%; max-width:400px; background:#12151c; border:1px solid #222836; border-radius:16px; padding:36px 32px 32px; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
        .finput { width:100%; box-sizing:border-box; padding:10px 13px; background:#0f172a; border:1.5px solid #222836; border-radius:10px; font-size:13px; color:#e2e8f0; font-family:'Inter',sans-serif; outline:none; transition:all 0.15s; }
        .finput:focus { border-color:#6366f1; background:#0d1117; box-shadow:0 0 0 3px rgba(99,102,241,0.15); }
        .finput::placeholder { color:#334155; }
        .lbtn { width:100%; padding:11px; background:#6366f1; border:none; border-radius:10px; color:#fff; font-weight:600; font-size:14px; cursor:pointer; font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.15s; box-shadow:0 4px 14px rgba(99,102,241,0.35); }
        .lbtn:hover:not(:disabled) { background:#4f46e5; box-shadow:0 6px 20px rgba(99,102,241,0.45); transform:translateY(-1px); }
        .lbtn:active:not(:disabled) { transform:translateY(0); }
        .lbtn:disabled { background:#1e293b; color:#475569; cursor:not-allowed; box-shadow:none; }
        @media(max-width:720px){ .ll{display:none;} .lright{padding:24px 20px;} }
      `}</style>

      <div className="lr">
        {/* ── LEFT PANEL ── */}
        <div className="ll">
          <div className="ll-glow" />
          <div className="ll-glow2" />
          <div className="ll-stripe" />

          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Truck size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                Prophone
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                ProPhone CRM
              </div>
            </div>
          </div>

          {/* Hero */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 14,
              }}
            >
              Your sales pipeline,
              <br />
              always moving.
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.7,
                marginBottom: 40,
                maxWidth: 340,
              }}
            >
              ProPhone CRM helps towing and trucking teams track leads, manage
              client accounts, and close deals — without the clutter.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {FEATURES.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={16}
                      color="rgba(255,255,255,0.7)"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        marginBottom: 3,
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.38)",
                        lineHeight: 1.6,
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4ade80",
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              All systems operational
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lright">
          <div className="lcard">
            <div style={{ marginBottom: 26 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  letterSpacing: "-0.03em",
                  marginBottom: 5,
                }}
              >
                Sign in
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Password for all accounts is{" "}
                <span style={{ fontWeight: 600, color: "#818cf8" }}>demo</span>
              </div>
            </div>

            {/* User dropdown */}
            <QuickLoginDropdown
              users={USERS_DB}
              selectedEmail={email}
              onSelect={(e) => setEmail(e)}
            />

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "18px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
              <div style={{ fontSize: 11, color: "#334155" }}>
                or type manually
              </div>
              <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#475569",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                className="finput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@geniusai.biz"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#475569",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                className="finput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "9px 12px",
                  background: "rgba(220,38,38,0.1)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#f87171",
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button className="lbtn" onClick={handleLogin} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={14} color="rgba(255,255,255,0.5)" /> Signing in…
                </>
              ) : (
                "Sign in to workspace"
              )}
            </button>

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 11,
                color: "#1e293b",
              }}
            >
              Prophone · ProPhone Suite
            </div>
          </div>
        </div>
      </div>
    </>
  );
}