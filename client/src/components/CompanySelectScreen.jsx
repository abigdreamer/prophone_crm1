import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { listCompanies } from "../api/companies.api";
import { selectCompany } from "../api/auth.api";
import T from "../theme";

export default function CompanySelectScreen({ onSelect, onBack }) {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    listCompanies()
      .then(list => { setCompanies(list); if (list.length) setSelected(list[0].prophone_id); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleNext() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await selectCompany(selected);
      onSelect(data.user, data.token);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #f1f5f9 0%, #e8edf5 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      padding: 24,
    }}>
      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 580,
        background: "#fff",
        border: "1px solid " + T.border,
        borderRadius: 20,
        padding: "52px 56px 44px",
        boxShadow: "0 12px 60px rgba(0,0,0,0.10)",
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff",
            boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
            margin: "0 auto 20px",
          }}>P</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
            Please select the company
          </div>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 8 }}>
            Choose the company you want to manage
          </div>
        </div>

        {/* Dropdown */}
        <div style={{ position: "relative" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Company
          </label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            disabled={loading || submitting}
            style={{
              width: "100%", appearance: "none", WebkitAppearance: "none",
              background: "#fff", border: "1px solid " + T.border,
              borderRadius: 10, padding: "14px 44px 14px 16px",
              fontSize: 15, fontWeight: 500, color: T.text,
              fontFamily: "inherit", cursor: "pointer",
              outline: "none", boxSizing: "border-box",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = "0 0 0 3px " + T.accent + "20"; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}
          >
            {loading && <option value="">Loading…</option>}
            {!loading && companies.map(c => (
              <option key={c.prophone_id} value={c.prophone_id}>{c.name}</option>
            ))}
          </select>
          <div style={{ position: "absolute", right: 14, bottom: 15, pointerEvents: "none", color: T.muted }}>
            {submitting
              ? <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite", color: T.accent }} />
              : <ChevronDown size={16} />
            }
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", textAlign: "center", marginTop: -12 }}>{error}</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={onBack}
            disabled={submitting}
            style={{
              flex: 1, padding: "14px 0",
              background: T.bg, border: "1px solid " + T.border,
              borderRadius: 10, fontSize: 15, fontWeight: 600,
              color: T.muted, cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.background = T.bg}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!selected || loading || submitting}
            style={{
              flex: 1, padding: "14px 0",
              background: T.accent,
              border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 600, color: "#fff",
              cursor: !selected || loading || submitting ? "default" : "pointer",
              fontFamily: "inherit", transition: "opacity 0.12s",
              opacity: !selected || loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (selected && !loading && !submitting) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            Next
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
