import { useState } from "react";
import Card from "../components/ui/Card";
import { StagePill } from "../components/ui/Pill";
import ScoreBar from "../components/ui/ScoreBar";
import Avatar from "../components/ui/Avatar";
import Hi from "../components/ui/Hi";
import Btn from "../components/ui/Btn";
import ContactModal from "../components/modals/ContactModal";
import T from "../theme";
import USERS_DB from "../data/users";
import CLIENTS from "../data/clients";
import { STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import { ACT_DEF } from "../data/activities";
import fmt from "../utils/format";
import * as db from "../services/api";

// ─── Full contacts table page ──────────────────────────────────────────────────
export default function ContactsPage({ pool, clientId, viewMode, onSelect, selected, search, contacts, setContacts, currentUser }) {
  const [stageF,    setStageF]    = useState("all");
  const [sortBy,    setSortBy]    = useState("lastActivityAt");
  const [addModal,  setAddModal]  = useState(false);
  const [editC,     setEditC]     = useState(null);

  const client   = CLIENTS.find(c => c.id === clientId);
  const col      = pool === "prospect" ? T.accent : (client?.color || T.accent);
  const q        = (search || "").trim();

  const modeFiltered = contacts.filter(c => {
    if (viewMode === "leads")     return LEAD_STAGES.includes(c.lifecycleStage);
    if (viewMode === "customers") return c.lifecycleStage === "customer";
    if (viewMode === "lost")      return LOST_STAGES.includes(c.lifecycleStage);
    return true;
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

  const modeLabel =
    viewMode === "customers" ? "Customers" :
    viewMode === "leads"     ? "Leads"     :
    viewMode === "lost"      ? "Lost/Churned" : "All Contacts";

  const stageOpts =
    viewMode === "leads"     ? LEAD_STAGES     :
    viewMode === "customers" ? CUSTOMER_STAGES :
    viewMode === "lost"      ? LOST_STAGES     : ALL_STAGES;

  async function handleAdd(nc) {
    try {
      const saved = await db.createContact(nc);
      setContacts(prev => [saved, ...prev]);
      setAddModal(false);
    } catch (err) {
      console.error("Failed to save contact:", err);
      alert("Failed to save contact. Please try again.");
    }
  }

  async function handleEdit(updated) {
    try {
      const refreshed = await db.updateContact(updated.id, updated);
      setContacts(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      setEditC(null);
    } catch (err) {
      console.error("Failed to update contact:", err);
      alert("Failed to update contact. Please try again.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {addModal && (
        <ContactModal onSave={handleAdd} onClose={() => setAddModal(false)} pool={pool} clientId={clientId} currentUser={currentUser} />
      )}
      {editC && (
        <ContactModal contact={editC} onSave={handleEdit} onClose={() => setEditC(null)} pool={pool} clientId={clientId} currentUser={currentUser} />
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {modeLabel} <span style={{ color: T.muted, fontSize: 13 }}>({rows.length.toLocaleString()})</span>
          </div>
          <div style={{ fontSize: 10, color: col, marginTop: 1 }}>
            {pool === "prospect" ? "GeniusAI Prospect Pool" : `${client?.name} client leads`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <select
            value={stageF}
            onChange={e => setStageF(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 9px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit" }}
          >
            <option value="all">All stages</option>
            {stageOpts.map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "5px 9px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit" }}
          >
            <option value="lastActivityAt">Recent activity</option>
            <option value="leadScore">Score</option>
            <option value="value">Contract value</option>
            <option value="trucks">Trucks ↓</option>
            <option value="name">Name A-Z</option>
          </select>

          <Btn onClick={() => setAddModal(true)}>+ Add Contact</Btn>
        </div>
      </div>

      {/* Table */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {["Name & Email","Company","City","Stage","Score","Last Activity","Actions","Value","Owner",""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px 11px", textAlign: "left",
                      color: T.muted, fontWeight: 500,
                      borderBottom: "1px solid " + T.border,
                      fontSize: 9, textTransform: "uppercase",
                      letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 24, textAlign: "center", color: T.muted }}>
                    No contacts found.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 200).map(c => {
                  const sd      = STAGE_DEF[c.lifecycleStage] || STAGE_DEF.new;
                  const acts    = c.activities || [];
                  const emails  = acts.filter(a => ACT_DEF[a.type]?.cat === "email").length;
                  const calls   = acts.filter(a => ACT_DEF[a.type]?.cat === "call").length;
                  const ownUser = USERS_DB.find(u => u.name === c.ownedBy) || USERS_DB[0];
                  const isSel   = selected?.id === c.id;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelect(c)}
                      style={{
                        borderBottom: "1px solid " + T.border,
                        cursor: "pointer",
                        background: isSel ? col + "10" : "transparent",
                        borderLeft: isSel ? "3px solid " + col : "3px solid transparent",
                      }}
                      onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = T.surface; } }}
                      onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = "transparent"; } }}
                    >
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>
                          <Hi text={c.firstName + " " + c.lastName} q={q} />
                        </div>
                        <div style={{ fontSize: 9, color: T.muted }}>
                          <Hi text={c.email} q={q} />
                        </div>
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <div style={{ color: T.dim, fontSize: 11 }}><Hi text={c.company} q={q} /></div>
                        <div style={{ color: T.muted, fontSize: 9 }}>{c.title}</div>
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle", fontSize: 11, color: T.muted }}>
                        <Hi text={c.city || "—"} q={q} />
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <StagePill stage={c.lifecycleStage} />
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <ScoreBar score={c.leadScore} />
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 11, color: T.dim }}>{fmt.ago(c.lastActivityAt)}</div>
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {emails > 0 && (
                            <span style={{ fontSize: 9, background: T.blue + "15", color: T.blue, border: "1px solid " + T.blue + "30", borderRadius: 3, padding: "1px 4px" }}>
                              ✉{emails}
                            </span>
                          )}
                          {calls > 0 && (
                            <span style={{ fontSize: 9, background: T.green + "15", color: T.green, border: "1px solid " + T.green + "30", borderRadius: 3, padding: "1px 4px" }}>
                              ☎{calls}
                            </span>
                          )}
                          {emails === 0 && calls === 0 && <span style={{ fontSize: 9, color: T.muted }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <span style={{ color: T.green, fontWeight: 600, fontSize: 11 }}>
                          {c.contractValue ? "$" + c.contractValue.toLocaleString() : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <Avatar user={ownUser} size={22} />
                      </td>
                      <td style={{ padding: "8px 11px", verticalAlign: "middle" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setEditC(c); }}
                          style={{
                            background: T.surface, border: "1px solid " + T.border,
                            borderRadius: 4, color: T.dim, fontSize: 10,
                            cursor: "pointer", padding: "3px 7px", fontFamily: "inherit",
                          }}
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
