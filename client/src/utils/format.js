// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = {
  date: iso => iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—",

  ago: iso => {
    if (!iso) return "never";
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    return d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
  },

  num: n => (n ?? 0).toLocaleString(),

  mrr: n => "$" + n.toLocaleString(),
};

export default fmt;

// "super_admin" → "Super Admin",  "manager" → "Manager"
export function fmtRole(role) {
  return (role || "")
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
