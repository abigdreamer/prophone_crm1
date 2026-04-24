import { useState, useRef, useEffect } from "react";
import { Truck, CheckCircle2, ChevronDown, Eye, EyeOff } from "lucide-react";
import Avatar from "./ui/Avatar";
import { loginUser, getQuickUsers } from "../api/auth.api";
import { Spinner } from "./ui/Loader";

const HIGHLIGHTS = [
  "Track every lead from first call to closed deal",
  "Built for towing & trucking teams",
  "All activity logged in one place",
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
    <div ref={ref} style={{ position: "relative", marginBottom: 16 }}>
      <label style={styles.label}>Quick login</label>

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...styles.dropdownTrigger,
          background: open ? "#f0f7ff" : "#fff",
          borderColor: open ? "#1a3560" : "#e2e8f0",
          boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.1)" : "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {selected && <Avatar user={selected} size={22} />}
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
            {selected?.name}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{selected?.role}</div>
        </div>
        <ChevronDown
          size={15}
          color="#1a3560"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div style={styles.dropdownPanel}>
          <div style={styles.dropdownHeading}>Select an account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {users.map((u) => {
              const isActive = u.email === selectedEmail;
              return (
                <button
                  key={u.id}
                  onClick={() => { onSelect(u.email); setOpen(false); }}
                  style={{
                    ...styles.dropdownItem,
                    background: isActive ? "#1a3560" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f1f5f9"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <Avatar user={u} size={28} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#fff" : "#1e293b" }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.65)" : "#94a3b8", marginTop: 1 }}>
                      {u.role}
                    </div>
                  </div>
                  {isActive && <CheckCircle2 size={14} color="#fff" />}
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
  const [quickUsers, setQuickUsers] = useState([]);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("123456");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [pwFocus,  setPwFocus]  = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [emFocus,  setEmFocus]  = useState(false);

  useEffect(() => {
    getQuickUsers()
      .then(users => {
        setQuickUsers(users);
        if (users.length > 0 && !email) setEmail(users[0].email);
      })
      .catch(() => {}); // silent — login still works manually
  }, []);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError("Incorrect email or password. Please try again.");
      }
    } catch {
      setError("Unable to connect. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .lr { display: flex; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; background: #fff; }
        .ll { width: 420px; flex-shrink: 0; background: #1a3560; display: flex; flex-direction: column; justify-content: center; padding: 60px 48px; position: relative; overflow: hidden; }
        .ll::after { content: ''; position: absolute; bottom: -120px; right: -120px; width: 380px; height: 380px; border-radius: 50%; background: rgba(255,255,255,0.06); pointer-events: none; }
        .ll::before { content: ''; position: absolute; top: -80px; left: -80px; width: 260px; height: 260px; border-radius: 50%; background: rgba(255,255,255,0.05); pointer-events: none; }
        .lright { flex: 1; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 40px 32px; }
        .lcard { width: 100%; max-width: 400px; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 36px 36px; box-shadow: 0 4px 24px rgba(15,23,42,0.07); }
        @media(max-width: 720px) { .ll { display: none; } .lright { background: #fff; padding: 24px 20px; } .lcard { box-shadow: none; border: none; padding: 0; } }
      `}</style>

      <div className="lr">
        {/* LEFT PANEL */}
        <div className="ll">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Truck size={20} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                Prophone
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>
                CRM Suite
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{
              fontSize: 30, fontWeight: 700, color: "#fff",
              lineHeight: 1.2, letterSpacing: "-0.03em",
              margin: "0 0 12px",
            }}>
              Your sales pipeline,<br />always moving.
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: "0 0 40px" }}>
              The CRM built for towing & trucking teams — simple, fast, and clutter-free.
            </p>

            {/* Bullets */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {HIGHLIGHTS.map((text) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 56, position: "relative", zIndex: 1 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>All systems operational</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lright">
          <div className="lcard">
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                Sign in
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                Select an account below or enter your credentials
              </p>
            </div>

            {quickUsers.length > 0 && (
              <QuickLoginDropdown
                users={quickUsers}
                selectedEmail={email}
                onSelect={(e) => {
                  setEmail(e);
                  setPassword("");
                }}
              />
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
              <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>or type manually</span>
              <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Email address</label>
              <input
                style={{
                  ...styles.input,
                  borderColor: emFocus ? "#1a3560" : "#e2e8f0",
                  boxShadow: emFocus ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                }}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@prophone.io"
                onFocus={() => setEmFocus(true)}
                onBlur={() => setEmFocus(false)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={styles.label}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{
                    ...styles.input,
                    borderColor: pwFocus ? "#1a3560" : "#e2e8f0",
                    boxShadow: pwFocus ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                    paddingRight: 40,
                  }}
                  type={pwVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setPwVisible(v => !v)}
                  style={{
                    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    color: "#94a3b8", display: "flex", alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#475569"}
                  onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                >
                  {pwVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                fontSize: 12,
                color: "#ef4444",
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                ...styles.btn,
                background: loading ? "#e2e8f0" : "#1a3560",
                color: loading ? "#94a3b8" : "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#1a42a8"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#1a3560"; }}
            >
              {loading ? (
                <><Spinner size={14} color="#94a3b8" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </button>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#cbd5e1" }}>
              Prophone · ProPhone Suite
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    color: "#0f172a",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s",
  },
  dropdownTrigger: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    border: "1.5px solid",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  dropdownPanel: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
    zIndex: 50,
    padding: 8,
  },
  dropdownHeading: {
    fontSize: 10,
    fontWeight: 600,
    color: "#cbd5e1",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    marginBottom: 6,
    paddingLeft: 4,
  },
  dropdownItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.1s",
  },
};
