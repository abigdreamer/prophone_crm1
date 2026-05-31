import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { portalGetLeads, portalGetLead } from "../../services/api";
import { Search, X, ChevronRight } from "lucide-react";
import { ContentLoader } from "../../components/ui/Loader";

const STAGE_COLORS = {
  new: "#6366f1", contacted: "#3b82f6", engaged: "#8b5cf6",
  demo_scheduled: "#f59e0b", demo_done: "#f97316",
  proposal_sent: "#10b981", negotiating: "#06b6d4",
  customer: "#22c55e", not_qualified: "#6b7280",
  lost: "#ef4444", churned: "#9ca3af",
};

const STAGE_LABELS = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  demo_scheduled: "Demo Sched.", demo_done: "Demo Done",
  proposal_sent: "Proposal Sent", negotiating: "Negotiating",
  customer: "Customer", not_qualified: "Not Qualified",
  lost: "Lost", churned: "Churned",
};

function StageBadge({ stage, T }) {
  const color = STAGE_COLORS[stage] || "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: color + "18", color, border: "1px solid " + color + "30",
    }}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

export default function ClientPortalLeads() {
  const T = useTheme();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchLeads = useCallback(async (p = 1, s = "") => {
    setLoading(true);
    try {
      const params = { page: p, limit };
      if (s) params.search = s;
      const res = await portalGetLeads(params);
      setLeads(res.data || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(1, ""); }, [fetchLeads]);

  const handleSearch = useCallback((val) => {
    setSearch(val);
    fetchLeads(1, val);
  }, [fetchLeads]);

  async function selectLead(lead) {
    setSelected(lead);
    setDetailLoading(true);
    try {
      const full = await portalGetLead(lead.id);
      setSelected(full);
    } catch {}
    finally { setDetailLoading(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>My Leads</h1>
        <p style={{ fontSize: 13, color: T.muted }}>{total} lead{total !== 1 ? "s" : ""} in your account</p>
      </div>

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 180px)", minHeight: 0 }}>
        {/* Lead list */}
        <div style={{
          width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
          background: T.surface, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid " + T.border }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search leads…"
                style={{
                  width: "100%", padding: "7px 28px 7px 30px", boxSizing: "border-box",
                  background: T.bg, border: "1px solid " + T.border, borderRadius: 7,
                  color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
                }}
              />
              {search && (
                <button
                  onClick={() => handleSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 20 }}><ContentLoader /></div>
            ) : leads.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 12 }}>No leads found</div>
            ) : leads.map(lead => {
              const active = selected?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    background: active ? "#6366f118" : "transparent",
                    borderBottom: "1px solid " + T.border,
                    borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 3 }}>
                    {lead.firstName} {lead.lastName}
                  </div>
                  {lead.company && <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{lead.company}</div>}
                  <StageBadge stage={lead.lifecycleStage} T={T} />
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{
              padding: "8px 12px", borderTop: "1px solid " + T.border,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <button
                onClick={() => fetchLeads(page - 1, search)}
                disabled={page <= 1}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + T.border, background: "none", cursor: page <= 1 ? "not-allowed" : "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit" }}
              >
                Prev
              </button>
              <span style={{ fontSize: 11, color: T.muted }}>{page} / {Math.ceil(total / limit)}</span>
              <button
                onClick={() => fetchLeads(page + 1, search)}
                disabled={page * limit >= total}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + T.border, background: "none", cursor: page * limit >= total ? "not-allowed" : "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit" }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{
          flex: 1, background: T.surface, border: "1px solid " + T.border,
          borderRadius: 12, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {!selected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.muted, fontSize: 13 }}>
              Select a lead to view details
            </div>
          ) : detailLoading ? (
            <div style={{ padding: 24 }}><ContentLoader /></div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                  {selected.firstName} {selected.lastName}
                </h2>
                {selected.company && <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>{selected.title ? `${selected.title} · ` : ""}{selected.company}</div>}
                <StageBadge stage={selected.lifecycleStage} T={T} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Email",    value: selected.email },
                  { label: "Phone",    value: selected.phone },
                  { label: "Source",   value: selected.source },
                  { label: "Campaign", value: selected.campaign },
                  { label: "Lead Score", value: selected.leadScore },
                  { label: "Status",   value: selected.status },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} style={{ background: T.bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, color: T.text }}>{String(value)}</div>
                  </div>
                ))}
              </div>

              {selected.tags?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.tags.map(tag => (
                      <span key={tag} style={{ padding: "2px 9px", borderRadius: 20, background: T.border, color: T.dim, fontSize: 11 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.activities?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Activity History</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selected.activities.slice(0, 20).map(act => (
                      <div key={act.id} style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: "1px solid " + T.border }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 5 }} />
                        <div>
                          <div style={{ fontSize: 12, color: T.text }}>{act.note || act.type}</div>
                          <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                            {act.by && <span>{act.by} · </span>}
                            {new Date(act.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
