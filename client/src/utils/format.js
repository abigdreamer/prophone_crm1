// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = {
  date: iso => iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—",

  ago: iso => {
    if (!iso) return "never";
    const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (secs < 60)   return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60)   return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs  = Math.floor(mins / 60);
    if (hrs  < 24)   return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)    return `${days} day${days === 1 ? "" : "s"} ago`;
    const wks  = Math.floor(days / 7);
    if (wks  < 5)    return `${wks} week${wks === 1 ? "" : "s"} ago`;
    const mos  = Math.floor(days / 30);
    if (mos  < 12)   return `${mos} month${mos === 1 ? "" : "s"} ago`;
    const yrs  = Math.floor(days / 365);
    return `${yrs} year${yrs === 1 ? "" : "s"} ago`;
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
