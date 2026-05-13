import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search, RefreshCw, Mail, Users, TrendingUp,
  ExternalLink, Loader2, BarChart2, Download,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import { useClientById } from "../context/ClientsContext";
import { getFoxtowNewsletterSubscribers } from "../services/api";

const FOXTOW_CLIENT_ID = "foxtow";

const REPORT_TYPES = [
  { id: "newsletter", label: "Newsletter Subscribers", Icon: Mail,       soon: false },
  { id: "leads",      label: "Lead Report",            Icon: Users,      soon: true  },
  { id: "growth",     label: "Growth Metrics",         Icon: TrendingUp, soon: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseName(raw) {
  if (!raw) return { name: "—", company: "—", phone: "—" };
  const parts = raw.split(" · ");
  const name      = parts[0]?.trim() || "—";
  const company   = parts[1]?.trim() || "—";
  const phonePart = parts[2]?.trim() || "";
  const phone = phonePart.startsWith("Phone:")
    ? phonePart.replace("Phone:", "").trim()
    : phonePart || "—";
  return { name, company, phone };
}

function formatPhone(raw) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return raw;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
  return fmtDate(iso);
}

function thisMonthCount(list) {
  const now = new Date();
  return list.filter(s => {
    const d = new Date(s.subscribed_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

function exportToExcel(rows, filename = "foxtow-newsletter-subscribers") {
  const data = rows.map(s => {
    const { name, company, phone } = parseName(s.name);
    return {
      Name:        name,
      Company:     company,
      Phone:       phone !== "—" ? formatPhone(phone) : "",
      Email:       s.email || "",
      Status:      s.is_active ? "Active" : "Inactive",
      Subscribed:  fmtDate(s.subscribed_at),
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  // column widths
  ws["!cols"] = [28, 28, 18, 32, 10, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ active, T }) {
  const col = active ? T.green : T.muted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      color: col, background: col + "18", border: "1px solid " + col + "40",
      borderRadius: 20, padding: "2px 8px",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: col, flexShrink: 0 }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const TABLE_COLS = "minmax(160px,2fr) minmax(150px,2fr) 150px minmax(180px,2fr) 110px 120px";

// ── Newsletter Report ─────────────────────────────────────────────────────────

function NewsletterReport({ col }) {
  const T = useTheme();
  const [subscribers, setSubscribers] = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastFetched, setLastFetched] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFoxtowNewsletterSubscribers({ active: true, page: 1, limit: 50 });
      setSubscribers(res.data ?? []);
      setPagination(res.pagination ?? null);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return subscribers.filter(s => {
      const { name, company, phone } = parseName(s.name);
      const q = search.toLowerCase();
      const matchSearch = !q
        || name.toLowerCase().includes(q)
        || company.toLowerCase().includes(q)
        || (s.email || "").toLowerCase().includes(q)
        || phone.includes(q);
      const matchStatus = statusFilter === "all"
        ? true
        : statusFilter === "active" ? s.is_active : !s.is_active;
      return matchSearch && matchStatus;
    });
  }, [subscribers, search, statusFilter]);

  const total    = pagination?.total ?? subscribers.length;
  const active   = subscribers.filter(s => s.is_active).length;
  const inactive = subscribers.filter(s => !s.is_active).length;
  const newMonth = thisMonthCount(subscribers);

  const stats = [
    { label: "Total",          value: total,    color: T.text,  dot: null    },
    { label: "Active",         value: active,   color: T.green, dot: T.green },
    { label: "Inactive",       value: inactive, color: T.muted, dot: T.muted },
    { label: "New This Month", value: newMonth, color: col,     dot: col     },
  ];

  return (
    <>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map(({ label, value, color, dot }) => (
          <div key={label} style={{
            padding: "18px 20px", background: T.card,
            border: "1px solid " + T.border, borderRadius: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              {dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
              <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.03em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 5 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search + filter + actions row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} color={T.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            placeholder="Search by name, company, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
              borderRadius: 9, border: "1px solid " + T.border,
              background: T.card, color: T.text, fontSize: 13,
              fontFamily: "inherit", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = col}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 9, border: "1px solid " + T.border,
            background: T.card, color: statusFilter === "all" ? T.muted : T.text,
            fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", minWidth: 140,
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {/* {lastFetched && (
          <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>
            {lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )} */}
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 8,
            border: "1px solid " + T.border, background: T.surface,
            color: T.dim, fontSize: 12, cursor: loading ? "default" : "pointer",
            fontFamily: "inherit", opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
        <button
          onClick={() => exportToExcel(filtered)}
          disabled={filtered.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 8,
            border: "1px solid " + col + "50",
            background: col + "12",
            color: col,
            fontSize: 12, cursor: filtered.length === 0 ? "default" : "pointer",
            fontFamily: "inherit", fontWeight: 600,
            opacity: filtered.length === 0 ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <Download size={13} />
          Export
        </button>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 14,
          background: T.red + "12", border: "1px solid " + T.red + "30",
          color: T.red, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading && subscribers.length === 0 ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, color: T.muted, fontSize: 13, padding: 48,
          background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Loading subscribers…
        </div>
      ) : subscribers.length === 0 && !error ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        }}>
          <Mail size={44} color={T.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>No subscribers yet</div>
          <div style={{ fontSize: 13, color: T.muted }}>Newsletter subscriber data will appear here once available.</div>
        </div>
      ) : subscribers.length > 0 && (
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12 }}>
          <div style={{
            display: "grid", gridTemplateColumns: TABLE_COLS,
            padding: "10px 16px", borderBottom: "1px solid " + T.border,
            background: T.card, borderRadius: "12px 12px 0 0",
          }}>
            {["Name", "Company", "Phone", "Email", "Status", "Subscribed"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {h}
              </div>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
              No subscribers match your search.
            </div>
          ) : (
            filtered.map((s, idx) => {
              const { name, company, phone } = parseName(s.name);
              const isLast = idx === filtered.length - 1;
              return (
                <div
                  key={s.id}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  style={{
                    display: "grid", gridTemplateColumns: TABLE_COLS,
                    padding: "12px 16px",
                    borderBottom: isLast ? "none" : "1px solid " + T.border,
                    borderRadius: isLast ? "0 0 12px 12px" : 0,
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ fontSize: 13, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company}</div>
                  <div style={{ fontSize: 13, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{phone !== "—" ? formatPhone(phone) : "—"}</div>
                  <div style={{ overflow: "hidden" }}>
                    {s.email ? (
                      <a
                        href={`mailto:${s.email}`}
                        style={{ color: col, textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
                        onClick={e => e.stopPropagation()}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</span>
                        <ExternalLink size={10} strokeWidth={2} style={{ opacity: 0.5, flexShrink: 0 }} />
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: T.muted }}>—</span>
                    )}
                  </div>
                  <div><StatusBadge active={s.is_active} T={T} /></div>
                  <div style={{ fontSize: 13, color: T.muted }}>{fmtRelative(s.subscribed_at)}</div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoonReport({ label, Icon, col, T }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "100px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: col + "15", border: "1.5px solid " + col + "30",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <Icon size={24} color={col} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: T.muted }}>This report is coming soon.</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const T = useTheme();
  const { clientId } = usePool();
  const client = useClientById(clientId);
  const col = client?.color || T.accent;

  const [activeSection, setActiveSection] = useState("newsletter");

  const isFoxtow = clientId === FOXTOW_CLIENT_ID;
  const activeItem = REPORT_TYPES.find(i => i.id === activeSection);

  return (
    <div style={{ width: "100%" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 4 }}>Reports</div>
          <div style={{ fontSize: 13, color: T.muted }}>Analytics and data insights for your clients.</div>
        </div>
        <BarChart2 size={18} color={T.muted} style={{ marginTop: 6, opacity: 0.4 }} />
      </div>

      {/* ── Report type filter tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {REPORT_TYPES.map(({ id, label, Icon, soon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => { if (!soon) setActiveSection(id); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid " + (active ? col + "60" : T.border),
                background: active ? col + "12" : T.card,
                color: active ? col : soon ? T.muted : T.dim,
                fontSize: 13, fontWeight: active ? 700 : 400,
                cursor: soon ? "default" : "pointer",
                opacity: soon ? 0.55 : 1,
                whiteSpace: "nowrap",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!soon && !active) e.currentTarget.style.background = T.surface; }}
              onMouseLeave={e => { if (!soon && !active) e.currentTarget.style.background = T.card; }}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {soon && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: T.amber, background: T.amber + "18", border: "1px solid " + T.amber + "40",
                  borderRadius: 4, padding: "1px 5px",
                }}>
                  SOON
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {!isFoxtow ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: T.border + "60",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
          }}>
            <BarChart2 size={20} color={T.muted} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            No report found for this client
          </div>
          <div style={{ fontSize: 13, color: T.muted, textAlign: "center", maxWidth: 320, lineHeight: 1.7 }}>
            Reports are not configured for <strong style={{ color: T.dim }}>{client?.name || "this client"}</strong> yet.
          </div>
        </div>
      ) : activeSection === "newsletter" ? (
        <NewsletterReport col={col} />
      ) : (
        activeItem && <ComingSoonReport label={activeItem.label} Icon={activeItem.Icon} col={col} T={T} />
      )}
    </div>
  );
}
