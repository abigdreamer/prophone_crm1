import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { useAppToast } from "../context/ToastContext";
import Card from "../components/ui/Card";
import { StagePill } from "../components/ui/Pill";
import ScoreBar from "../components/ui/ScoreBar";
import Avatar from "../components/ui/Avatar";
import Hi from "../components/ui/Hi";
import Btn from "../components/ui/Btn";
import ContactModal from "../components/modals/ContactModal";
import ImportModal from "../components/modals/ImportModal";
import { RestoreModal } from "../components/modals/RestoreModal";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { useClientById } from "../context/ClientsContext";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";
import { STAGE_GROUPS, VIEW_MODE_LABEL, STATUS } from "../constants/index";

const PAGE_SIZE = 100;

const STATUS_META = {
  [STATUS.ACTIVE]: { label: "Active" },
  [STATUS.PENDING]: { label: "Pending" },
  [STATUS.CANCELED]: { label: "Canceled" },
};

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

export default function ContactsPage({ pool, clientId, viewMode, onSelect, selected, search, contacts, setContacts, currentUser, onRestoreContact }) {
  const T = useTheme();
  const [stageF, setStageF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [sortBy, setSortBy] = useState("lastActivityAt");
  const [addModal, setAddModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editC, setEditC] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  // Server-filtered contacts — used when statusF !== 'all' and viewMode !== 'canceled'
  const [localContacts, setLocalContacts] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const fetchAbort = useRef(null);
  const toast = useAppToast();

  const q = (search || "").trim();

  useEffect(() => { setPage(1); }, [stageF, statusF, sortBy, q, viewMode]);

  const needsServerFetch =
    (statusF !== "all") && viewMode !== "canceled";

  useEffect(() => {
    if (!needsServerFetch) {
      setLocalContacts(null);
      setLocalLoading(false);
      return;
    }

    // Abort any previous in-flight fetch
    if (fetchAbort.current) fetchAbort.current = false;
    const token = {};
    fetchAbort.current = token;

    setLocalLoading(true);
    setLocalContacts(null);

    db.getContacts(statusF)
      .then(data => {
        if (fetchAbort.current !== token) return; // stale
        setLocalContacts(data);
        setLocalLoading(false);
      })
      .catch(() => {
        if (fetchAbort.current !== token) return;
        setLocalContacts([]);
        setLocalLoading(false);
        toast.error("Failed to filter contacts.");
      });
  }, [statusF, viewMode, pool, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const client = useClientById(clientId);
  const col = pool === "prospect" ? T.accent : (client?.color || T.accent);

  // Source data: prefer locally-fetched (status-filtered) results when available
  const sourceContacts = localContacts !== null ? localContacts : contacts;

  const modeFiltered = sourceContacts.filter(c => {
    // When we have server-filtered results, skip the viewMode stage-group filter
    // (server already scoped results; stage sub-filter still applies via stageF)
    if (localContacts !== null) return true;
    if (viewMode === "all" || !viewMode) return true;
    if (viewMode === "canceled") return true;
    const groupStages = STAGE_GROUPS[viewMode];
    return groupStages ? groupStages.includes(c.lifecycleStage) : true;
  });

  const rows = modeFiltered
    .filter(c => {
      if (stageF !== "all" && c.lifecycleStage !== stageF) return false;
      if (!q) return true;
      const ql = q.toLowerCase();
      return (
        (c.firstName + " " + c.lastName).toLowerCase().includes(ql) ||
        c.email.toLowerCase().includes(ql) ||
        (c.company || "").toLowerCase().includes(ql) ||
        (c.address || "").toLowerCase().includes(ql)
      );
    })
    .sort((a, b) => {
      if (sortBy === "leadScore") return b.leadScore - a.leadScore;
      if (sortBy === "value") return (b.contractValue || 0) - (a.contractValue || 0);
      if (sortBy === "name") return a.firstName.localeCompare(b.firstName);
      if (sortBy === "trucks") return (b.trucks || 0) - (a.trucks || 0);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, rows.length);

  const modeLabel = VIEW_MODE_LABEL[viewMode] || "Contacts";
  const stageOpts = STAGE_GROUPS[viewMode] || ALL_STAGES;
  const showingCanceled = viewMode === "canceled";

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (needsServerFetch) {
        const fresh = await db.getContacts(statusF);
        setLocalContacts(fresh);
      } else {
        const fresh = viewMode === "canceled"
          ? await db.getCanceledContacts()
          : await db.getContacts();
        setContacts(fresh);
      }
    } catch {
      toast.error("Failed to refresh contacts.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAdd(nc) {
    try {
      const saved = await db.createContact(nc);
      setContacts(prev => [saved, ...prev]);
      setAddModal(false);
      toast.success("Contact added.");
    } catch {
      toast.error("Failed to save contact.");
    }
  }

  async function handleEdit(updated) {
    try {
      const refreshed = await db.updateContact(updated.id, updated);
      setContacts(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      if (localContacts) setLocalContacts(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      setEditC(null);
      toast.success("Contact saved.");
    } catch {
      toast.error("Failed to update contact.");
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    try {
      await db.restoreContact(restoreTarget.id);
      if (onRestoreContact) await onRestoreContact(restoreTarget.id);
      // Remove from local filtered list too
      if (localContacts) setLocalContacts(prev => prev.filter(c => c.id !== restoreTarget.id));
      setRestoreTarget(null);
      toast.success("Contact restored.");
    } catch {
      toast.error("Failed to restore contact.");
    } finally {
      setRestoreLoading(false);
    }
  }

  const selectStyle = {
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "5px 9px", color: T.text, fontSize: 11,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {addModal && <ContactModal onSave={handleAdd} onClose={() => setAddModal(false)} pool={pool} clientId={clientId} currentUser={currentUser} />}
      {editC && <ContactModal contact={editC} onSave={handleEdit} onClose={() => setEditC(null)} pool={pool} clientId={clientId} currentUser={currentUser} />}
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          clientId={clientId}
          pool={pool}
          onImported={async () => {
            const fresh = await db.getContacts();
            setContacts(fresh);
          }}
        />
      )}
      {restoreTarget && (
        <RestoreModal
          title="Restore Contact"
          message={`Restore ${restoreTarget.firstName} ${restoreTarget.lastName} back to active contacts?`}
          loading={restoreLoading}
          onRestore={handleRestoreConfirm}
          onClose={() => { if (!restoreLoading) setRestoreTarget(null); }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {modeLabel}{" "}
            <span style={{ color: T.muted, fontSize: 13 }}>
              ({localLoading ? "…" : rows.length.toLocaleString()})
            </span>
          </div>
          <div style={{ fontSize: 10, color: col, marginTop: 1, fontWeight: 600, textTransform: "uppercase" }}>
            {pool === "prospect" ? "GeniusAI Prospect Pool" : `${client?.name} client leads`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", background: T.card,
              border: "1px solid " + T.border, borderRadius: 7, color: T.dim, fontSize: 12,
              cursor: refreshing ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "crm-spin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <select value={stageF} onChange={e => setStageF(e.target.value)} style={selectStyle}>
            <option value="all">All Stages</option>
            {stageOpts.map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selectStyle}>
            <option value="all">All Status</option>
            <option value={STATUS.ACTIVE}>Active</option>
            <option value={STATUS.PENDING}>Pending</option>
            <option value={STATUS.CANCELED}>Canceled</option>
          </select>

          {!showingCanceled && (
            <>
              <Btn variant="secondary" onClick={() => setImportModal(true)}>↑ Import</Btn>
              <Btn onClick={() => setAddModal(true)}>+ Add Contact</Btn>
            </>
          )}
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {(showingCanceled
                  ? ["Name & Email", "Company", "Address", "Status", "Canceled By", "Last Activity", "Value", "Owner", ""]
                  : ["Name & Email", "Company", "Address", "Stage", "Status", "Score", "Last Activity", "Value", "Owner", ""]
                ).map((h, i) => (
                  <th key={i} style={{ padding: "8px 11px", textAlign: "left", color: T.muted, fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 28, textAlign: "center", color: T.muted, fontSize: 12 }}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 24, textAlign: "center", color: T.muted }}>
                    No contacts found.
                  </td>
                </tr>
              ) : pageRows.map(c => {
                const ownUser = USERS_DB.find(u => u.name === c.ownedBy) || USERS_DB[0];
                const isSel = selected?.id === c.id;
                const status = c.status || (c.isCanceled ? STATUS.CANCELED : STATUS.ACTIVE);

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelect(c)}
                    style={{
                      borderBottom: "1px solid " + T.border, cursor: "pointer",
                      background: isSel ? col + "10" : "transparent",
                      borderLeft: isSel ? "3px solid " + col : "3px solid transparent",
                    }}
                  >
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ fontWeight: 600, color: T.text }}><Hi text={c.firstName + " " + c.lastName} q={q} /></div>
                      <div style={{ fontSize: 9, color: T.muted }}><Hi text={c.email} q={q} /></div>
                    </td>
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ color: T.dim }}><Hi text={c.company} q={q} /></div>
                      <div style={{ color: T.muted, fontSize: 9 }}>{c.title}</div>
                    </td>
                    <td style={{ padding: "8px 11px", color: T.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Hi text={c.address || "—"} q={q} /></td>

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
                    <td style={{ padding: "8px 11px" }}><Avatar user={ownUser} size={22} /></td>
                    <td style={{ padding: "8px 11px" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {!c.isCanceled && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditC(c); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: T.muted, fontSize: 13 }}
                            title="Edit"
                          >✎</button>
                        )}
                        {c.isCanceled && (
                          <button
                            onClick={e => { e.stopPropagation(); setRestoreTarget(c); }}
                            style={{
                              background: "transparent", border: "1px solid " + T.green + "55",
                              borderRadius: 4, cursor: "pointer", color: T.green, fontSize: 11,
                              padding: "2px 7px", fontFamily: "inherit",
                            }}
                            title="Restore contact"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            {rangeStart}–{rangeEnd} of {rows.length.toLocaleString()}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 11,
                cursor: safePage === 1 ? "default" : "pointer",
                background: T.surface, border: `1px solid ${T.border}`,
                color: safePage === 1 ? T.muted : T.text, fontFamily: "inherit",
              }}
            >← Prev</button>

            {getPageWindow(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} style={{ padding: "5px 4px", color: T.muted, fontSize: 11, userSelect: "none" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    minWidth: 32, padding: "5px 6px", borderRadius: 6, fontSize: 11,
                    cursor: p === safePage ? "default" : "pointer", fontFamily: "inherit",
                    background: p === safePage ? col : T.surface,
                    border: `1px solid ${p === safePage ? col : T.border}`,
                    color: p === safePage ? "#fff" : T.text,
                    fontWeight: p === safePage ? 700 : 400,
                  }}
                >{p}</button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 11,
                cursor: safePage === totalPages ? "default" : "pointer",
                background: T.surface, border: `1px solid ${T.border}`,
                color: safePage === totalPages ? T.muted : T.text, fontFamily: "inherit",
              }}
            >Next →</button>
          </div>

          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            Page {safePage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
