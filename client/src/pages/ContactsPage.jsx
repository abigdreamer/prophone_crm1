import { useState, useEffect } from "react";
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
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import CLIENTS from "../data/clients";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import { ACT_DEF } from "../data/activities";
import fmt from "../utils/format";
import * as db from "../services/api";

// ─── Lifecycle Stage Groups ──────────────────────────────────────────────────
const STAGE_GROUPS = {
  prospects: ["new"],
  leads: ["contacted", "engaged"],
  warm: ["demo_sched", "demo_done", "proposal_sent"],
  hot: ["negotiating"],
  customer: ["customer"],
  backburner: ["long_term_contacted", "long_term_engaged"],
  lost: ["not_qualified", "lost", "churned"]
};

const PAGE_SIZE = 100;

function getPageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)          return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)  return [1, "…", total-4, total-3, total-2, total-1, total];
  return [1, "…", current-1, current, current+1, "…", total];
}

export default function ContactsPage({ pool, clientId, viewMode, onSelect, selected, search, contacts, setContacts, currentUser, onRestoreContact }) {
  const T = useTheme();
  const [stageF,       setStageF]       = useState("all");
  const [sortBy,       setSortBy]       = useState("lastActivityAt");
  const [addModal,     setAddModal]     = useState(false);
  const [importModal,  setImportModal]  = useState(false);
  const [editC,        setEditC]        = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [page,         setPage]         = useState(1);
  const toast = useAppToast();

  const q = (search || "").trim();

  // Reset to page 1 whenever filters, sort, search, or view changes
  useEffect(() => { setPage(1); }, [stageF, sortBy, q, viewMode]);

  const client   = CLIENTS.find(c => c.id === clientId);
  const col      = pool === "prospect" ? T.accent : (client?.color || T.accent);

  // Filtering Logic
  const modeFiltered = contacts.filter(c => {
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
        (c.city || "").toLowerCase().includes(ql)
      );
    })
    .sort((a, b) => {
      if (sortBy === "leadScore") return b.leadScore - a.leadScore;
      if (sortBy === "value")     return (b.contractValue || 0) - (a.contractValue || 0);
      if (sortBy === "name")      return a.firstName.localeCompare(b.firstName);
      if (sortBy === "trucks")    return (b.trucks || 0) - (a.trucks || 0);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(safePage * PAGE_SIZE, rows.length);

  const labels = {
    all: "All Contacts",
    prospects: "Prospects",
    leads: "Leads",
    warm: "Warm Leads",
    hot: "Hot Opportunities",
    customer: "Customers",
    backburner: "Backburner",
    lost: "Lost / Churned",
    canceled: "Canceled Contacts"
  };
  const modeLabel = labels[viewMode] || "Contacts";
  const stageOpts = STAGE_GROUPS[viewMode] || ALL_STAGES;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const fresh = viewMode === "canceled" ? await db.getCanceledContacts() : await db.getContacts();
      setContacts(fresh);
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
      setEditC(null);
      toast.success("Contact saved.");
    } catch {
      toast.error("Failed to update contact.");
    }
  }

  async function handleRestore(c) {
    try {
      await db.restoreContact(c.id);
      if (onRestoreContact) await onRestoreContact(c.id);
      toast.success("Contact restored.");
    } catch {
      toast.error("Failed to restore contact.");
    }
  }

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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {modeLabel} <span style={{ color: T.muted, fontSize: 13 }}>({rows.length.toLocaleString()})</span>
          </div>
          <div style={{ fontSize: 10, color: col, marginTop: 1, fontWeight: 600, textTransform: 'uppercase' }}>
            {pool === "prospect" ? "GeniusAI Prospect Pool" : `${client?.name} client leads`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7 }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", background: T.card,
              border: "1px solid " + T.border, borderRadius: 7, color: T.dim, fontSize: 12, cursor: refreshing ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "crm-spin 0.8s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <select
            value={stageF}
            onChange={e => setStageF(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 9px", color: T.text, fontSize: 11 }}
          >
            <option value="all">All sub-stages</option>
            {stageOpts.map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          {viewMode !== "canceled" && (
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
                {(viewMode === "canceled"
                  ? ["Name & Email","Company","City","Canceled","Canceled By","Last Activity","Actions","Value","Owner",""]
                  : ["Name & Email","Company","City","Stage","Score","Last Activity","Actions","Value","Owner",""]
                ).map((h, i) => (
                  <th key={i} style={{ padding: "8px 11px", textAlign: "left", color: T.muted, fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: T.muted }}>No contacts found.</td></tr>
              ) : (
                pageRows.map(c => {
                  const acts = c.activities || [];
                  const emails = acts.filter(a => ACT_DEF[a.type]?.cat === "email").length;
                  const calls = acts.filter(a => ACT_DEF[a.type]?.cat === "call").length;
                  const ownUser = USERS_DB.find(u => u.name === c.ownedBy) || USERS_DB[0];
                  const isSel = selected?.id === c.id;

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
                      <td style={{ padding: "8px 11px", color: T.muted }}><Hi text={c.city || "—"} q={q} /></td>
                      <td style={{ padding: "8px 11px" }}>
                        {viewMode === "canceled" ? (
                          <div style={{ fontSize: 10, fontWeight: 700, color: T.red }}>CANCELED</div>
                        ) : (
                          <StagePill stage={c.lifecycleStage} />
                        )}
                      </td>
                      <td style={{ padding: "8px 11px" }}>
                        {viewMode === "canceled" ? c.canceledBy : <ScoreBar score={c.leadScore} />}
                      </td>
                      <td style={{ padding: "8px 11px", color: T.dim }}>{fmt.ago(c.lastActivityAt)}</td>
                      <td style={{ padding: "8px 11px" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {emails > 0 && <span style={{ fontSize: 9, color: T.blue }}>✉{emails}</span>}
                          {calls > 0 && <span style={{ fontSize: 9, color: T.green }}>☎{calls}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "8px 11px", color: T.green, fontWeight: 600 }}>
                        {c.contractValue ? "$" + c.contractValue.toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "8px 11px" }}><Avatar user={ownUser} size={22} /></td>
                      <td style={{ padding: "8px 11px" }}>
                         <button onClick={e => { e.stopPropagation(); setEditC(c); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.muted }}>✎</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 4px", gap: 8,
        }}>
          {/* Range label */}
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            {rangeStart}–{rangeEnd} of {rows.length.toLocaleString()}
          </span>

          {/* Page buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 11, cursor: safePage === 1 ? "default" : "pointer",
                background: T.surface, border: `1px solid ${T.border}`,
                color: safePage === 1 ? T.muted : T.text, fontFamily: "inherit",
              }}
            >← Prev</button>

            {getPageWindow(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} style={{ padding: "5px 4px", color: T.muted, fontSize: 11, userSelect: "none" }}>…</span>
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

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 11, cursor: safePage === totalPages ? "default" : "pointer",
                background: T.surface, border: `1px solid ${T.border}`,
                color: safePage === totalPages ? T.muted : T.text, fontFamily: "inherit",
              }}
            >Next →</button>
          </div>

          {/* Total pages */}
          <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
            Page {safePage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}