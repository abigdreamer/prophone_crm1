import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const MIN_MS = 1200;

/**
 * RefreshBtn — consistent refresh button used across all pages.
 * Always shows "Refreshing…" for at least MIN_MS ms so users can tell
 * the action registered, even on fast networks.
 *
 * Props:
 *   onClick  — sync or async handler. When no `loading` prop is given the
 *              component owns the busy state internally.
 *   loading  — optional external boolean for pages that share a broader
 *              loading state (e.g. anyLoading in ReportsPage).
 *   label    — button label, default "Refresh"
 *   style    — optional style overrides
 */
export default function RefreshBtn({ onClick, loading: ext, label = "Refresh", style: sx }) {
  const T = useTheme();
  const [busy, setBusy] = useState(false);

  const isLoading = ext !== undefined ? ext : busy;

  async function handleClick() {
    if (isLoading) return;
    if (ext !== undefined) {
      onClick?.();
    } else {
      setBusy(true);
      const start = Date.now();
      try {
        await onClick?.();
      } finally {
        const elapsed = Date.now() - start;
        const remaining = MIN_MS - elapsed;
        if (remaining > 0) {
          await new Promise(r => setTimeout(r, remaining));
        }
        setBusy(false);
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 7, fontSize: 12,
        background: T.card, border: `1px solid ${T.border}`,
        color: isLoading ? T.accent : T.dim,
        cursor: isLoading ? "not-allowed" : "pointer",
        fontFamily: "inherit", fontWeight: 500,
        opacity: isLoading ? 0.85 : 1,
        transition: "color 0.15s, opacity 0.15s",
        ...sx,
      }}
    >
      <RefreshCw
        size={13}
        style={{ animation: isLoading ? "crm-spin 0.7s linear infinite" : "none", flexShrink: 0 }}
      />
      {isLoading ? "Refreshing…" : label}
    </button>
  );
}
