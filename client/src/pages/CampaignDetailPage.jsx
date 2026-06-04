import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { analytics } from "../services/analytics";
import { getContactsForCampaign } from "../services/api";
import {
  ArrowLeft, Send, Users, Mail, MousePointerClick, AlertCircle,
  UserMinus, Plus, Loader2, ChevronRight, CheckCircle2,
  Search, Trash2, Activity, X, Clock, Pencil, Ban, RotateCcw, Download,
  CalendarClock, Pause, Play, Settings2, BarChart2, List,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import {
  getCampaign, getCampaignRecipients, addCampaignRecipients,
  removeCampaignRecipients, sendCampaign, resendCampaign, updateCampaign,
  cancelCampaign, restoreCampaign,
  getCampaignAnalytics, previewCampaignRecipients, getContact, getPublishedTemplates,
  exportCampaignBlob, dryRunCampaignSend, resubscribeRecipient,
  getCampaignQueue, createCampaignQueue, updateCampaignQueue,
  pauseCampaignQueue, resumeCampaignQueue, cancelCampaignQueue,
  exportCampaignDayBlob,
} from "../services/api";
import CampaignGraphView from "../components/CampaignGraphView";
import { ACT_DEF } from "../data/activities";
import { StagePill } from "../components/ui/Pill";
import { SkeletonActivityRow, SkeletonRow, SkeletonBlock } from "../components/ui/Loader";
import RefreshBtn from "../components/ui/RefreshBtn";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCountdown(targetIso) {
  if (!targetIso) return null;
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "any moment now";
  const totalSec = Math.floor(diffMs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function fmtLocalTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtRelTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatusBadge({ status }) {
  const T = useTheme();
  const isActive = status === "sending" || status === "sent";
  const isInactive = status === "paused" || status === "canceled";
  const label = isActive ? "Active" : isInactive ? "Inactive" : "Pending";
  const color = status === "sending" ? T.amber : isActive ? T.green : isInactive ? T.red : T.muted;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", color,
      background: color + "18", border: "1px solid " + color + "40",
      borderRadius: 4, padding: "2px 8px",
    }}>{label}</span>
  );
}

function RecipientStatusBadge({ status, count }) {
  const T = useTheme();
  const map = {
    pending:      { color: T.muted,   label: "Pending"      },
    sent:         { color: T.blue,    label: "Sent"         },
    delivered:    { color: T.teal,    label: "Delivered"    },
    opened:       { color: T.green,   label: "Opened"       },
    clicked:      { color: T.accent,  label: "Clicked"      },
    bounced:      { color: T.red,     label: "Bounced"      },
    unsubscribed: { color: T.orange,  label: "Unsubscribed" },
  };
  const { color, label } = map[status] ?? { color: T.muted, label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color, background: color + "15",
        borderRadius: 4, padding: "2px 7px", border: "1px solid " + color + "30",
      }}>{label}</span>
      {count > 1 && (
        <span title={`${count}x`} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "50%",
          background: color + "25", border: "1px solid " + color + "50",
          fontSize: 9, fontWeight: 700, color,
        }}>{count}</span>
      )}
    </span>
  );
}

// ── Lead activity panel ───────────────────────────────────────────────────────

function LeadActivityPanel({ recipient, contact, loading, onClose }) {
  const T = useTheme();
  if (!recipient) return null;

  const c = contact ?? recipient.contact;
  const initials = ((c?.firstName?.[0] || "") + (c?.lastName?.[0] || "")).toUpperCase() || (c?.email?.[0] || "?").toUpperCase();
  const activities = contact?.activities ?? [];

  return (
    <div style={{
      width: 340, flexShrink: 0,
      position: "sticky", top: 0, alignSelf: "flex-start",
      background: T.card, border: "1px solid " + T.border, borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: "1px solid " + T.border,
        background: T.surface,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Lead Activity</span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: T.muted, cursor: "pointer",
            padding: 4, display: "flex", alignItems: "center", borderRadius: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.border; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = "none"; }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Contact summary */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid " + T.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: T.accent + "25",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: T.accent,
            border: "2px solid " + T.accent + "40",
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>
              {[c?.firstName, c?.lastName].filter(Boolean).join(" ") || c?.email || "—"}
            </div>
            <div style={{
              fontSize: 11, color: T.muted,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {c?.email || "No email"}
            </div>
          </div>
        </div>

        {c?.company && (
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 8 }}>
            {c.company}
          </div>
        )}

        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {c?.lifecycleStage && <StagePill stage={c.lifecycleStage} />}
          {recipient.abVariant && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
              color: recipient.abVariant === "A" ? T.blue : T.orange,
              background: (recipient.abVariant === "A" ? T.blue : T.orange) + "18",
              border: "1px solid " + (recipient.abVariant === "A" ? T.blue : T.orange) + "30",
            }}>Variant {recipient.abVariant}</span>
          )}
          <RecipientStatusBadge status={recipient.status} />
        </div>
      </div>

      {/* Activity timeline */}
      <div style={{ overflowY: "auto", maxHeight: 480 }}>
        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonActivityRow key={i} />)}
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: T.muted }}>
            <Clock size={28} color={T.border} style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 12 }}>No activity recorded yet</div>
          </div>
        ) : (
          <div style={{ padding: "12px 0" }}>
            {[...activities].reverse().map((act, i) => {
              const def = ACT_DEF[act.type] ?? { label: act.type, icon: "·", color: T.muted };
              return (
                <div key={act.id ?? i} style={{
                  display: "flex", gap: 12,
                  padding: "8px 16px",
                  position: "relative",
                }}>
                  {/* Timeline line */}
                  {i < activities.length - 1 && (
                    <div style={{
                      position: "absolute", left: 27, top: 30,
                      width: 1, height: "calc(100% - 10px)",
                      background: T.border,
                    }} />
                  )}

                  {/* Icon dot */}
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: def.color + "18",
                    border: "1.5px solid " + def.color + "40",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: def.color, position: "relative", zIndex: 1,
                  }}>
                    {def.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: def.color }}>{def.label}</span>
                      <span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{fmtRelTime(act.createdAt)}</span>
                    </div>
                    {act.note && (
                      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{act.note}</div>
                    )}
                    {act.user?.name && (
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>by {act.user.name}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recipients table ──────────────────────────────────────────────────────────

const STAGE_FILTERS = [
  { id: "all",            label: "All Contacts",   desc: "Every contact" },
  { id: "new",            label: "New",            desc: "New stage" },
  { id: "contacted",      label: "Contacted",      desc: "Has been reached" },
  { id: "engaged",        label: "Engaged",        desc: "Engaged contacts" },
  { id: "demo_scheduled", label: "Demo Scheduled", desc: "Demo scheduled" },
  { id: "demo_done",      label: "Demo Done",      desc: "Demo completed" },
  { id: "proposal_sent",  label: "Proposal Sent",  desc: "Proposal sent" },
  { id: "negotiating",    label: "Negotiating",    desc: "In negotiation" },
  { id: "customer",       label: "Customer",       desc: "Converted" },
  { id: "not_qualified",  label: "Not Qualified",  desc: "Did not qualify" },
  { id: "lost",           label: "Lost",           desc: "Marked lost" },
  { id: "churned",        label: "Churned",        desc: "Churned" },
];

const SKIP_REASON_LABELS = {
  "suppressed:unsubscribed": { text: "Unsubscribed", color: null },  // color resolved at render time
  "suppressed:bounced":      { text: "Bounced",      color: null },
  "no_email":                { text: "No email",     color: null },
  "duplicate_email":         { text: "Duplicate",    color: null },
};

function RecipientsTable({ campaignId, statusFilter, search, isAbTest, refreshKey, onSelectContact, selectedContactId, onTotalChange, queueRunId }) {
  const T = useTheme();
  const toast = useAppToast();
  const thStyle = {
    padding: "10px 16px", textAlign: "left",
    fontSize: 10, fontWeight: 700, color: T.muted,
    letterSpacing: "0.07em", textTransform: "uppercase",
    borderBottom: "1px solid " + T.border, userSelect: "none",
  };
  const [data,    setData]    = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const limit = 50;

  // Reset to page 1 when filter or search changes
  useEffect(() => { setPage(1); }, [statusFilter, search, refreshKey]);

  const load = useCallback(async (currentPage) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit };
      if (statusFilter && statusFilter !== "all") {
        const statusOnly = new Set(["pending", "bounced", "unsubscribed"]);
        if (statusOnly.has(statusFilter)) params.status = statusFilter;
        else params.event = statusFilter;
      }
      if (search)      params.search     = search;
      if (queueRunId)  params.queueRunId = queueRunId;
      const res = await getCampaignRecipients(campaignId, params);
      setData(res);
      onTotalChange?.(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, statusFilter, search, refreshKey]);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  const handleResubscribe = useCallback(async (e, recipientId) => {
    e.stopPropagation();
    try {
      await resubscribeRecipient(campaignId, recipientId);
      toast.success("Contact re-subscribed. They can now receive future campaigns.");
      load(page);
    } catch {
      toast.error("Failed to re-subscribe contact.");
    }
  }, [campaignId, load, page, toast]);

  if (loading) return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
      </tbody>
    </table>
  );

  if (!data.rows.length) return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted, fontSize: 13 }}>
      {statusFilter && statusFilter !== "all" ? `No recipients with status "${statusFilter}"` : "No recipients match your search."}
    </div>
  );

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, data.total);

  return (
    <>
      <div style={{
        padding: "10px 16px 6px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Showing {start}–{end} of {data.total}
        </span>
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "none", border: "1px solid " + T.border, borderRadius: 6,
                color: page === 1 ? T.muted : T.text, cursor: page === 1 ? "not-allowed" : "pointer",
                padding: "3px 10px", fontSize: 12, fontFamily: "inherit",
              }}
            >← Prev</button>
            <span style={{ fontSize: 11, color: T.muted }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                background: "none", border: "1px solid " + T.border, borderRadius: 6,
                color: page === totalPages ? T.muted : T.text, cursor: page === totalPages ? "not-allowed" : "pointer",
                padding: "3px 10px", fontSize: 12, fontFamily: "inherit",
              }}
            >Next →</button>
          </div>
        )}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, paddingLeft: 20 }}>Contact</th>
            <th style={thStyle}>Email</th>
            {isAbTest && <th style={{ ...thStyle, textAlign: "center" }}>Variant</th>}
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Reason</th>
            <th style={thStyle}>Stage</th>
            <th style={thStyle}>Batch</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => {
            const isSelected = selectedContactId === r.contact?.id;
            return (
              <tr
                key={r.id}
                onClick={() => onSelectContact?.(r)}
                style={{
                  background: isSelected
                    ? T.accent + "12"
                    : i % 2 !== 0 ? T.surface + "55" : "transparent",
                  borderLeft: isSelected ? "2px solid " + T.accent : "2px solid transparent",
                  transition: "background 0.08s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = T.accent + "08")}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = i % 2 !== 0 ? T.surface + "55" : "transparent")}
              >
                <td style={{ padding: "12px 20px", borderBottom: "1px solid " + T.border + "80" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? T.accent + "30" : T.accent + "20",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: T.accent,
                      border: isSelected ? "1.5px solid " + T.accent + "60" : "none",
                    }}>
                      {(r.contact?.firstName?.[0] || r.contact?.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? T.accent : T.text }}>
                        {[r.contact?.firstName, r.contact?.lastName].filter(Boolean).join(" ") || r.contact?.email || "—"}
                      </div>
                      {r.contact?.company && (
                        <div style={{ fontSize: 10, color: T.muted }}>{r.contact.company}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border + "80" }}>
                  <span style={{ fontSize: 12, color: T.dim }}>{r.contact?.email || "—"}</span>
                </td>
                {isAbTest && (
                  <td style={{ padding: "12px 16px", textAlign: "center", borderBottom: "1px solid " + T.border + "80" }}>
                    {r.abVariant ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: r.abVariant === "A" ? T.blue : T.orange,
                        background: (r.abVariant === "A" ? T.blue : T.orange) + "18",
                        border: "1px solid " + (r.abVariant === "A" ? T.blue : T.orange) + "40",
                        padding: "2px 8px", borderRadius: 4,
                      }}>{r.abVariant}</span>
                    ) : "—"}
                  </td>
                )}
                <td style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border + "80" }}>
                  <RecipientStatusBadge
                    status={statusFilter && statusFilter !== "all" ? statusFilter : r.status}
                    count={(() => {
                      const evType = statusFilter && statusFilter !== "all" ? statusFilter : r.status;
                      return (r.events || []).filter(e => e.event === evType).length;
                    })()}
                  />
                </td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border + "80" }}>
                  {r.status === "skipped" && r.skipReason ? (() => {
                    const label = SKIP_REASON_LABELS[r.skipReason];
                    const color = r.skipReason === "suppressed:unsubscribed" ? T.red
                                : r.skipReason === "suppressed:bounced"      ? (T.amber || T.yellow || "#f59e0b")
                                : T.muted;
                    return <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label?.text || r.skipReason}</span>;
                  })() : r.status === "unsubscribed" && r.unsubReason ? (
                    <span title={r.unsubReason} style={{
                      fontSize: 11, color: T.dim,
                      display: "block", maxWidth: 200,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {r.unsubReason}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: T.muted }}>—</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border + "80" }}>
                  {r.contact?.lifecycleStage
                    ? <StagePill stage={r.contact.lifecycleStage} />
                    : <span style={{ fontSize: 11, color: T.muted }}>—</span>
                  }
                </td>
                <td style={{ padding: "12px 16px", borderBottom: "1px solid " + T.border + "80" }}>
                  {r.sendLabel
                    ? <span style={{
                        fontSize: 11, fontWeight: 600, color: T.accent,
                        background: T.accent + "18", borderRadius: 10,
                        padding: "2px 9px", whiteSpace: "nowrap",
                      }}>{r.sendLabel}</span>
                    : <span style={{ fontSize: 11, color: T.muted }}>—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div style={{
          padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          borderTop: "1px solid " + T.border,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: "none", border: "1px solid " + T.border, borderRadius: 6,
              color: page === 1 ? T.muted : T.text, cursor: page === 1 ? "not-allowed" : "pointer",
              padding: "4px 14px", fontSize: 12, fontFamily: "inherit",
            }}
          >← Prev</button>
          <span style={{ fontSize: 12, color: T.muted }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: "none", border: "1px solid " + T.border, borderRadius: 6,
              color: page === totalPages ? T.muted : T.text, cursor: page === totalPages ? "not-allowed" : "pointer",
              padding: "4px 14px", fontSize: 12, fontFamily: "inherit",
            }}
          >Next →</button>
        </div>
      )}
    </>
  );
}

// ── Add Recipients Modal ──────────────────────────────────────────────────────

function AddRecipientsModal({ campaignId, clientId, onClose, onAdded }) {
  const T = useTheme();
  // mode: "stage" | "search"
  const [mode,       setMode]       = useState("stage");
  const [step,       setStep]       = useState(1);
  const [filter,     setFilter]     = useState("all");
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [error,      setError]      = useState(null);

  // Search/select state
  const [contacts,    setContacts]    = useState([]);
  const [contLoading, setContLoading] = useState(false);
  const [searchQ,     setSearchQ]     = useState("");
  const [selected,    setSelected]    = useState(new Set());
  const searchRef = useRef(null);

  // Load all contacts for the search tab
  useEffect(() => {
    if (mode !== "search") return;
    setContLoading(true);
    getContactsForCampaign(clientId)
      .then(data => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setContLoading(false));
  }, [mode, clientId]);

  const filteredContacts = contacts.filter(c => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      (c.firstName || "").toLowerCase().includes(q) ||
      (c.lastName  || "").toLowerCase().includes(q) ||
      (c.email     || "").toLowerCase().includes(q) ||
      (c.company   || "").toLowerCase().includes(q)
    );
  });

  const toggleContact = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const loadPreview = useCallback(async f => {
    setLoading(true);
    setError(null);
    try {
      const data = await previewCampaignRecipients(campaignId, f);
      setPreview(data);
    } catch {
      setPreview({ count: 0, sample: [] });
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const handleNext = async () => {
    if (mode === "stage") { setStep(2); await loadPreview(filter); }
    else { setStep(2); }
  };

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const payload = mode === "search"
        ? { contactIds: Array.from(selected) }
        : { filter };
      const updated = await addCampaignRecipients(campaignId, payload);
      onAdded(updated);
    } catch (err) {
      setError(err.message || "Failed to add recipients. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const confirmCount = mode === "search" ? selected.size : (preview?.count ?? 0);
  const canConfirm   = mode === "search" ? selected.size > 0 : (preview?.count > 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 14,
        width: step === 1 && mode === "search" ? 520 : 480,
        maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px 14px", borderBottom: "1px solid " + T.border, flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {step === 1 ? "Add Recipients" : "Confirm Recipients"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Mode tabs (step 1 only) */}
        {step === 1 && (
          <div style={{ display: "flex", gap: 0, padding: "12px 24px 0", flexShrink: 0 }}>
            {[["stage", "By Stage"], ["search", "By Search"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                style={{
                  padding: "7px 18px", border: "none", borderRadius: "7px 7px 0 0",
                  background: mode === m ? T.surface : "transparent",
                  borderBottom: mode === m ? "2px solid " + T.accent : "2px solid transparent",
                  color: mode === m ? T.accent : T.muted,
                  fontWeight: mode === m ? 700 : 500, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "16px 24px", flex: 1, overflowY: "auto" }}>

          {/* ── BY STAGE ── */}
          {step === 1 && mode === "stage" && (
            <>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
                {clientId ? "Filter contacts by lifecycle stage. Only contacts in this client will be added." : "Filter contacts by lifecycle stage."}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {STAGE_FILTERS.map(f => {
                  const sel = filter === f.id;
                  return (
                    <div key={f.id} onClick={() => setFilter(f.id)} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                      border: "1px solid " + (sel ? T.accent : T.border),
                      background: sel ? T.accent + "10" : T.surface,
                      transition: "border-color 0.1s, background 0.1s",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                        border: "2px solid " + (sel ? T.accent : T.border),
                        background: sel ? T.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {sel && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{f.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── BY SEARCH ── */}
          {step === 1 && mode === "search" && (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={13} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  ref={searchRef}
                  autoFocus
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search by name, email, or company…"
                  style={{
                    width: "100%", boxSizing: "border-box", paddingLeft: 32, paddingRight: 12,
                    paddingTop: 9, paddingBottom: 9,
                    borderRadius: 8, border: "1px solid " + T.border,
                    background: T.surface, color: T.text, fontSize: 13,
                    fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Select all row */}
              {!contLoading && filteredContacts.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 2px", marginBottom: 4,
                }}>
                  <span style={{ fontSize: 11, color: T.muted }}>
                    {selected.size > 0 ? `${selected.size} selected` : `${filteredContacts.length} contacts`}
                  </span>
                  <button onClick={toggleAll} style={{
                    fontSize: 11, color: T.accent, background: "none", border: "none",
                    cursor: "pointer", fontFamily: "inherit", padding: 0,
                  }}>
                    {selected.size === filteredContacts.length && filteredContacts.length > 0 ? "Deselect all" : "Select all"}
                  </button>
                </div>
              )}

              {contLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13, padding: 20, justifyContent: "center" }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading contacts…
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: T.muted, fontSize: 13 }}>
                  {searchQ ? "No contacts match your search." : "No contacts found for this campaign."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 320, overflowY: "auto" }}>
                  {filteredContacts.map(c => {
                    const sel = selected.has(c.id);
                    return (
                      <div key={c.id} onClick={() => toggleContact(c.id)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                        border: "1px solid " + (sel ? T.accent + "60" : T.border),
                        background: sel ? T.accent + "0e" : T.surface,
                        transition: "all 0.12s",
                      }}>
                        {/* Checkbox */}
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: "2px solid " + (sel ? T.accent : T.border),
                          background: sel ? T.accent : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        {/* Avatar */}
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: T.accent + "22",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: T.accent,
                        }}>
                          {(c.firstName?.[0] || "?").toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                          </div>
                          <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.email}{c.company ? " · " + c.company : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── CONFIRM STEP ── */}
          {step === 2 && (
            loading && mode === "stage" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13, padding: 20 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading preview…
              </div>
            ) : (
              <>
                <div style={{
                  background: T.accent + "10", border: "1px solid " + T.accent + "30",
                  borderRadius: 8, padding: "14px 16px", marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Users size={16} color={T.accent} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{confirmCount} contact{confirmCount !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      {mode === "search"
                        ? "Selected manually"
                        : `Stage: ${STAGE_FILTERS.find(f => f.id === filter)?.label}`}
                    </div>
                  </div>
                </div>

                {mode === "stage" && preview?.sample?.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Sample (first {preview.sample.length})
                    </div>
                    {preview.sample.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 7, background: T.surface }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.accent + "22", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.accent }}>
                          {(c.firstName?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.firstName} {c.lastName}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{c.email || c.company}</div>
                        </div>
                      </div>
                    ))}
                    {preview.count > preview.sample.length && (
                      <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: "4px 0" }}>
                        +{preview.count - preview.sample.length} more
                      </div>
                    )}
                  </div>
                )}

                {mode === "search" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                    {contacts.filter(c => selected.has(c.id)).map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 7, background: T.surface }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.accent + "22", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.accent }}>
                          {(c.firstName?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{[c.firstName, c.lastName].filter(Boolean).join(" ")}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{c.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!canConfirm && (
                  <div style={{ textAlign: "center", padding: 20, color: T.muted, fontSize: 13 }}>No contacts to add.</div>
                )}
              </>
            )
          )}
        </div>

        {error && (
          <div style={{ margin: "0 24px 8px", padding: "10px 14px", borderRadius: 7, background: T.red + "15", border: "1px solid " + T.red + "40", color: T.red, fontSize: 12, flexShrink: 0 }}>
            {error}
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", borderTop: "1px solid " + T.border, flexShrink: 0,
        }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={mode === "search" && selected.size === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 7, border: "none",
                  background: (mode === "search" && selected.size === 0) ? T.border : T.accent,
                  color: (mode === "search" && selected.size === 0) ? T.muted : "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {mode === "search" && selected.size > 0
                  ? `Add ${selected.size} Contact${selected.size !== 1 ? "s" : ""}`
                  : "Next"
                } <ChevronRight size={13} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setError(null); }} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                ← Back
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !canConfirm || loading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 7, border: "none",
                  background: canConfirm && !adding ? T.accent : T.border,
                  color: canConfirm && !adding ? "#fff" : T.muted,
                  fontSize: 13, fontWeight: 600,
                  cursor: canConfirm && !adding ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                {adding
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Adding…</>
                  : <><Plus size={13} /> Add {confirmCount} Recipient{confirmCount !== 1 ? "s" : ""}</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Campaign Modal ───────────────────────────────────────────────────────

function EditField({ label, value, onChange, placeholder, type = "text", required }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 5, letterSpacing: "0.03em" }}>
        {label}{required && <span style={{ color: T.accent, marginLeft: 2 }}>*</span>}
      </div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 7, boxSizing: "border-box",
          background: T.surface, border: "1px solid " + T.border,
          color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function EditCampaignModal({ campaign, onClose, onSaved }) {
  const T = useTheme();
  const [form, setForm] = useState({
    name:      campaign.name      || "",
    subject:   campaign.subject   || "",
    subjectB:  campaign.subjectB  || "",
    fromName:  campaign.fromName  || "",
    fromEmail: campaign.fromEmail || "",
    templateId:  campaign.templateId  || null,
    templateIdB: campaign.templateIdB || null,
  });
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const isSent = campaign.status === "sent";
  const isAB   = campaign.type   === "ab_test";

  useEffect(() => {
    if (!isSent) {
      getPublishedTemplates().then(setTemplates).catch(() => {});
    }
  }, [isSent]);

  const handleSelectTemplate = (id) => {
    const tpl = templates.find(t => t.id === id);
    setForm(f => ({ ...f, templateId: id, subject: f.subject || tpl?.subject || "" }));
  };

  const handleSelectTemplateB = (id) => {
    const tpl = templates.find(t => t.id === id);
    setForm(f => ({ ...f, templateIdB: id, subjectB: f.subjectB || tpl?.subject || "" }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateCampaign(campaign.id, {
        name:        form.name.trim(),
        subject:     form.subject.trim(),
        subjectB:    form.subjectB.trim(),
        fromName:    form.fromName.trim(),
        fromEmail:   form.fromEmail.trim(),
        templateId:  form.templateId  || null,
        templateIdB: form.templateIdB || null,
      });
      onSaved(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid " + T.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={15} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Edit Campaign</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{campaign.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <EditField label="Campaign Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Campaign name" />

          {!isSent && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, letterSpacing: "0.03em" }}>
                TEMPLATE{isAB ? " A" : ""}
              </div>
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid " + T.border, borderRadius: 8, padding: 8 }}>
                {templates.length === 0
                  ? <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 4 }}>
                      {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} h={44} radius={6} />)}
                    </div>
                  : templates.map(t => {
                    const sel = form.templateId === t.id;
                    return (
                      <div key={t.id} onClick={() => handleSelectTemplate(t.id)} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 4,
                        border: "1px solid " + (sel ? T.accent + "80" : T.border), background: sel ? T.accent + "10" : "transparent",
                      }}>
                        <Mail size={12} color={sel ? T.accent : T.muted} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          <div style={{ fontSize: 10, color: T.muted }}>{t.subject || "No subject"}</div>
                        </div>
                        {sel && <CheckCircle2 size={12} color={T.accent} />}
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}

          <EditField label={isAB ? "Subject A" : "Subject Line"} value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Your email subject…" />

          {isAB && (
            <>
              {!isSent && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, letterSpacing: "0.03em" }}>TEMPLATE B</div>
                  <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid " + T.border, borderRadius: 8, padding: 8 }}>
                    {templates.map(t => {
                      const sel = form.templateIdB === t.id;
                      return (
                        <div key={t.id} onClick={() => handleSelectTemplateB(t.id)} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 4,
                          border: "1px solid " + (sel ? T.orange + "80" : T.border), background: sel ? T.orange + "10" : "transparent",
                        }}>
                          <Mail size={12} color={sel ? T.orange : T.muted} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          </div>
                          {sel && <CheckCircle2 size={12} color={T.orange} />}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <EditField label="Subject B" value={form.subjectB} onChange={v => setForm(f => ({ ...f, subjectB: v }))} placeholder="Subject for variant B…" />
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label="From Name"  value={form.fromName}  onChange={v => setForm(f => ({ ...f, fromName: v }))}  placeholder="Company name" />
            <EditField label="From Email" type="email" value={form.fromEmail} onChange={v => setForm(f => ({ ...f, fromEmail: v }))} placeholder="sales@yourdomain.com" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 22px", borderTop: "1px solid " + T.border }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: form.name.trim() ? T.accent : T.border,
              color: form.name.trim() ? "#fff" : T.muted,
              fontSize: 13, fontWeight: 600,
              cursor: saving || !form.name.trim() ? "default" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resend Modal ──────────────────────────────────────────────────────────────

const RESEND_FILTERS = [
  { id: "bounced",     label: "Bounced",      desc: "Contacts whose emails bounced",                statuses: ["bounced"] },
  { id: "not_opened",  label: "Not opened",   desc: "Sent/delivered but never opened",              statuses: ["sent", "delivered"] },
  { id: "pending",     label: "Pending only", desc: "Contacts that were never sent",                statuses: ["pending"] },
  { id: "all",         label: "Everyone",     desc: "All recipients (except unsubscribed)",         statuses: ["bounced", "sent", "delivered", "pending"] },
];

function ResendModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  const [selected, setSelected] = useState("bounced");
  const filter = RESEND_FILTERS.find(f => f.id === selected);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: T.accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Send size={18} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Resend Campaign</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              Choose which recipients to resend to
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {RESEND_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                border: "1px solid " + (selected === f.id ? T.accent + "80" : T.border),
                background: selected === f.id ? T.accent + "12" : T.surface,
                textAlign: "left",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: "2px solid " + (selected === f.id ? T.accent : T.border),
                background: selected === f.id ? T.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === f.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{f.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            onClick={() => onConfirm(filter.statuses)}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: loading ? "default" : "pointer", fontFamily: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
              : <><Send size={13} /> Resend Now</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Send Confirm Modal ────────────────────────────────────────────────────────

const SEND_LIMIT_PRESETS = [
  { label: "500",   value: 500 },
  { label: "1,000", value: 1000 },
  { label: "2,000", value: 2000 },
];

function SendConfirmModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  const [batchLabel,    setBatchLabel]    = useState("");
  const [limitMode,     setLimitMode]     = useState("all");   // "all" | "preset" | "custom"
  const [presetVal,     setPresetVal]     = useState(500);
  const [customVal,     setCustomVal]     = useState("");
  const [dryRun,        setDryRun]        = useState(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  const total = campaign.recipientsCount || 0;

  const resolvedLimit = limitMode === "all"
    ? null
    : limitMode === "preset"
      ? presetVal
      : (parseInt(customVal, 10) || null);

  const sendCount = resolvedLimit ? Math.min(resolvedLimit, total) : total;

  useEffect(() => {
    setDryRun(null);
    setDryRunLoading(true);
    dryRunCampaignSend(campaign.id, resolvedLimit || null)
      .then(r => setDryRun(r))
      .catch(() => {})
      .finally(() => setDryRunLoading(false));
  }, [campaign.id, resolvedLimit]); // eslint-disable-line

  const btnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
    border: active ? "1.5px solid " + T.accent : "1px solid " + T.border,
    background: active ? T.accent + "18" : "transparent",
    color: active ? T.accent : T.muted,
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%", background: T.accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Send size={18} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Send campaign?</div>
            <div style={{ fontSize: 12, color: T.muted }}>"{campaign.name}"</div>
          </div>
        </div>

        {/* How many to send */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8 }}>
            How many to send
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>
              ({total.toLocaleString()} pending)
            </span>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button style={btnStyle(limitMode === "all")} onClick={() => setLimitMode("all")}>
              All {total.toLocaleString()}
            </button>
            {SEND_LIMIT_PRESETS.filter(p => p.value < total).map(p => (
              <button
                key={p.value}
                style={btnStyle(limitMode === "preset" && presetVal === p.value)}
                onClick={() => { setLimitMode("preset"); setPresetVal(p.value); }}
              >
                First {p.label}
              </button>
            ))}
            <button style={btnStyle(limitMode === "custom")} onClick={() => setLimitMode("custom")}>
              Custom
            </button>
          </div>

          {limitMode === "custom" && (
            <input
              type="number"
              min={1}
              max={total}
              value={customVal}
              onChange={e => setCustomVal(e.target.value)}
              placeholder={`Enter number (max ${total})`}
              style={{
                marginTop: 8, width: "100%", padding: "7px 10px", borderRadius: 7,
                border: "1px solid " + T.border, background: T.surface, color: T.text,
                fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          )}

          {resolvedLimit && resolvedLimit < total && (
            <div style={{
              marginTop: 8, fontSize: 12, color: T.muted,
              background: T.surface, borderRadius: 6, padding: "6px 10px",
            }}>
              Will send to <strong style={{ color: T.text }}>{sendCount.toLocaleString()}</strong> of{" "}
              {total.toLocaleString()} — remaining <strong style={{ color: T.text }}>
                {(total - sendCount).toLocaleString()}
              </strong> stay pending for next send.
            </div>
          )}

          {/* Dry-run skip breakdown */}
          <div style={{
            marginTop: 8, fontSize: 12, borderRadius: 6, padding: "7px 10px",
            background: T.surface, border: "1px solid " + T.border + "66",
            minHeight: 30, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 6px",
          }}>
            {dryRunLoading ? (
              <span style={{ color: T.muted }}>Calculating…</span>
            ) : dryRun ? (
              <>
                <span style={{ color: T.green, fontWeight: 700 }}>{dryRun.willSend.toLocaleString()}</span>
                <span style={{ color: T.muted }}> will be sent</span>
                {dryRun.skipUnsubscribed > 0 && (
                  <span style={{ color: T.muted }}>
                    {" "}·{" "}
                    <span style={{ color: T.red, fontWeight: 600 }}>{dryRun.skipUnsubscribed}</span>
                    {" "}unsubscribed
                  </span>
                )}
                {dryRun.skipBounced > 0 && (
                  <span style={{ color: T.muted }}>
                    {" "}·{" "}
                    <span style={{ color: T.amber || T.yellow || "#f59e0b", fontWeight: 600 }}>{dryRun.skipBounced}</span>
                    {" "}bounced
                  </span>
                )}
                {dryRun.skipNoEmail > 0 && (
                  <span style={{ color: T.muted }}>
                    {" "}·{" "}
                    <span style={{ fontWeight: 600 }}>{dryRun.skipNoEmail}</span>
                    {" "}no email
                  </span>
                )}
                {dryRun.skipDuplicate > 0 && (
                  <span style={{ color: T.muted }}>
                    {" "}·{" "}
                    <span style={{ fontWeight: 600 }}>{dryRun.skipDuplicate}</span>
                    {" "}duplicate
                  </span>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Batch label */}
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>
          Batch label <span style={{ fontSize: 11, fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={batchLabel}
          onChange={e => setBatchLabel(e.target.value)}
          placeholder="e.g. Wave 1, June promo, Hot leads..."
          maxLength={120}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 7,
            border: "1px solid " + T.border, background: T.surface, color: T.text,
            fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 20,
            outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            onClick={() => onConfirm(batchLabel.trim(), resolvedLimit)}
            disabled={loading || (limitMode === "custom" && !parseInt(customVal, 10))}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (loading || (limitMode === "custom" && !parseInt(customVal, 10))) ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: (loading || (limitMode === "custom" && !parseInt(customVal, 10))) ? 0.5 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
              : <><Send size={13} /> Send {sendCount < total ? sendCount.toLocaleString() : "All"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Campaign Modal ─────────────────────────────────────────────────────

function CancelCampaignModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  const [reason, setReason] = useState("");
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: T.red + "18",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Ban size={16} color={T.red} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Cancel Campaign</div>
            <div style={{ fontSize: 12, color: T.muted }}>"{campaign.name}"</div>
          </div>
        </div>
        <label style={{ display: "block", fontSize: 12, color: T.muted, marginBottom: 6 }}>
          Reason for cancellation <span style={{ color: T.red }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this campaign is being canceled…"
          rows={3}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 7,
            border: "1px solid " + T.border, background: T.surface, color: T.text,
            fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Back</button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: T.red, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: !reason.trim() || loading ? "default" : "pointer",
              fontFamily: "inherit", opacity: !reason.trim() || loading ? 0.5 : 1,
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Canceling…</>
              : <><Ban size={13} /> Cancel Campaign</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Restore Campaign Modal ────────────────────────────────────────────────────

function RestoreCampaignModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        padding: 28, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: T.green + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RotateCcw size={22} color={T.green} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>
              Restore Campaign?
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              "<strong style={{ color: T.text }}>{campaign.name}</strong>" will be restored to its previous state.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 7, border: "1px solid " + T.border,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Back</button>
          <button onClick={onConfirm} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 22px", borderRadius: 7, border: "none",
            background: T.green, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: loading ? "default" : "pointer", fontFamily: "inherit",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Restoring…</>
              : <><RotateCcw size={13} /> Restore</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const T = useTheme();
  const toast = useAppToast();
  const { id }   = useParams();
  const navigate = useNavigate();

  const [campaign,          setCampaign]          = useState(null);
  const [analytics,         setAnalytics]         = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showSendModal,     setShowSendModal]     = useState(false);
  const [showResendModal,   setShowResendModal]   = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showCancelModal,   setShowCancelModal]   = useState(false);
  const [showRestoreModal,  setShowRestoreModal]  = useState(false);
  const [cancelActing,      setCancelActing]      = useState(false);
  const [sending,           setSending]           = useState(false);
  const [statusFilter,      setStatusFilter]      = useState("all");
  const [search,            setSearch]            = useState("");
  const [tableKey,          setTableKey]          = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [contactDetail,     setContactDetail]     = useState(null);
  const [contactLoading,    setContactLoading]    = useState(false);
  const [pdfExporting,      setPdfExporting]      = useState(false);
  const [showExcelModal,    setShowExcelModal]     = useState(false);
  const [excelSheets,       setExcelSheets]       = useState({ clicked: true, opened: true, delivered: false, sent: false, bounced: true, unsubscribed: true });
  const [excelExporting,    setExcelExporting]    = useState(false);
  const [filteredTotal,     setFilteredTotal]     = useState(null);

  // Queue state
  const [showQueueModal,    setShowQueueModal]    = useState(false);
  const [queueActing,       setQueueActing]       = useState(false);
  const [selectedDayRunId,  setSelectedDayRunId]  = useState(null); // null = all days
  const [viewMode,          setViewMode]          = useState("table"); // "table" | "graph"
  const [, setTick]         = useState(0); // force re-render every second for countdown

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [c, a] = await Promise.all([
        getCampaign(id),
        getCampaignAnalytics(id).catch(() => null),
      ]);
      setCampaign(c);
      setAnalytics(a);
    } catch {
      if (!silent) navigate("/campaigns");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s while campaign is sending or queue is active
  useEffect(() => {
    const isLive = campaign?.status === "sending" ||
      (campaign?.queue?.status === "active");
    if (!isLive) return;
    const timer = setInterval(() => {
      load({ silent: true });
      setTableKey(k => k + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [campaign?.status, campaign?.queue?.status, load]);

  // Live countdown — tick every second while a pending queue run exists
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSelectRecipient = useCallback(async (recipient) => {
    if (selectedRecipient?.id === recipient.id) {
      setSelectedRecipient(null);
      setContactDetail(null);
      return;
    }
    setSelectedRecipient(recipient);
    setContactDetail(null);
    if (recipient.contact?.id) {
      setContactLoading(true);
      try {
        const full = await getContact(recipient.contact.id);
        setContactDetail(full.data ?? full);
      } catch {
        // fall back to basic contact data from recipient
      } finally {
        setContactLoading(false);
      }
    }
  }, [selectedRecipient]);

  const handleSend = useCallback(async (batchLabel = "", limit = null) => {
    setSending(true);
    try {
      const updated = await sendCampaign(id, { label: batchLabel, limit });
      setShowSendModal(false);
      toast.success(`Campaign sent! Emails are being delivered.`);
      // Full refresh — campaign status, analytics, and recipient table all update
      setCampaign(updated);
      const a = await getCampaignAnalytics(id).catch(() => null);
      setAnalytics(a);
      setTableKey(k => k + 1);
    } catch (err) {
      toast.error(err?.message || "Failed to send campaign. Please try again.");
    } finally {
      setSending(false);
    }
  }, [id, toast]);

  const handleResend = useCallback(async (recipientStatuses) => {
    setSending(true);
    try {
      const updated = await resendCampaign(id, recipientStatuses);
      setShowResendModal(false);
      toast.success("Resend queued! Emails are being delivered.");
      setCampaign(updated);
      const a = await getCampaignAnalytics(id).catch(() => null);
      setAnalytics(a);
      setTableKey(k => k + 1);
    } catch (err) {
      toast.error(err?.message || "Resend failed. Please try again.");
    } finally {
      setSending(false);
    }
  }, [id, toast]);

  const handleEditSaved = useCallback(updated => {
    setCampaign(updated);
    setShowEditModal(false);
  }, []);

  const handleCancelCampaign = useCallback(async (reason) => {
    setCancelActing(true);
    try {
      const updated = await cancelCampaign(id, reason);
      setCampaign(updated);
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelActing(false);
    }
  }, [id]);

  const handleRestoreCampaign = useCallback(async () => {
    setCancelActing(true);
    try {
      const updated = await restoreCampaign(id);
      setCampaign(updated);
      setShowRestoreModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelActing(false);
    }
  }, [id]);

  const handleAdded = useCallback(updated => {
    setCampaign(updated);
    setShowAddModal(false);
    setTableKey(k => k + 1);
  }, []);

  const handleQueueSave = useCallback(async (config) => {
    setQueueActing(true);
    try {
      const queue = campaign.queue;
      if (queue && queue.status !== "cancelled") {
        await updateCampaignQueue(id, config);
      } else {
        await createCampaignQueue(id, { clientId: campaign.clientId, ...config });
      }
      const updated = await getCampaign(id);
      setCampaign(updated);
      setShowQueueModal(false);
      toast.success("Queue settings saved.");
    } catch (err) {
      toast.error(err?.message || "Failed to save queue settings.");
    } finally {
      setQueueActing(false);
    }
  }, [id, campaign, toast]);

  const handleQueuePause = useCallback(async () => {
    setQueueActing(true);
    try {
      await pauseCampaignQueue(id);
      const updated = await getCampaign(id);
      setCampaign(updated);
      toast.success("Queue paused.");
    } catch (err) {
      toast.error(err?.message || "Failed to pause queue.");
    } finally {
      setQueueActing(false);
    }
  }, [id, toast]);

  const handleQueueResume = useCallback(async () => {
    setQueueActing(true);
    try {
      await resumeCampaignQueue(id);
      const updated = await getCampaign(id);
      setCampaign(updated);
      toast.success("Queue resumed.");
    } catch (err) {
      toast.error(err?.message || "Failed to resume queue.");
    } finally {
      setQueueActing(false);
    }
  }, [id, toast]);

  const handleClearRecipients = useCallback(async () => {
    if (!window.confirm("Remove all recipients from this campaign?")) return;
    try {
      await removeCampaignRecipients(id);
      setCampaign(prev => ({ ...prev, recipientsCount: 0 }));
      setTableKey(k => k + 1);
      setSelectedRecipient(null);
      setContactDetail(null);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ width: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <SkeletonBlock h={40} radius={8} />
        <div style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} h={80} radius={8} style={{ flex: 1 }} />)}
        </div>
        <SkeletonBlock h={200} radius={8} />
        <SkeletonBlock h={300} radius={8} />
      </div>
    );
  }

  if (!campaign) return null;

  const canSend       = ["draft", "paused"].includes(campaign.status) && campaign.recipientsCount > 0;
  const isSent        = campaign.status === "sent";
  const isSending     = campaign.status === "sending";
  const isAbTest      = campaign.type === "ab_test";
  const pendingCount  = Math.max(0, (campaign.recipientsCount ?? 0) - (campaign.sentCount ?? 0) - (campaign.bouncedCount ?? 0));
  const queue         = campaign.queue ?? null;
  const queueRuns     = queue?.runs ?? [];

  const totals = analytics?.totals ?? {};
  const rates  = analytics?.rates  ?? {};

  return (
    <div style={{ width: "100%" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "12px 16px", marginBottom: 16,
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
      }}>
        <button
          onClick={() => navigate("/campaigns")}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 7, border: "1px solid " + T.border,
            background: T.surface, color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ width: 1, height: 22, background: T.border, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text, whiteSpace: "nowrap" }}>{campaign.name}</span>
          <StatusBadge status={campaign.status} />
          {isAbTest && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: T.purple,
              background: T.purple + "18", border: "1px solid " + T.purple + "30",
              borderRadius: 3, padding: "2px 6px",
            }}>A/B</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {isSending && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.amber, fontSize: 12 }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending…
            </div>
          )}
          {/* Add Recipients — available for all non-canceled campaigns */}
          {!campaign.isCanceled && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border,
                background: T.surface, color: T.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={13} /> Add Recipients
            </button>
          )}
          {canSend && (
            <button
              onClick={() => setShowSendModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Send size={12} /> Send Campaign
            </button>
          )}
          {isSent && (
            <button
              onClick={() => setShowResendModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Send size={12} /> Resend Campaign
            </button>
          )}
          {(!queue || queue.status === "cancelled") && campaign.recipientsCount > 0 && (
            <button
              onClick={() => setShowQueueModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 7,
                border: "1px solid " + (T.blue || "#3b82f6") + "55",
                background: (T.blue || "#3b82f6") + "12",
                color: T.blue || "#3b82f6", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <CalendarClock size={12} /> Set Up Queue
            </button>
          )}
          {(() => {
            const activeDayRun = selectedDayRunId ? queueRuns.find(r => r.id === selectedDayRunId) : null;
            const dayLabel = activeDayRun ? ` · Day ${activeDayRun.dayNumber}` : "";
            const activeStyle = activeDayRun ? { borderColor: (T.blue || "#3b82f6") + "55", color: T.blue || "#3b82f6" } : {};
            return (
              <>
                <button
                  onClick={async () => {
                    if (activeDayRun) {
                      await exportCampaignDayBlob(campaign.id, activeDayRun.dayNumber, 'excel');
                    } else {
                      setShowExcelModal(true);
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 12px", borderRadius: 7, border: "1px solid " + T.border,
                    background: T.surface, color: T.dim, fontSize: 12, cursor: "pointer",
                    fontFamily: "inherit", ...activeStyle,
                  }}
                >
                  <Download size={13} /> Excel{dayLabel}
                </button>
                <button
                  disabled={pdfExporting}
                  onClick={async () => {
                    setPdfExporting(true);
                    try {
                      if (activeDayRun) {
                        await exportCampaignDayBlob(campaign.id, activeDayRun.dayNumber, 'pdf');
                      } else {
                        await exportCampaignBlob(campaign.id, 'pdf');
                      }
                    } catch { /* ignore */ }
                    finally { setPdfExporting(false); }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 12px", borderRadius: 7, border: "1px solid " + T.border,
                    background: T.surface, fontSize: 12, fontFamily: "inherit",
                    color: pdfExporting ? T.muted : (activeDayRun ? (T.blue || "#3b82f6") : T.dim),
                    borderColor: activeDayRun ? (T.blue || "#3b82f6") + "55" : T.border,
                    cursor: pdfExporting ? "not-allowed" : "pointer",
                    opacity: pdfExporting ? 0.6 : 1,
                  }}
                >
                  <Download size={13} /> {pdfExporting ? "Generating…" : `PDF${dayLabel}`}
                </button>
              </>
            );
          })()}
          <RefreshBtn onClick={load} loading={loading} />
        </div>
      </div>

      {/* ── Queue Status Banner ── */}
      {queue && queue.status !== "cancelled" && (
        <div style={{
          background: T.card, border: "1px solid " + (queue.status === "active" ? T.blue + "50" : T.border),
          borderRadius: 12, padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          {/* Icon */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: (queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green) + "18",
            border: "1px solid " + (queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green) + "30",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CalendarClock size={16} color={queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Queue</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green,
                background: (queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green) + "18",
                border: "1px solid " + (queue.status === "active" ? T.blue : queue.status === "paused" ? T.amber : T.green) + "30",
              }}>
                {queue.status === "active" ? "Active" : queue.status === "paused" ? "Paused" : "Completed"}
              </span>
            </div>
            {(() => {
              const nextRun   = queueRuns.find(r => r.status === "pending" || r.status === "running");
              const countdown = nextRun ? fmtCountdown(nextRun.scheduledAt) : null;
              const localTime = nextRun ? fmtLocalTime(nextRun.scheduledAt) : null;
              const totalDays = Math.ceil(queue.totalRecipients / queue.dailyLimit) || "?";
              const sentPct   = queue.totalRecipients > 0
                ? Math.min(100, Math.round(queue.totalSent / queue.totalRecipients * 100))
                : 0;
              const barColor  = queue.status === "completed" ? T.green : T.blue;

              return (
                <div>
                  {/* Progress row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>
                      {queue.totalSent?.toLocaleString()} <span style={{ fontWeight: 400, color: T.muted }}>of</span> {queue.totalRecipients?.toLocaleString()} sent
                    </span>
                    <div style={{ flex: 1, height: 5, borderRadius: 4, background: T.border, overflow: "hidden", minWidth: 60 }}>
                      <div style={{ height: "100%", borderRadius: 4, background: barColor, width: sentPct + "%", transition: "width 0.4s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: barColor, whiteSpace: "nowrap" }}>{sentPct}%</span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      Day <strong style={{ color: T.text }}>{queue.currentDay}</strong> of <strong style={{ color: T.text }}>{totalDays}</strong>
                    </span>

                    {nextRun && queue.status === "active" && (
                      nextRun.status === "running"
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: T.amber }}>Sending now…</span>
                        : <span style={{ fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={10} />
                            Next in <strong style={{ color: T.blue }}>{countdown}</strong>
                            <span style={{ color: T.border }}>·</span>
                            {localTime}
                          </span>
                    )}

                    {queue.status === "paused" && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.amber }}>Paused</span>
                    )}

                    {queue.estimatedEndAt && queue.status === "active" && (
                      <span style={{ fontSize: 11, color: T.muted }}>
                        Ends <strong style={{ color: T.text }}>{new Date(queue.estimatedEndAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
                      </span>
                    )}
                  </div>

                  {/* Live stats — visible when queue is active */}
                  {queue.status === "active" && (() => {
                    const liveSent      = analytics?.totals?.sent ?? queue.totalSent ?? 0;
                    const remaining     = Math.max(0, queue.totalRecipients - liveSent);
                    const todayLimit    = queue.dailyLimit ?? 0;
                    const prevSent      = queue.totalSent ?? 0;
                    const todaySent     = Math.max(0, liveSent - prevSent);
                    const todayLeft     = Math.max(0, todayLimit - todaySent);
                    const gapSec        = queue.sendGapSeconds ?? 5;
                    const estMinToday   = Math.round(todayLeft * gapSec / 60);
                    return (
                      <div style={{
                        display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap",
                      }}>
                        {[
                          { label: "Remaining", value: remaining.toLocaleString(), color: T.blue },
                          { label: "Today's batch", value: `${todaySent.toLocaleString()} / ${todayLimit.toLocaleString()}`, color: T.text },
                          ...(nextRun?.status === "running" && estMinToday > 0
                            ? [{ label: "Est. time left today", value: estMinToday >= 60 ? `~${Math.round(estMinToday/60)}h ${estMinToday%60}m` : `~${estMinToday}m`, color: T.amber }]
                            : []),
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{
                            background: T.surface, border: "1px solid " + T.border,
                            borderRadius: 6, padding: "4px 10px",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <span style={{ fontSize: 10, color: T.muted }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {queue.status === "active" && (
              <button
                onClick={handleQueuePause} disabled={queueActing}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                  borderRadius: 7, border: "1px solid " + T.amber + "60", background: T.amber + "12",
                  color: T.amber, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Pause size={12} /> Pause
              </button>
            )}
            {queue.status === "paused" && (
              <button
                onClick={handleQueueResume} disabled={queueActing}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                  borderRadius: 7, border: "1px solid " + T.green + "60", background: T.green + "12",
                  color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Play size={12} /> Resume
              </button>
            )}
            <button
              onClick={() => setShowQueueModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
                borderRadius: 7, border: "1px solid " + T.border, background: T.surface,
                color: T.dim, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Settings2 size={12} /> Settings
            </button>
          </div>
        </div>
      )}


      {/* ── Campaign Summary Cards ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          {
            key:   "all",
            icon:  <Users size={14} />,
            label: "Recipients",
            value: campaign.recipientsCount ?? 0,
            rate:  null,
            rateLabel: "contacts targeted",
            color: T.accent,
          },
          {
            key:   "sent",
            icon:  <Send size={14} />,
            label: "Sent",
            value: totals.sent ?? campaign.sentCount ?? 0,
            rate:  null,
            rateLabel: "emails sent",
            color: T.blue,
          },
          {
            key:   "delivered",
            icon:  <CheckCircle2 size={14} />,
            label: "Delivered",
            value: totals.delivered ?? campaign.deliveredCount ?? 0,
            rate:  rates.deliveryRate ?? 0,
            rateLabel: "delivery rate",
            color: T.teal,
          },
          {
            key:   "opened",
            icon:  <Mail size={14} />,
            label: "Opened",
            value: totals.opened ?? campaign.openedCount ?? 0,
            rate:  rates.openRate ?? 0,
            rateLabel: "open rate",
            color: T.green,
          },
          {
            key:   "clicked",
            icon:  <MousePointerClick size={14} />,
            label: "Clicked",
            value: totals.clicked ?? campaign.clickedCount ?? 0,
            rate:  rates.clickRate ?? 0,
            rateLabel: "click rate",
            color: T.accent,
          },
          {
            key:   "bounced",
            icon:  <AlertCircle size={14} />,
            label: "Bounced",
            value: totals.bounced ?? campaign.bouncedCount ?? 0,
            rate:  rates.bounceRate ?? 0,
            rateLabel: "bounce rate",
            color: T.red,
          },
          {
            key:   "unsubscribed",
            icon:  <UserMinus size={14} />,
            label: "Unsubscribed",
            value: totals.unsubscribed ?? campaign.unsubscribedCount ?? 0,
            rate:  rates.unsubscribeRate ?? 0,
            rateLabel: "unsub rate",
            color: T.orange,
          },
        ].map(({ key, icon, label, value, rate, rateLabel, color }) => {
          const isActive = statusFilter === key;
          return (
            <div
              key={key}
              onClick={() => setStatusFilter(f => f === key ? (key === "all" ? "all" : "all") : key)}
              style={{
                flex: "1 1 120px",
                background: isActive ? color + "14" : T.card,
                border: "1px solid " + (isActive ? color + "55" : T.border),
                borderRadius: 12,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "border-color 0.12s, background 0.12s",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = color + "40"; e.currentTarget.style.background = T.surface; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; } }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: isActive ? color : T.muted }}>
                {icon}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: isActive ? color : T.text, lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {rate !== null ? <span style={{ fontWeight: 700, color: value > 0 ? color : T.muted }}>{rate}%</span> : null}
                {rate !== null ? " " : ""}{rateLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main content area (recipients + optional activity panel) ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

        {/* ── Recipients section ── */}
        <div style={{
          flex: 1, minWidth: 0,
          background: T.card, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden",
        }}>
          {/* Section header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            padding: "14px 20px", borderBottom: "1px solid " + T.border,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Users size={14} color={T.muted} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recipients</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.accent,
                background: T.accent + "18", borderRadius: 10, padding: "1px 9px",
              }}>
                {filteredTotal !== null && filteredTotal !== campaign.recipientsCount
                  ? <>{filteredTotal} <span style={{ opacity: 0.55 }}>of {campaign.recipientsCount}</span></>
                  : campaign.recipientsCount}
              </span>
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", borderRadius: 7, border: "1px solid " + T.border, overflow: "hidden" }}>
              {[["table", <List size={13} />], ["graph", <BarChart2 size={13} />]].map(([mode, icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", border: "none", fontFamily: "inherit",
                    background: viewMode === mode ? T.accent + "18" : T.surface,
                    color: viewMode === mode ? T.accent : T.muted,
                    fontSize: 11, fontWeight: viewMode === mode ? 700 : 500,
                    cursor: "pointer", borderRight: mode === "table" ? "1px solid " + T.border : "none",
                  }}
                >
                  {icon}
                  <span style={{ textTransform: "capitalize" }}>{mode}</span>
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={12} color={T.muted} style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
              }} />
              <input
                placeholder="Search contacts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 7, border: "1px solid " + T.border,
                  background: T.surface, color: T.text, fontSize: 12, fontFamily: "inherit",
                  outline: "none", width: 300,
                }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: "7px 10px", borderRadius: 7, border: "1px solid " + T.border,
                background: T.surface, color: statusFilter === "all" ? T.muted : T.text,
                fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer",
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="bounced">Bounced</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>

            {/* Clear All */}
            {campaign.recipientsCount > 0 && !isSent && (
              <button
                onClick={handleClearRecipients}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 6, border: "1px solid " + T.border,
                  background: "transparent", color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Trash2 size={11} /> Clear All
              </button>
            )}
          </div>

          {/* Day filter row (only shown when queue exists) */}
          {queue && queueRuns.length > 0 && (
            <div style={{
              padding: "8px 20px", borderBottom: "1px solid " + T.border,
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
                Day
              </span>
              {[{ id: null, label: "All" }, ...queueRuns.map(r => ({ id: r.id, label: `Day ${r.dayNumber}` }))].map(d => {
                const active = selectedDayRunId === d.id;
                return (
                  <button
                    key={d.id ?? "all"}
                    onClick={() => { setSelectedDayRunId(d.id); setTableKey(k => k + 1); }}
                    style={{
                      padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      background: active ? T.blue + "18" : T.surface,
                      border: "1px solid " + (active ? (T.blue || "#3b82f6") : T.border),
                      color: active ? (T.blue || "#3b82f6") : T.muted,
                      transition: "all 0.12s",
                    }}
                  >
                    {d.label}
                    {d.id && queueRuns.find(r => r.id === d.id)?.status === "completed" && (
                      <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Body */}
          {campaign.recipientsCount === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "60px 20px", textAlign: "center",
            }}>
              <Users size={40} color={T.border} style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginBottom: 6 }}>No recipients yet</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>
                Click "Add Recipients" to get started.
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 8, border: "none",
                  background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Plus size={13} /> Add Recipients
              </button>
            </div>
          ) : viewMode === "graph" ? (
            <div style={{ padding: 20 }}>
              <CampaignGraphView
                campaign={campaign}
                analytics={analytics}
                queue={queue}
                queueRuns={queueRuns}
                selectedDayRunId={selectedDayRunId}
              />
            </div>
          ) : (
            <RecipientsTable
              key={`${tableKey}-${statusFilter}-${search}-${selectedDayRunId}`}
              campaignId={id}
              statusFilter={statusFilter}
              search={search}
              isAbTest={isAbTest}
              refreshKey={tableKey}
              onSelectContact={handleSelectRecipient}
              selectedContactId={selectedRecipient?.contact?.id}
              onTotalChange={setFilteredTotal}
              queueRunId={selectedDayRunId}
            />
          )}
        </div>

        {/* ── Lead activity panel ── */}
        {selectedRecipient && (
          <LeadActivityPanel
            recipient={selectedRecipient}
            contact={contactDetail}
            loading={contactLoading}
            onClose={() => { setSelectedRecipient(null); setContactDetail(null); }}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddRecipientsModal
          campaignId={id}
          clientId={campaign.clientId}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
      {showSendModal && (
        <SendConfirmModal
          campaign={campaign}
          onClose={() => setShowSendModal(false)}
          onConfirm={handleSend}
          loading={sending}
        />
      )}
      {showResendModal && (
        <ResendModal
          campaign={campaign}
          onClose={() => setShowResendModal(false)}
          onConfirm={handleResend}
          loading={sending}
        />
      )}
      {showEditModal && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}
      {showCancelModal && (
        <CancelCampaignModal
          campaign={campaign}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelCampaign}
          loading={cancelActing}
        />
      )}
      {showRestoreModal && (
        <RestoreCampaignModal
          campaign={campaign}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestoreCampaign}
          loading={cancelActing}
        />
      )}

      {/* Queue Settings Modal */}
      {showQueueModal && (
        <QueueSettingsModal
          queue={queue}
          onClose={() => setShowQueueModal(false)}
          onSave={handleQueueSave}
          saving={queueActing}
        />
      )}

      {/* Excel Export Modal */}
      {showExcelModal && (
        <ExcelExportModal
          campaign={campaign}
          sheets={excelSheets}
          setSheets={setExcelSheets}
          exporting={excelExporting}
          onClose={() => setShowExcelModal(false)}
          onExport={async () => {
            setExcelExporting(true);
            try {
              const selected = Object.entries(excelSheets)
                .filter(([, v]) => v)
                .map(([k]) => k);
              await exportCampaignBlob(campaign.id, 'excel', {
                sheets: selected.length ? selected.join(',') : 'all',
              });
              setShowExcelModal(false);
            } catch { /* ignore */ }
            finally { setExcelExporting(false); }
          }}
        />
      )}
    </div>
  );
}

// ── Queue Settings Modal ──────────────────────────────────────────────────────
const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
];

const DAY_LIST = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

function QueueSettingsModal({ queue, onClose, onSave, saving }) {
  const T = useTheme();
  const [dailyLimit,     setDailyLimit]     = useState(String(queue?.dailyLimit || 500));
  const [sendTime,       setSendTime]       = useState(queue?.sendTime || "09:00");
  const [timezone,       setTimezone]       = useState(queue?.timezone || "UTC");
  const [sendGapSeconds, setSendGapSeconds] = useState(String(queue?.sendGapSeconds ?? 5));
  const [sendDays,       setSendDays]       = useState(
    Array.isArray(queue?.sendDays) && queue.sendDays.length ? queue.sendDays : [0,1,2,3,4,5,6]
  );

  const toggleDay = (val) => {
    setSendDays(prev =>
      prev.includes(val)
        ? prev.length > 1 ? prev.filter(d => d !== val) : prev  // keep at least 1
        : [...prev, val]
    );
  };

  const isEdit = queue && queue.status !== "cancelled";

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 7, boxSizing: "border-box",
    background: T.surface, border: "1px solid " + T.border,
    color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
  };

  const handleSave = () => {
    const limit = parseInt(dailyLimit, 10);
    const gap   = Math.max(0, parseInt(sendGapSeconds, 10) || 0);
    if (!limit || limit < 1) return;
    onSave({ dailyLimit: limit, sendTime, timezone, sendGapSeconds: gap, sendDays });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        width: 420, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 22px 14px", borderBottom: "1px solid " + T.border }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: (T.blue || "#3b82f6") + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CalendarClock size={16} color={T.blue || "#3b82f6"} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
              {isEdit ? "Queue Settings" : "Set Up Queue"}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
              {isEdit ? "Update daily limit and send schedule" : "Configure automated daily sending"}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Daily limit */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>
              Daily Send Limit <span style={{ color: T.accent }}>*</span>
            </div>
            <input
              type="number" min="1" value={dailyLimit}
              onChange={e => setDailyLimit(e.target.value)}
              placeholder="e.g. 500"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
              Max emails sent per day. The queue will run over multiple days to reach all recipients.
            </div>
          </div>

          {/* Send time */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>
              Send Time (UTC) <span style={{ color: T.accent }}>*</span>
            </div>
            <input
              type="time" value={sendTime}
              onChange={e => setSendTime(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Timezone (informational) */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>
              Reference Timezone
            </div>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {/* Gap between sends */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>
              Gap Between Each Send (seconds)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min="0" max="300" value={sendGapSeconds}
                onChange={e => setSendGapSeconds(e.target.value)}
                placeholder="5"
                style={{ ...inputStyle, width: 100 }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              <span style={{ fontSize: 11, color: T.muted }}>seconds per lead</span>
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
              Each contact is sent individually with this delay between sends.
              {parseInt(sendGapSeconds) > 0 && parseInt(dailyLimit) > 0 && (
                <span style={{ color: T.dim, marginLeft: 4 }}>
                  ({Math.round(parseInt(dailyLimit) * parseInt(sendGapSeconds) / 60)} min total per day)
                </span>
              )}
            </div>
          </div>

          {/* Send days */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 8, letterSpacing: "0.03em" }}>
              Active Send Days
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAY_LIST.map(({ label, value }) => {
                const active = sendDays.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleDay(value)}
                    style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      border: "1px solid " + (active ? (T.blue || "#3b82f6") : T.border),
                      background: active ? (T.blue || "#3b82f6") + "22" : T.surface,
                      color: active ? (T.blue || "#3b82f6") : T.muted,
                      transition: "all 0.15s",
                      opacity: active ? 1 : 0.55,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>
              The queue will only run on selected days. At least one day must remain active.
            </div>
          </div>

          {dailyLimit && parseInt(dailyLimit) > 0 && (
            <div style={{
              background: (T.blue || "#3b82f6") + "0d",
              border: "1px solid " + (T.blue || "#3b82f6") + "30",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 11, color: T.dim, lineHeight: 1.6,
            }}>
              ⏰ First send will be scheduled for today at <strong>{sendTime}</strong> UTC.
              The system will automatically run on selected days until all recipients are sent.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 22px", borderTop: "1px solid " + T.border }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !parseInt(dailyLimit)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: saving || !parseInt(dailyLimit) ? T.border : (T.blue || "#3b82f6"),
              color: saving || !parseInt(dailyLimit) ? T.muted : "#fff",
              fontSize: 13, fontWeight: 600,
              cursor: saving || !parseInt(dailyLimit) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
              : <><CalendarClock size={13} /> {isEdit ? "Save Changes" : "Enable Queue"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Excel Export Modal ────────────────────────────────────────────────────────
function ExcelExportModal({ campaign, sheets, setSheets, exporting, onClose, onExport }) {
  const T = useTheme();
  const SHEET_OPTIONS = [
    { key: 'clicked',      label: 'Clicked',      desc: 'Contacts who clicked a link in the email' },
    { key: 'opened',       label: 'Opened',       desc: 'Contacts who opened the email' },
    { key: 'delivered',    label: 'Delivered',    desc: 'Confirmed delivery (not yet opened)' },
    { key: 'sent',         label: 'Sent',         desc: 'All sent recipients regardless of event' },
    { key: 'bounced',      label: 'Bounced',      desc: 'Emails that could not be delivered' },
    { key: 'unsubscribed', label: 'Unsubscribed', desc: 'Contacts who opted out' },
  ];
  const noneSelected = !Object.values(sheets).some(Boolean);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 14, width: 440, maxWidth: "95vw",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px", borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Export to Excel</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {campaign.name} — choose which recipient groups to include as sheets
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: T.muted,
            cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px",
          }}>✕</button>
        </div>

        {/* Sheet options */}
        <div style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sheets to include
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SHEET_OPTIONS.map(({ key, label, desc }) => (
              <label key={key} style={{
                display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                padding: "10px 12px", borderRadius: 8,
                background: sheets[key] ? T.accent + "12" : T.card,
                border: "1px solid " + (sheets[key] ? T.accent + "50" : T.border),
                transition: "all 0.15s",
              }}>
                <input
                  type="checkbox"
                  checked={!!sheets[key]}
                  onChange={e => setSheets(prev => ({ ...prev, [key]: e.target.checked }))}
                  style={{ accentColor: T.accent, width: 15, height: 15, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{label}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 10 }}>
            A <strong style={{ color: T.dim }}>Summary</strong> sheet with campaign metrics is always included.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px 16px", borderTop: "1px solid " + T.border,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border,
            background: "none", color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            disabled={noneSelected || exporting}
            onClick={onExport}
            style={{
              padding: "8px 18px", borderRadius: 7, border: "none",
              background: noneSelected || exporting ? T.muted : T.green,
              color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: noneSelected || exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Download size={13} />
            {exporting ? "Downloading…" : "Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
