import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, Eye, Users, Zap, RefreshCw, AlertCircle, X,
  Mail, Download, ChevronLeft, ChevronRight, Search, MapPin,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import {
  getClientAnalytics, getClientCharts, getClientEventDetailById,
} from "../services/posthogReports";
import { getFoxtowNewsletterSubscribers } from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 0 || diff < 10000) return "just now";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function absTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${m} ${ampm}`;
}

function shortUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "/" : u.pathname.replace(/\/$/, "");
    return u.origin + path;
  } catch { return url; }
}

const DATE_RANGES = [
  { label: "Today", id: "today" },
  { label: "Yesterday", id: "yesterday" },
  { label: "Last hour", id: "last_hour" },
  { label: "Last 24 hours", id: "last_24h" },
  { label: "Last 7 days", id: "last_7d" },
  { label: "Last 14 days", id: "last_14d" },
  { label: "Last 30 days", id: "last_30d" },
  { label: "Last 90 days", id: "last_90d" },
  { label: "Last 180 days", id: "last_180d" },
  { label: "Last week", id: "last_week" },
  { label: "Last month", id: "last_month" },
  { label: "This week", id: "this_week" },
  { label: "This month", id: "this_month" },
  { label: "Year to date", id: "year_to_date" },
  { label: "All time", id: "all_time" },
];

const SIDEBAR_W = 200;
const SIDEBAR_COLLAPSED_W = 52;

const NAV_ITEMS = [
  { id: "posthog", label: "PostHog", Icon: BarChart2 },
  { id: "newsletter", label: "Newsletter", Icon: Mail },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ T, icon: Icon, label, value, color, loading }) {
  return (
    <div style={{
      flex: "1 1 180px", minWidth: 0,
      background: T.surface, border: "1px solid " + T.border,
      borderRadius: 14, padding: "22px 24px",
      display: "flex", alignItems: "flex-start", gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11, flexShrink: 0,
        background: color + "18", border: "1px solid " + color + "35",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {label}
        </div>
        {loading ? (
          <div style={{ width: 56, height: 28, borderRadius: 6, background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite" }} />
        ) : (
          <div style={{ fontSize: 30, fontWeight: 800, color: T.text, lineHeight: 1 }}>
            {(value ?? 0).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Event Chip ───────────────────────────────────────────────────────────────
function EventChip({ T, name }) {
  const isPage = name === "$pageview" || name === "$pageleave";
  const color = isPage ? T.blue : T.accent;
  return (
    <span style={{
      display: "inline-block", maxWidth: 220,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      background: color + "14", color, border: "1px solid " + color + "30",
      borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600,
    }}>
      {name}
    </span>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ T, message }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      background: T.red + "10", border: "1px solid " + T.red + "35",
      borderRadius: 12, padding: "14px 18px",
    }}>
      <AlertCircle size={17} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, color: T.text, fontSize: 13, marginBottom: 3 }}>PostHog error</div>
        <div style={{ fontSize: 12, color: T.dim }}>{message}</div>
      </div>
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────
function TableSkeleton({ T, cols = 4 }) {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid " + T.border }}>
          {[...Array(cols)].map((__, j) => (
            <td key={j} style={{ padding: "13px 18px" }}>
              <div style={{
                width: [160, 240, 140, 80][j] || 120, height: j === 0 ? 20 : 14,
                borderRadius: 5, background: T.border,
                animation: "ph-pulse 1.4s ease-in-out infinite",
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventModal({ T, clientId, eventRow, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventRow?.id) return;
    setLoading(true); setError(null); setDetail(null);
    getClientEventDetailById(eventRow.id, clientId)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [clientId, eventRow?.id]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const props = detail?.properties || {};
  const allProps = Object.entries(props).sort(([a], [b]) => a.localeCompare(b));
  const color = eventRow?.event === "$pageview" || eventRow?.event === "$pageleave" ? T.blue : T.accent;

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 16, width: "100%", maxWidth: 600,
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid " + T.border, flexShrink: 0,
        }}>
          <span style={{ background: color + "14", color, border: "1px solid " + color + "30", borderRadius: 7, padding: "4px 11px", fontSize: 13, fontWeight: 700 }}>
            {eventRow?.event}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, borderRadius: 6 }}>
            <X size={17} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[240, 180, 300, 160, 220].map((w, i) => (
                <div key={i} style={{ height: 13, width: w, borderRadius: 5, background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite" }} />
              ))}
            </div>
          )}
          {error && <div style={{ color: T.red, fontSize: 13 }}>{error}</div>}
          {!loading && !error && detail && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", background: T.panel, borderRadius: 10, padding: "14px 16px" }}>
                {[
                  { label: "Time", value: absTime(detail.timestamp) },
                  { label: "Ago", value: relTime(detail.timestamp) },
                  { label: "Person", value: detail.distinct_id, span: true },
                  props.$current_url ? { label: "URL", value: props.$current_url, link: true, span: true } : null,
                ].filter(Boolean).map(({ label, value, link, span }) => (
                  <div key={label} style={{ gridColumn: span ? "1 / -1" : undefined }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                    {link ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.blue, wordBreak: "break-all", textDecoration: "none" }}>{value}</a>
                    ) : (
                      <div style={{ fontSize: 12, color: T.text, wordBreak: "break-all", fontFamily: "monospace" }}>{value || "—"}</div>
                    )}
                  </div>
                ))}
              </div>
              {allProps.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Properties</div>
                  <div style={{ borderRadius: 10, border: "1px solid " + T.border, overflow: "hidden" }}>
                    {allProps.map(([key, val], i) => (
                      <div key={key} style={{
                        display: "grid", gridTemplateColumns: "200px 1fr", gap: 12,
                        padding: "8px 14px",
                        borderBottom: i < allProps.length - 1 ? "1px solid " + T.border : "none",
                        background: i % 2 === 0 ? T.panel : "transparent",
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontFamily: "monospace", wordBreak: "break-word" }}>{key}</span>
                        <span style={{ fontSize: 12, color: T.dim, fontFamily: "monospace", wordBreak: "break-all" }}>
                          {typeof val === "object" ? JSON.stringify(val) : String(val ?? "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function pageBtn(T, disabled, active = false) {
  return {
    padding: "5px 10px", borderRadius: 7,
    border: "1px solid " + (active ? T.accent : T.border),
    background: active ? T.accent : "transparent",
    color: active ? "#fff" : disabled ? T.muted : T.dim,
    fontSize: 12, fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? 700 : 400, minWidth: 32, textAlign: "center",
  };
}

// ─── Chart helpers ────────────────────────────────────────────────────────────
function fmtTick(t, granularity) {
  const d = new Date(t);
  if (isNaN(d)) return String(t ?? "").slice(0, 10);
  if (granularity === "hour") {
    let h = d.getHours();
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${h}${ampm}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BarRow({ T, label, value, max, accent }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <div style={{ width: 130, fontSize: 12, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={label}>{label}</div>
      <div style={{ flex: 1, background: T.border, borderRadius: 3, height: 5, overflow: "hidden" }}>
        <div style={{ width: pct + "%", background: accent, height: "100%", borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ width: 38, fontSize: 12, fontWeight: 700, color: T.text, textAlign: "right", flexShrink: 0 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function PanelCard({ T, title, icon: Icon, children }) {
  return (
    <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 8 }}>
        {Icon && <Icon size={14} color={T.muted} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div style={{ padding: "8px 18px 14px" }}>{children}</div>
    </div>
  );
}

function ChartSkeleton({ T }) {
  const heights = [40, 65, 30, 80, 50, 72, 44, 90, 35, 60, 55, 78, 25, 85, 58, 42, 70, 50, 80, 45];
  return (
    <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 3, paddingBottom: 0 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex: 1, height: h + "%", borderRadius: "3px 3px 0 0", background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite", animationDelay: i * 0.05 + "s" }} />
      ))}
    </div>
  );
}

function ListSkeleton({ T, rows = 6, twoCol = false }) {
  const items = Array.from({ length: rows });
  return (
    <div style={{ display: twoCol ? "grid" : "flex", gridTemplateColumns: twoCol ? "1fr 1fr" : undefined, flexDirection: twoCol ? undefined : "column", gap: 10, paddingTop: 6 }}>
      {items.map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 110, height: 11, borderRadius: 4, background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite" }} />
          <div style={{ width: 32, height: 11, borderRadius: 4, background: T.border, animation: "ph-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ─── PostHog Section ──────────────────────────────────────────────────────────
function PosthogSection({ T }) {
  const { clientId } = usePool();
  const [range, setRange] = useState("last_7d");
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const closeModal = useCallback(() => setSelectedEvent(null), []);

  // Stats re-fetches on page/eventFilter changes too
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true); setStatsError(null);
    getClientAnalytics(clientId, range, page, eventFilter)
      .then(s => { if (!cancelled) { setStats(s); setStatsLoading(false); } })
      .catch(err => { if (!cancelled) { setStatsError(err.message || "Failed to load analytics"); setStatsLoading(false); } });
    return () => { cancelled = true; };
  }, [clientId, range, page, eventFilter, refreshTick]);

  // Charts only re-fetch on range/client/refresh — not page or filter
  useEffect(() => {
    let cancelled = false;
    setChartsLoading(true);
    getClientCharts(clientId, range)
      .then(c => { if (!cancelled) { setCharts(c); setChartsLoading(false); } })
      .catch(() => { if (!cancelled) { setCharts(null); setChartsLoading(false); } });
    return () => { cancelled = true; };
  }, [clientId, range, refreshTick]);

  function changeRange(r) { setRange(r); setPage(1); setEventFilter(""); setStats(null); setCharts(null); }
  function changeFilter(f) { setEventFilter(f); setPage(1); }

  const rangeLabel = DATE_RANGES.find(r => r.id === range)?.label || range;
  const events = stats?.events || [];
  const eventNames = stats?.eventNames || [];
  const totalPages = stats?.totalPages || 1;
  const totalCount = stats?.filteredCount ?? stats?.totalEvents ?? 0;
  const geoMax = charts?.geography?.[0]?.n || 1;
  const pageMax = charts?.topPages?.[0]?.n || 1;
  const evtMax = charts?.topEvents?.[0]?.n || 1;
  const anyLoading = statsLoading || chartsLoading;
  const firstItem = (page - 1) * 100 + 1;
  const lastItem = Math.min(page * 100, totalCount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>Analytics</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>PostHog · {rangeLabel}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={range} onChange={e => changeRange(e.target.value)} style={{
            background: T.surface, border: "1px solid " + T.border, borderRadius: 9,
            padding: "8px 12px", color: T.text, fontSize: 13,
            fontFamily: "inherit", cursor: "pointer", outline: "none",
          }}>
            {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button onClick={() => setRefreshTick(t => t + 1)} disabled={anyLoading} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 9,
            background: T.surface, border: "1px solid " + T.border, color: T.dim,
            fontSize: 13, fontFamily: "inherit",
            cursor: anyLoading ? "not-allowed" : "pointer", opacity: anyLoading ? 0.6 : 1,
          }}>
            <RefreshCw size={13} style={{ transition: "transform 0.3s", ...(anyLoading ? { animation: "spin 1s linear infinite" } : {}) }} />
            Refresh
          </button>
        </div>
      </div>

      {statsError && <ErrorBanner T={T} message={statsError} />}

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard T={T} icon={Zap} label="Total Events" value={stats?.totalEvents} color={T.accent} loading={statsLoading} />
        <StatCard T={T} icon={Eye} label="Page Views" value={stats?.pageViews} color={T.blue} loading={statsLoading} />
        <StatCard T={T} icon={Users} label="Active Users" value={stats?.activeUsers} color={T.green} loading={statsLoading} />
      </div>

      {/* Events Over Time */}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, padding: "18px 20px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Events Over Time</div>
        {chartsLoading ? (
          <ChartSkeleton T={T} />
        ) : !charts?.timeSeries?.length ? (
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={charts.timeSeries} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={t => fmtTick(t, charts.granularity)}
                tick={{ fill: T.muted, fontSize: 11 }}
                tickLine={false} axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: T.muted, fontSize: 11 }}
                tickLine={false} axisLine={false}
                width={36}
                tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}
              />
              <Tooltip
                cursor={{ stroke: T.border, strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 9, padding: "9px 13px", boxShadow: "0 8px 24px rgba(0,0,0,0.22)", fontSize: 12 }}>
                      <div style={{ color: T.muted, marginBottom: 4, fontSize: 11 }}>{fmtTick(label, charts.granularity)}</div>
                      <div style={{ fontWeight: 700, color: T.text }}>{Number(payload[0].value).toLocaleString()} events</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="n" stroke={T.accent} strokeWidth={2} fill="url(#gEvents)" dot={false} activeDot={{ r: 4, fill: T.accent, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Geography + Top Pages */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <PanelCard T={T} title="Top Countries" icon={MapPin}>
          {chartsLoading ? <ListSkeleton T={T} /> :
            !charts?.geography?.length
              ? <div style={{ fontSize: 12, color: T.muted, padding: "16px 0" }}>No geography data yet</div>
              : charts.geography.map(g => (
                <BarRow key={g.country} T={T} label={g.country} value={g.n} max={geoMax} accent={T.blue} />
              ))
          }
        </PanelCard>

        <PanelCard T={T} title="Top Pages" icon={Eye}>
          {chartsLoading ? <ListSkeleton T={T} /> :
            !charts?.topPages?.length
              ? <div style={{ fontSize: 12, color: T.muted, padding: "16px 0" }}>No page view data</div>
              : charts.topPages.map(p => (
                <BarRow key={p.url} T={T} label={shortUrl(p.url) || p.url} value={p.n} max={pageMax} accent={T.accent} />
              ))
          }
        </PanelCard>
      </div>

      {/* Event Breakdown */}
      <PanelCard T={T} title="Event Breakdown" icon={BarChart2}>
        {chartsLoading ? <ListSkeleton T={T} rows={6} twoCol /> :
          !charts?.topEvents?.length
            ? <div style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>No events</div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                {charts.topEvents.map(e => (
                  <BarRow key={e.event} T={T} label={e.event} value={e.n} max={evtMax} accent={T.green} />
                ))}
              </div>
            )
        }
      </PanelCard>

      {/* All Events — paginated + filterable */}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>All Events</span>
            {!statsLoading && totalCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: T.accent + "12", border: "1px solid " + T.accent + "28", borderRadius: 6, padding: "2px 8px" }}>
                {totalCount.toLocaleString()}
              </span>
            )}
          </div>
          <select value={eventFilter} onChange={e => changeFilter(e.target.value)} style={{
            background: T.surface, border: "1px solid " + T.border, borderRadius: 8,
            padding: "6px 12px", color: eventFilter ? T.text : T.muted,
            fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer", maxWidth: 240,
          }}>
            <option value="">All event types</option>
            {eventNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        <div style={{ overflowX: "auto", maxHeight: 520 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Event", "URL", "Location", "Person", "Time"].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 16px", textAlign: "left",
                    fontSize: 10, fontWeight: 700, color: T.muted,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: "1px solid " + T.border,
                    background: T.panel, position: "sticky", top: 0, zIndex: 1,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statsLoading && <TableSkeleton T={T} cols={5} />}
              {!statsLoading && events.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "44px 24px", textAlign: "center" }}>
                    <BarChart2 size={28} color={T.muted} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.dim, marginBottom: 4 }}>No events found</div>
                    <div style={{ fontSize: 12, color: T.muted }}>Try a different date range or event filter.</div>
                  </td>
                </tr>
              )}
              {!statsLoading && events.map((e, i) => {
                const loc = [e.properties?.city, e.properties?.country].filter(Boolean).join(", ");
                return (
                  <tr key={e.id || i}
                    onClick={() => setSelectedEvent(e)}
                    style={{ borderBottom: i < events.length - 1 ? "1px solid " + T.border : "none", cursor: "pointer" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = T.panel)}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 16px", verticalAlign: "middle" }}><EventChip T={T} name={e.event} /></td>
                    <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.dim, fontSize: 11 }}>
                        {shortUrl(e.properties?.url) || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", verticalAlign: "middle", fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{loc || "—"}</td>
                    <td style={{ padding: "10px 16px", verticalAlign: "middle" }}>
                      <span style={{ display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.muted, fontSize: 11 }} title={e.distinct_id}>
                        {e.distinct_id?.includes("@") ? e.distinct_id : (e.distinct_id?.slice(0, 14) + "…")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", verticalAlign: "middle", fontSize: 11, color: T.dim, whiteSpace: "nowrap" }} title={absTime(e.timestamp)}>
                      {relTime(e.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!statsLoading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid " + T.border }}>
            <span style={{ fontSize: 12, color: T.muted }}>
              {firstItem.toLocaleString()}–{lastItem.toLocaleString()} of {totalCount.toLocaleString()} events
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={pageBtn(T, page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(T, page === 1)}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                .map((n, i) => n === "…"
                  ? <span key={"g" + i} style={{ padding: "0 4px", color: T.muted, fontSize: 12 }}>…</span>
                  : <button key={n} onClick={() => setPage(n)} style={pageBtn(T, false, n === page)}>{n}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(T, page === totalPages)}>Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pageBtn(T, page === totalPages)}>»</button>
            </div>
          </div>
        )}
        {!statsLoading && totalPages === 1 && totalCount > 0 && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid " + T.border }}>
            <span style={{ fontSize: 12, color: T.muted }}>{totalCount.toLocaleString()} event{totalCount !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {selectedEvent && <EventModal T={T} clientId={clientId} eventRow={selectedEvent} onClose={closeModal} />}
    </div>
  );
}

// ─── Newsletter Section ───────────────────────────────────────────────────────
function NewsletterSection({ T }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const LIMIT = 50;

  const isActive = (s) => s.is_active === true;

  function load(opts = {}) {
    const isRefresh = opts.refresh || false;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const activeParam = statusFilter === "inactive" ? false : true;

    getFoxtowNewsletterSubscribers({
      active: activeParam,
      page,
      limit: LIMIT,
    })
      .then(res => setData(res))
      .catch(err => setError(err.message || "Failed to load subscribers"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    load();
  }, [page, statusFilter]);

  const rawSubscribers = data?.subscribers || data?.data || [];
  const totalAll = data?.total ?? data?.count ?? rawSubscribers.length;
  const totalPages = Math.max(1, Math.ceil(totalAll / LIMIT));

  const filtered = rawSubscribers.filter(s => {
    const isActiveUser = isActive(s);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActiveUser) ||
      (statusFilter === "inactive" && !isActiveUser);

    const q = search.toLowerCase();
    const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || "";
    const email = s.email || "";

    const matchSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q);

    return matchStatus && matchSearch;
  });

  const totalActive = rawSubscribers.filter(isActive).length;
  const totalInactive = rawSubscribers.filter(s => !isActive(s)).length;

  function exportCSV() {
    if (!filtered.length) return;

    const keys = Object.keys(filtered[0]).filter(k => !k.startsWith("_"));

    const rows = [
      keys.join(","),
      ...filtered.map(s =>
        keys.map(k => {
          const v = String(s[k] ?? "").replace(/"/g, '""');
          return v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v}"`
            : v;
        }).join(",")
      ),
    ];

    const blob = new Blob(["﻿" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function fmtDate(val) {
    if (!val) return "—";

    const d = new Date(val);

    if (isNaN(d)) return val;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blue + "18", border: "1px solid " + T.blue + "35", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Mail size={18} color={T.blue} />
        </div>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>Newsletter</span>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Foxtow newsletter subscribers · {statusFilter}
            {!loading && totalAll > 0 && <span style={{ color: T.dim }}> · {totalAll.toLocaleString()} total</span>}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: T.red + "10", border: "1px solid " + T.red + "35", borderRadius: 12, padding: "14px 18px" }}>
          <AlertCircle size={17} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 13, marginBottom: 3 }}>Failed to load</div>
            <div style={{ fontSize: 12, color: T.dim }}>{error}</div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard T={T} icon={Mail} label="Total Subscribers" value={loading ? undefined : totalAll} color={T.blue} loading={loading} />
        <StatCard T={T} icon={Users} label="Active" value={loading ? undefined : totalActive} color={T.green} loading={loading} />
        <StatCard T={T} icon={Users} label="Inactive" value={loading ? undefined : totalInactive} color={T.red} loading={loading} />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            placeholder="Search subscribers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 9, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid " + T.border, background: T.surface, color: statusFilter === "all" ? T.muted : T.text, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: 150 }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button onClick={() => load({ refresh: true })} disabled={refreshing || loading} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: 9,
          background: T.surface, border: "1px solid " + T.border, color: T.dim, fontSize: 13,
          cursor: (refreshing || loading) ? "not-allowed" : "pointer", opacity: (refreshing || loading) ? 0.6 : 1,
        }}>
          <RefreshCw size={13} style={{ transform: (refreshing || loading) ? "rotate(180deg)" : "none", transition: "0.3s" }} />
          Refresh
        </button>

        <button onClick={exportCSV} disabled={!filtered.length} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: 9,
          background: filtered.length ? T.green + "18" : "transparent",
          border: "1px solid " + (filtered.length ? T.green + "35" : T.border),
          color: filtered.length ? T.green : T.muted,
          fontSize: 13, fontWeight: 600,
          cursor: filtered.length ? "pointer" : "not-allowed",
        }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Subscribers</span>

          {!loading && filtered.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: T.blue, background: T.blue + "12", border: "1px solid " + T.blue + "28", borderRadius: 6, padding: "3px 9px" }}>
              {filtered.length.toLocaleString()}{filtered.length !== totalAll ? ` of ${totalAll.toLocaleString()}` : ""} total
            </span>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Name", "Email", "Status", "Subscribed"].map((h, i) => (
                  <th key={i} style={{ padding: "9px 18px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", borderBottom: "1px solid " + T.border, background: T.panel }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && <TableSkeleton T={T} cols={4} />}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "52px 24px", textAlign: "center" }}>
                    <Mail size={30} color={T.muted} style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.dim, marginBottom: 6 }}>
                      No subscribers found
                    </div>
                    {(search || statusFilter !== "all") && (
                      <div style={{ fontSize: 12, color: T.muted }}>
                        Try adjusting your search or filter.
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {!loading && filtered.map((s, i) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || "—";
                const email = s.email || "—";

                const isActive = s.is_active === true;

                const joinedDate =
                  s.created_at ||
                  s.subscribed_at ||
                  s.joined_at ||
                  s.createdAt;

                return (
                  <tr key={s.id || i}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid " + T.border : "none" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = T.panel)}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 18px", fontWeight: 600, color: T.text }}>{name}</td>
                    <td style={{ padding: "12px 18px", color: T.dim, fontFamily: "monospace", fontSize: 12 }}>{email}</td>
                    <td style={{ padding: "12px 18px" }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 5,
                        padding: "2px 8px",
                        textTransform: "uppercase",
                        background: isActive ? T.green + "18" : T.red + "10",
                        color: isActive ? T.green : T.red,
                        border: "1px solid " + (isActive ? T.green + "35" : T.red + "35"),
                      }}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", fontSize: 12, color: T.muted }}>
                      {fmtDate(joinedDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid " + T.border }}>
            <span style={{ fontSize: 12, color: T.muted }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(T, page === 1)}>‹ Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(T, page === totalPages)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const T = useTheme();
  const [activeSection, setActiveSection] = useState("posthog");
  const [collapsed, setCollapsed] = useState(false);

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  return (
    <div style={{ display: "flex", height: "100%", margin: "-20px", overflow: "hidden" }}>
      <style>{`
        @keyframes ph-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: sidebarW, flexShrink: 0,
        background: T.surface,
        borderRight: "1px solid " + T.border,
        transition: "width 0.2s",
        position: "relative",
        display: "flex", flexDirection: "column",
      }}>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            position: "absolute", right: -12, top: 18,
            width: 24, height: 24, borderRadius: "50%",
            border: "1px solid " + T.border,
            background: T.surface, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, color: T.dim,
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Header */}
        {!collapsed && (
          <div style={{ padding: "16px 16px 8px", borderBottom: "1px solid " + T.border + "66" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reports</div>
          </div>
        )}

        {/* Nav */}
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeSection === id;
            return (
              <button key={id} onClick={() => setActiveSection(id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "10px 0" : "9px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? T.accent + "15" : "transparent",
                color: active ? T.accent : T.dim,
                border: "none", borderRadius: 9,
                cursor: "pointer", fontWeight: active ? 700 : 500,
                fontSize: 13, transition: "0.15s",
                fontFamily: "inherit",
              }}
                title={collapsed ? label : undefined}
              >
                <Icon size={16} />
                {!collapsed && label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {activeSection === "posthog" && <PosthogSection T={T} />}
        {activeSection === "newsletter" && <NewsletterSection T={T} />}
      </div>
    </div>
  );
}
