import { useState } from "react";
import Input from "./ui/Input";
import Avatar from "./ui/Avatar";
import T from "../theme";
import USERS_DB from "../data/users";
import * as db from "../lib/db";
import { Spinner } from "./ui/Loader";

// ─── Login / Auth screen ──────────────────────────────────────────────────────
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
    } catch (err) {
      setError(
        "Connection error. Make sure the API server is running on port 8080.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 420,
          background: T.card,
          border: "1px solid " + T.border,
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            G
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: T.text,
                letterSpacing: "-0.03em",
              }}
            >
              GeniusAI
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.muted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              PROPHONE CRM
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: T.text,
            marginBottom: 6,
          }}
        >
          Sign in
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 28 }}>
          All accounts use password:{" "}
          <span style={{ color: T.accent, fontWeight: 600 }}>demo</span>
        </div>

        {/* 2x2 Quick User Select Grid */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Quick select
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {USERS_DB.slice(0, 4).map((u) => (
              <button
                key={u.id}
                onClick={() => setEmail(u.email)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: email === u.email ? u.color + "15" : T.bg,
                  border:
                    "1px solid " + (email === u.email ? u.color : T.border),
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
              >
                <Avatar user={u} size={24} />
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: email === u.email ? T.text : T.dim,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.name.split(" ")[0]}
                  </div>
                  {/* Changed this line to use the user's actual role or email */}
                  <div style={{ fontSize: 9, color: T.muted }}>
                    {u.role || "Team Member"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="mike@geniusai.biz"
            type="email"
          />
          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="demo"
            type="password"
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: T.red + "15",
              border: "1px solid " + T.red + "40",
              borderRadius: 8,
              fontSize: 12,
              color: T.red,
              marginTop: 16,
              lineHeight: "1.4",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            marginTop: 24,
            background: loading ? T.muted : T.accent,
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: `0 4px 12px ${T.accent}40`,
          }}
        >
          {loading ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Spinner size={16} color="#fff" /> Signing in…
            </span>
          ) : (
            "Sign In →"
          )}
        </button>

        <div
          style={{
            marginTop: 24,
            fontSize: 11,
            color: T.muted,
            textAlign: "center",
            borderTop: `1px solid ${T.border}`,
            paddingTop: 16,
          }}
        >
          Part of the GeniusAI · Prophone suite
        </div>
      </div>
    </div>
  );
}
