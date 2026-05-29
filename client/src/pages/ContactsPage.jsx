import { useState, useEffect, useRef } from "react";
import { RefreshCw, Mail, XCircle, ChevronDown } from "lucide-react";
import { useAppToast } from "../context/ToastContext";
import Card from "../components/ui/Card";
import { StagePill } from "../components/ui/Pill";
import ScoreBar from "../components/ui/ScoreBar";
import Avatar from "../components/ui/Avatar";
import Hi from "../components/ui/Hi";
import { RestoreModal } from "../components/modals/RestoreModal";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { useClientById } from "../context/ClientsContext";
import { VIEW_MODE, STATUS, STAGE_GROUPS } from "../constants/index";
import fmt from "../utils/format";
import * as db from "../services/api";
import CampaignSendModal from "../components/CampaignSendModal";

const PAGE_SIZE = 100;

const STATUS_META = {
  [STATUS.ACTIVE]: { label: "Active" },
  [STATUS.PENDING]: { label: "Pending" },
  [STATUS.CANCELED]: { label: "Canceled" },
};

function contactDisplayName(c) {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || c?.email || "Unknown Contact";
}

function StatusBadge({ status }) {
  const T = useTheme();
  const colorMap = {
    [STATUS.ACTIVE]: T.green,
    [STATUS.PENDING]: T.amber,
    [STATUS.INACTIVE]: T.muted,
    [STATUS.CANCELED]: T.red,
  };
  const color = colorMap[status] || T.muted;
  const label = STATUS_META[status]?.label || (status || "active");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: color + "15", color, border: "1px solid " + color + "30",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function getPageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default function ContactsPage({
  pool, clientId, viewMode, onSelect, selected, search,
  contacts, setContacts, currentUser, onRestoreContact,
}) {
  const T = useTheme();
  const [sortBy, setSortBy] = useState("lastActivityAt");
  const [displayLimit, setDisplayLimit] = useState(null); // null = no cap
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkCanceling, setBulkCanceling] = useState(false);
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const selectMenuRef = useRef(null);
  const toast = useAppToast();

  const q = (search || "").trim();
  const showingCanceled = viewMode === VIEW_MODE.CANCELED;

  useEffect(() => { setPage(1); }, [sortBy, q, viewMode, displayLimit]);
  useEffect(() => { setSelectedIds(new Set()); }, [viewMode, q]);

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);

  const viewModeStages = STAGE_GROUPS[viewMode];

  const rows = contacts
    .filter(c => {
      if (viewModeStages !== undefined && viewModeStages.length > 0) {
        if (!viewModeStages.includes(c.lifecycleStage)) return false;
      }
      if (!q) return true;
      const ql = q.toLowerCase();
      const name = contactDisplayName(c).toLowerCase();
      return (
        name.includes(ql) ||
        (c.email || "").toLowerCase().includes(ql) ||
        (c.company || "").toLowerCase().includes(ql) ||
        (c.address || "").toLowerCase().includes(ql) ||
        (c.city || "").toLowerCase().includes(ql)
      );
    })
    .sort((a, b) => {
      if (sortBy === "leadScore") return b.leadScore - a.leadScore;
      if (sortBy === "value") return (b.contractValue || 0) - (a.contractValue || 0);
      if (sortBy === "name") return contactDisplayName(a).localeCompare(contactDisplayName(b));
      if (sortBy === "trucks") return (b.trucks || 0) - (a.trucks || 0);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  // Apply optional display cap — lets the user focus on the first N filtered results
  const cappedRows = displayLimit ? rows.slice(0, displayLimit) : rows;
  const isLimited   = displayLimit !== null && rows.length > displayLimit;

  const totalPages = Math.max(1, Math.ceil(cappedRows.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = cappedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = cappedRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(safePage * PAGE_SIZE, cappedRows.length);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const fresh = showingCanceled ? await db.getCanceledContacts() : await db.getContacts();
      setContacts(fresh);
    } catch {
      toast.error("Failed to refresh contacts.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    try {
      await db.restoreContact(restoreTarget.id);
      if (onRestoreContact) await onRestoreContact(restoreTarget.id);
      setRestoreTarget(null);
      toast.success("Contact restored.");
    } catch {
      toast.error("Failed to restore contact.");
    } finally {
      setRestoreLoading(false);
    }
  }

  const allPageIds = pageRows.map(c => c.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));
  const somePageSelected = allPageIds.some(id => selectedIds.has(id));

  function toggleSelectAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) { allPageIds.forEach(id => next.delete(id)); }
      else { allPageIds.forEach(id => next.add(id)); }
      return next;
    });
  }

  function toggleSelectOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectBulk(n) {
    const ids = cappedRows.slice(0, n).map(c => c.id);
    setSelectedIds(new Set(ids));
    setSelectMenuOpen(false);
  }

  useEffect(() => {
    if (!selectMenuOpen) return;
    function handleClickOutside(e) {
      if (selectMenuRef.current && !selectMenuRef.current.contains(e.target)) {
        setSelectMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectMenuOpen]);

  async function handleBulkCancel() {
    setBulkCanceling(true);
    try {
      await Promise.all([...selectedIds].map(id => db.cancelContact(id, "Bulk canceled")));
      const fresh = await db.getContacts();
      setContacts(fresh);
      setSelectedIds(new Set());
      setBulkCancelOpen(false);
      toast.success(`${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""} canceled.`);
    } catch {
      toast.error("Failed to cancel some contacts.");
    } finally {
      setBulkCanceling(false);
    }
  }

  const selectStyle = {
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "5px 9px", color: T.text, fontSize: 11,
    fontFamily: "inherit", outline: "none", cursor: "pointer",
  };

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {restoreTarget && (
        <RestoreModal
          title="Restore Contact"
          message={`Restore ${contactDisplayName(restoreTarget)} back to active contacts?`}
          loading={restoreLoading}
          onRestore={handleRestoreConfirm}
          onClose={() => { if (!restoreLoading) setRestoreTarget(null); }}
        />
      )}

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && !showingCanceled && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
          background: T.accent + "12", border: "1px solid " + T.accent + "30",
          borderRadius: 8, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>
            {selectedIds.size} selected
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setSendEmailOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: T.blue, border: "none", borderRadius: 6,
              color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Mail size={12} /> Send Email Campaign
          </button>
          <button
            onClick={() => setBulkCancelOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: "transparent", border: "1px solid " + T.red + "60",
              borderRadius: 6, color: T.red, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <XCircle size={12} /> Cancel Leads
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: "transparent", border: "none", color: T.muted,
              fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "4px 8px",
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk cancel confirmation */}
      {bulkCancelOpen && (
        <div style={{
          background: T.red + "08", border: "1px solid " + T.red + "30",
          borderRadius: 8, padding: "14px 18px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 6 }}>Cancel {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""}?</div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 12 }}>
            These contacts will be removed from the active list. You can restore them at any time.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleBulkCancel}
              disabled={bulkCanceling}
              style={{
                padding: "6px 16px", background: T.red, border: "none", borderRadius: 6,
                color: "#fff", fontSize: 11, fontWeight: 600, cursor: bulkCanceling ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {bulkCanceling ? "Canceling…" : "Confirm Cancel"}
            </button>
            <button
              onClick={() => setBulkCancelOpen(false)}
              disabled={bulkCanceling}
              style={{
                padding: "6px 14px", background: "transparent", border: "1px solid " + T.border,
                borderRadius: 6, color: T.dim, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Keep Active
            </button>
          </div>
        </div>
      )}

      {/* Minimal header — count + limit + sort + refresh */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          {isLimited
            ? <>{cappedRows.length.toLocaleString()} <span style={{ fontWeight: 400, color: T.muted }}>of {rows.length.toLocaleString()}</span> contacts</>
            : <>{rows.length.toLocaleString()} contacts</>
          }
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={displayLimit ?? ""}
            onChange={e => { setDisplayLimit(e.target.value ? parseInt(e.target.value, 10) : null); }}
            style={{ ...selectStyle, color: displayLimit ? T.accent : T.text, borderColor: displayLimit ? T.accent + "60" : T.border }}
            title="Limit displayed records"
          >
            <option value="">Show all</option>
            <option value="100">First 100</option>
            <option value="250">First 250</option>
            <option value="500">First 500</option>
            <option value="1000">First 1,000</option>
            <option value="2000">First 2,000</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
            <option value="lastActivityAt">Recent Activity</option>
            <option value="name">Name A–Z</option>
            <option value="leadScore">Lead Score</option>
            <option value="value">Contract Value</option>
            <option value="trucks">Fleet Size</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: T.card, border: "1px solid " + T.border, borderRadius: 7,
              color: T.dim, fontSize: 12, cursor: refreshing ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "crm-spin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {!showingCanceled && (
                  <th style={{ padding: "8px 6px", width: 52 }}>
                    <div ref={selectMenuRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer", accentColor: T.accent }}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); setSelectMenuOpen(v => !v); }}
                        title="Bulk select"
                        style={{
                          background: "none", border: "none", padding: "1px 2px",
                          cursor: "pointer", color: T.muted, display: "flex", alignItems: "center",
                          borderRadius: 3,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = T.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}
                      >
                        <ChevronDown size={11} />
                      </button>

                      {selectMenuOpen && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
                          background: T.card, border: "1px solid " + T.border,
                          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.25)",
                          minWidth: 160, overflow: "hidden",
                        }}>
                          {[
                            { label: "Select first 100",  n: 100 },
                            { label: "Select first 500",  n: 500 },
                            { label: "Select first 1000", n: 1000 },
                          ].map(({ label, n }) => (
                            <button
                              key={n}
                              onClick={() => selectBulk(n)}
                              disabled={cappedRows.length === 0}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "8px 14px", background: "none", border: "none",
                                fontSize: 12, fontWeight: 600, color: cappedRows.length === 0 ? T.muted : T.text,
                                cursor: cappedRows.length === 0 ? "not-allowed" : "pointer",
                                fontFamily: "inherit",
                              }}
                              onMouseEnter={e => { if (rows.length > 0) e.currentTarget.style.background = T.accent + "12"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                            >
                              {label}
                              {cappedRows.length < n && (
                                <span style={{ fontSize: 10, color: T.muted, marginLeft: 4 }}>
                                  ({cappedRows.length} available)
                                </span>
                              )}
                            </button>
                          ))}
                          <div style={{ borderTop: "1px solid " + T.border, margin: "2px 0" }} />
                          <button
                            onClick={() => { setSelectedIds(new Set()); setSelectMenuOpen(false); }}
                            style={{
                              display: "block", width: "100%", textAlign: "left",
                              padding: "8px 14px", background: "none", border: "none",
                              fontSize: 12, fontWeight: 600, color: T.muted,
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.border + "44"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                          >
                            Deselect all
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {(showingCanceled
                  ? ["Name & Email", "Company", "Address", "Status", "Canceled By", "Last Activity", "Value", "Owner"]
                  : ["Name & Email", "Company", "Address", "Stage", "Status", "Score", "Last Activity", "Value", "Owner"]
                ).map((h, i) => (
                  <th key={i} style={{ padding: "8px 11px", textAlign: "left", color: T.muted, fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showingCanceled ? 8 : 10} style={{ padding: 24, textAlign: "center", color: T.muted }}>
                    No contacts found.
                  </td>
                </tr>
              ) : pageRows.map(c => {
                const ownUser = USERS_DB.find(u => u.name === c.ownedBy) || USERS_DB[0];
                const isSel = selected?.id === c.id;
                const isChecked = selectedIds.has(c.id);
                const status = c.status || (c.isCanceled ? STATUS.CANCELED : STATUS.ACTIVE);
                const displayName = contactDisplayName(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelect(c)}
                    style={{
                      borderBottom: "1px solid " + T.border, cursor: "pointer",
                      background: isChecked ? T.accent + "08" : isSel ? col + "10" : "transparent",
                      borderLeft: isSel ? "3px solid " + col : "3px solid transparent",
                    }}
                  >
                    {!showingCanceled && (
                      <td style={{ padding: "8px 11px", width: 32 }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(c.id)}
                          style={{ cursor: "pointer", accentColor: T.accent }}
                        />
                      </td>
                    )}
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ fontWeight: 600, color: T.text }}>
                        <Hi text={displayName} q={q} />
                      </div>
                      <div style={{ fontSize: 9, color: T.muted }}>
                        <Hi text={c.email} q={q} />
                      </div>
                    </td>
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ color: T.dim }}><Hi text={c.company} q={q} /></div>
                      <div style={{ color: T.muted, fontSize: 9 }}>{c.title}</div>
                    </td>
                    <td style={{ padding: "8px 11px", color: T.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Hi text={c.address || "—"} q={q} />
                    </td>

                    {showingCanceled ? (
                      <td style={{ padding: "8px 11px" }}>
                        <StatusBadge status={STATUS.CANCELED} />
                      </td>
                    ) : (
                      <>
                        <td style={{ padding: "8px 11px" }}><StagePill stage={c.lifecycleStage} /></td>
                        <td style={{ padding: "8px 11px" }}><StatusBadge status={status} /></td>
                      </>
                    )}

                    <td style={{ padding: "8px 11px" }}>
                      {showingCanceled
                        ? <span style={{ fontSize: 11, color: T.dim }}>{c.canceledBy || "—"}</span>
                        : <ScoreBar score={c.leadScore} />
                      }
                    </td>
                    <td style={{ padding: "8px 11px", color: T.dim }}>{fmt.ago(c.lastActivityAt)}</td>
                    <td style={{ padding: "8px 11px", color: T.green, fontWeight: 600 }}>
                      {c.contractValue ? "$" + c.contractValue.toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Avatar user={ownUser} size={22} />
                        {c.isCanceled && (
                          <button
                            onClick={e => { e.stopPropagation(); setRestoreTarget(c); }}
                            style={{
                              background: "transparent", border: "1px solid " + T.green + "55",
                              borderRadius: 4, cursor: "pointer", color: T.green, fontSize: 10,
                              padding: "2px 7px", fontFamily: "inherit",
                            }}
                          >↩ Restore</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            {rangeStart}–{rangeEnd} of {cappedRows.length.toLocaleString()}
            {isLimited && <span style={{ color: T.accent }}> (limited)</span>}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, cursor: safePage === 1 ? "default" : "pointer", background: T.surface, border: `1px solid ${T.border}`, color: safePage === 1 ? T.muted : T.text, fontFamily: "inherit" }}
            >← Prev</button>
            {getPageWindow(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} style={{ padding: "5px 4px", color: T.muted, fontSize: 11 }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p)}
                  style={{ minWidth: 32, padding: "5px 6px", borderRadius: 6, fontSize: 11, cursor: p === safePage ? "default" : "pointer", fontFamily: "inherit", background: p === safePage ? col : T.surface, border: `1px solid ${p === safePage ? col : T.border}`, color: p === safePage ? "#fff" : T.text, fontWeight: p === safePage ? 700 : 400 }}
                >{p}</button>
              )
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, cursor: safePage === totalPages ? "default" : "pointer", background: T.surface, border: `1px solid ${T.border}`, color: safePage === totalPages ? T.muted : T.text, fontFamily: "inherit" }}
            >Next →</button>
          </div>
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Page {safePage} of {totalPages}</span>
        </div>
      )}
    </div>

    {sendEmailOpen && (
      <CampaignSendModal
        contactIds={[...selectedIds]}
        contacts={contacts.filter(c => selectedIds.has(c.id))}
        onClose={() => setSendEmailOpen(false)}
        onSent={() => { setSendEmailOpen(false); setSelectedIds(new Set()); }}
      />
    )}
    </>
  );
}
