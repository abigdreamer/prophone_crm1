import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, Eye, Users, Zap, RefreshCw, AlertCircle, X,
  Mail, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getProjectReports, getEventDetail } from "../services/posthogReports";
import { listProjects } from "../services/posthogProjects";
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
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
  { label: "Today",         id: "today"        },
  { label: "Yesterday",     id: "yesterday"    },
  { label: "Last hour",     id: "last_hour"    },
  { label: "Last 24 hours", id: "last_24h"     },
  { label: "Last 7 days",   id: "last_7d"      },
  { label: "Last 14 days",  id: "last_14d"     },
  { label: "Last 30 days",  id: "last_30d"     },
  { label: "Last 90 days",  id: "last_90d"     },
  { label: "Last 180 days", id: "last_180d"    },
  { label: "Last week",     id: "last_week"    },
  { label: "Last month",    id: "last_month"   },
  { label: "This week",     id: "this_week"    },
  { label: "This month",    id: "this_month"   },
  { label: "Year to date",  id: "year_to_date" },
  { label: "All time",      id: "all_time"     },
];

const SIDEBAR_W = 200;
const SIDEBAR_COLLAPSED_W = 52;

const NAV_ITEMS = [
  { id: "posthog",    label: "PostHog",    Icon: BarChart2 },
  { id: "newsletter", label: "Newsletter", Icon: Mail      },
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
  const isPage   = name === "$pageview" || name === "$pageleave";
  const color    = isPage ? T.blue : T.accent;
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
function EventModal({ T, project, eventRow, onClose }) {
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!eventRow?.id) return;
    setLoading(true); setError(null); setDetail(null);
    getEventDetail(project, eventRow.id)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [project, eventRow?.id]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const props    = detail?.properties || {};
  const allProps = Object.entries(props).sort(([a], [b]) => a.localeCompare(b));
  const color    = eventRow?.event === "$pageview" || eventRow?.event === "$pageleave" ? T.blue : T.accent;

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
                  { label: "Time",   value: absTime(detail.timestamp) },
                  { label: "Ago",    value: relTime(detail.timestamp) },
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

// ─── PostHog Section ──────────────────────────────────────────────────────────
function PosthogSection({ T }) {
  const [projects,      setProjects]      = useState([]);
  const [project,       setProject]       = useState("");
  const [range,         setRange]         = useState("last_7d");
  const [page,          setPage]          = useState(1);
  const [eventFilter,   setEventFilter]   = useState("");
  const [refreshTick,   setRefreshTick]   = useState(0);
  const [data,          setData]          = useState(null);
  const [error,         setError]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [lastFetch,     setLastFetch]     = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const closeModal = useCallback(() => setSelectedEvent(null), []);

  useEffect(() => {
    listProjects()
      .then(list => {
        const active = list.filter(p => !p.hidden);
        setProjects(active);
        if (active.length > 0) setProject(active[0].key);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setLoading(true); setError(null);
    getProjectReports(project, range, page, eventFilter)
      .then(result => { if (!cancelled) { setData(result); setLastFetch(new Date()); setLoading(false); } })
      .catch(err   => { if (!cancelled) { setError(err.message || "Failed to load analytics"); setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [project, range, page, eventFilter, refreshTick]);

  function switchProject(p) { if (p === project) return; setProject(p); setPage(1); setEventFilter(""); setData(null); }
  function switchRange(r)   { if (r === range) return; setRange(r); setPage(1); setData(null); }
  function switchEvent(e)   { setEventFilter(e); setPage(1); }

  const events     = data?.events     || [];
  const eventNames = data?.eventNames || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.filteredCount ?? data?.totalEvents ?? 0;
  const rangeLabel = DATE_RANGES.find(r => r.id === range)?.label || range;

  function refreshLabel() {
    if (!lastFetch) return "";
    const diff = Math.round((Date.now() - lastFetch.getTime()) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return `${diff}s ago`;
    return `${Math.round(diff / 60)}m ago`;
  }

  const firstItem = (page - 1) * 100 + 1;
  const lastItem  = Math.min(page * 100, totalCount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accent + "18", border: "1px solid " + T.accent + "35", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={18} color={T.accent} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>Reports</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>
            PostHog analytics · {rangeLabel.toLowerCase()}
            {lastFetch && <span style={{ color: T.dim }}> · refreshed {refreshLabel()}</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <select value={range} onChange={e => switchRange(e.target.value)} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 9, padding: "8px 12px", color: T.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
            {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>

          {projects.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", background: T.panel, border: "1px solid " + T.border, borderRadius: 10, padding: 4, gap: 2 }}>
              {projects.map(p => {
                const active = p.key === project;
                return (
                  <button key={p.key} onClick={() => switchProject(p.key)} style={{
                    padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    background: active ? T.accent : "transparent",
                    color: active ? "#fff" : T.dim,
                    transition: "all 0.14s",
                  }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => setRefreshTick(t => t + 1)} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 9,
            background: T.surface, border: "1px solid " + T.border,
            color: T.dim, fontSize: 13, fontFamily: "inherit",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          }}>
            <RefreshCw size={13} style={{ transform: loading ? "rotate(180deg)" : "none", transition: "0.3s" }} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner T={T} message={error} />}

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard T={T} icon={Zap}   label="Total Events" value={data?.totalEvents} color={T.accent} loading={loading} />
        <StatCard T={T} icon={Eye}   label="Page Views"   value={data?.pageViews}   color={T.blue}   loading={loading} />
        <StatCard T={T} icon={Users} label="Active Users" value={data?.activeUsers} color={T.green}  loading={loading} />
      </div>

      {/* Events table */}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>All Events</span>
            <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{rangeLabel.toLowerCase()} · filtered by project</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
            <select value={eventFilter} onChange={e => switchEvent(e.target.value)} style={{
              background: T.bg || T.surface, border: "1px solid " + T.border,
              borderRadius: 8, padding: "6px 12px",
              color: eventFilter ? T.text : T.muted, fontSize: 12, fontFamily: "inherit",
              outline: "none", cursor: "pointer", maxWidth: 220,
            }}>
              <option value="">All event types</option>
              {eventNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            {!loading && totalCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, flexShrink: 0, background: T.accent + "12", border: "1px solid " + T.accent + "28", borderRadius: 6, padding: "3px 9px" }}>
                {totalCount.toLocaleString()} events
              </span>
            )}
          </div>
        </div>

        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 560 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <colgroup>
              <col style={{ width: "22%" }} /><col style={{ width: "38%" }} />
              <col style={{ width: "22%" }} /><col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                {["Event Name", "URL / Screen", "Person", "Time"].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 18px", textAlign: "left",
                    fontSize: 10, fontWeight: 700, color: T.muted,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: "1px solid " + T.border,
                    background: T.panel, position: "sticky", top: 0, zIndex: 1,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton T={T} />}
              {!loading && events.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "52px 24px", textAlign: "center" }}>
                  <BarChart2 size={30} color={T.muted} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.dim, marginBottom: 6 }}>No events found</div>
                  <div style={{ fontSize: 12, color: T.muted }}>No events match the selected range and project.</div>
                </td></tr>
              )}
              {!loading && events.map((e, i) => (
                <tr key={e.id || i} onClick={() => setSelectedEvent(e)} style={{ borderBottom: i < events.length - 1 ? "1px solid " + T.border : "none", cursor: "pointer" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = T.panel)}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 18px", verticalAlign: "middle" }}><EventChip T={T} name={e.event} /></td>
                  <td style={{ padding: "12px 18px", verticalAlign: "middle", maxWidth: 0 }}>
                    {e.properties?.url ? (
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.dim, fontSize: 12 }} title={e.properties.url}>
                        {shortUrl(e.properties.url)}
                      </span>
                    ) : <span style={{ color: T.muted, fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 18px", verticalAlign: "middle" }}>
                    <span style={{ display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.muted, fontSize: 11 }} title={e.distinct_id}>
                      {e.distinct_id?.includes("@") ? e.distinct_id : (e.distinct_id?.slice(0, 16) + "…")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 18px", verticalAlign: "middle", whiteSpace: "nowrap" }} title={absTime(e.timestamp)}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.dim }}>{relTime(e.timestamp)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid " + T.border }}>
            <span style={{ fontSize: 12, color: T.muted }}>{firstItem.toLocaleString()}–{lastItem.toLocaleString()} of {totalCount.toLocaleString()} events</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={pageBtn(T, page === 1)}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(T, page === 1)}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                .map((n, i) => n === "…"
                  ? <span key={`g${i}`} style={{ padding: "0 4px", color: T.muted, fontSize: 12 }}>…</span>
                  : <button key={n} onClick={() => setPage(n)} style={pageBtn(T, false, n === page)}>{n}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(T, page === totalPages)}>Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pageBtn(T, page === totalPages)}>»</button>
            </div>
          </div>
        )}
        {!loading && totalPages === 1 && totalCount > 0 && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid " + T.border }}>
            <span style={{ fontSize: 12, color: T.muted }}>{totalCount.toLocaleString()} event{totalCount !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {selectedEvent && <EventModal T={T} project={project} eventRow={selectedEvent} onClose={closeModal} />}
    </div>
  );
}

// ─── Newsletter Section ───────────────────────────────────────────────────────
function NewsletterSection({ T }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [showActive,  setShowActive]  = useState(true);

  const LIMIT = 50;

  function load(opts = {}) {
    const isRefresh = opts.refresh || false;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    getFoxtowNewsletterSubscribers({ active: showActive, page, limit: LIMIT })
      .then(res => { setData(res); })
      .catch(err => setError(err.message || "Failed to load subscribers"))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, [page, showActive]);

  const subscribers = data?.subscribers || data?.data || [];
  const total       = data?.total ?? data?.count ?? subscribers.length;
  const totalPages  = Math.max(1, Math.ceil(total / LIMIT));

  function exportCSV() {
    if (!subscribers.length) return;
    const keys = Object.keys(subscribers[0]).filter(k => !k.startsWith("_"));
    const rows = [
      keys.join(","),
      ...subscribers.map(s => keys.map(k => {
        const v = String(s[k] ?? "").replace(/"/g, '""');
        return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
      }).join(",")),
    ];
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function fmtDate(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blue + "18", border: "1px solid " + T.blue + "35", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={18} color={T.blue} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>Newsletter</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>
            Foxtow newsletter subscribers · {showActive ? "active" : "all"}
            {!loading && total > 0 && <span style={{ color: T.dim }}> · {total.toLocaleString()} total</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", background: T.panel, border: "1px solid " + T.border, borderRadius: 10, padding: 4, gap: 2 }}>
            {[{ label: "Active", v: true }, { label: "All", v: false }].map(({ label, v }) => (
              <button key={label} onClick={() => { setShowActive(v); setPage(1); }} style={{
                padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: showActive === v ? 700 : 500,
                background: showActive === v ? T.blue : "transparent",
                color: showActive === v ? "#fff" : T.dim,
                transition: "all 0.14s",
              }}>{label}</button>
            ))}
          </div>
          <button onClick={() => load({ refresh: true })} disabled={refreshing || loading} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 9,
            background: T.surface, border: "1px solid " + T.border, color: T.dim, fontSize: 13, fontFamily: "inherit",
            cursor: (refreshing || loading) ? "not-allowed" : "pointer", opacity: (refreshing || loading) ? 0.6 : 1,
          }}>
            <RefreshCw size={13} style={{ transform: (refreshing || loading) ? "rotate(180deg)" : "none", transition: "0.3s" }} />
            Refresh
          </button>
          {subscribers.length > 0 && (
            <button onClick={exportCSV} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 15px", borderRadius: 9,
              background: T.green + "18", border: "1px solid " + T.green + "35", color: T.green,
              fontSize: 13, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
            }}>
              <Download size={13} /> Export CSV
            </button>
          )}
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

      {/* Stat card */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 14 }}>
          <StatCard T={T} icon={Mail}  label="Total Subscribers" value={total}                              color={T.blue}  loading={false} />
          <StatCard T={T} icon={Users} label="Active"            value={showActive ? total : undefined}     color={T.green} loading={false} />
        </div>
      )}

      {/* Table */}
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Subscribers</span>
          {!loading && total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: T.blue, background: T.blue + "12", border: "1px solid " + T.blue + "28", borderRadius: 6, padding: "3px 9px" }}>
              {total.toLocaleString()} total
            </span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Name", "Email", "Status", "Subscribed"].map((h, i) => (
                  <th key={i} style={{ padding: "9px 18px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid " + T.border, background: T.panel }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton T={T} cols={4} />}
              {!loading && !error && subscribers.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "52px 24px", textAlign: "center" }}>
                  <Mail size={30} color={T.muted} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.dim, marginBottom: 6 }}>No subscribers found</div>
                </td></tr>
              )}
              {!loading && subscribers.map((s, i) => {
                const name       = s.name || s.first_name ? [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name : "—";
                const email      = s.email || "—";
                const active     = s.active ?? s.status === "active" ?? true;
                const joinedDate = s.created_at || s.subscribed_at || s.joined_at || s.createdAt;
                return (
                  <tr key={s.id || i}
                    style={{ borderBottom: i < subscribers.length - 1 ? "1px solid " + T.border : "none" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = T.panel)}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 18px", verticalAlign: "middle", fontWeight: 600, color: T.text }}>{name}</td>
                    <td style={{ padding: "12px 18px", verticalAlign: "middle", color: T.dim, fontFamily: "monospace", fontSize: 12 }}>{email}</td>
                    <td style={{ padding: "12px 18px", verticalAlign: "middle" }}>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 700,
                        borderRadius: 5, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase",
                        background: active ? T.green + "18" : T.red + "10",
                        color: active ? T.green : T.red,
                        border: "1px solid " + (active ? T.green + "35" : T.red + "35"),
                      }}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", verticalAlign: "middle", fontSize: 12, color: T.muted }}>{fmtDate(joinedDate)}</td>
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
  const [collapsed,     setCollapsed]     = useState(false);

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  return (
    <div style={{ display: "flex", height: "100%", margin: "-20px", overflow: "hidden" }}>
      <style>{`
        @keyframes ph-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
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
        {activeSection === "posthog"    && <PosthogSection    T={T} />}
        {activeSection === "newsletter" && <NewsletterSection T={T} />}
      </div>
    </div>
  );
}
