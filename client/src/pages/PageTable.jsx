import { useState } from "react";
import { Search } from "lucide-react";
import Card from "../components/ui/Card";
import { StagePill } from "../components/ui/Pill";
import ScoreBar from "../components/ui/ScoreBar";
import Avatar from "../components/ui/Avatar";
import Hi from "../components/ui/Hi";
import Btn from "../components/ui/Btn";
import ContactModal from "../components/modals/ContactModal";
import T from "../theme";
import USERS_DB from "../data/users";
import { STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import { ACT_DEF } from "../data/activities";
import fmt from "../utils/format";
import { createContact, updateContact } from "../api/contacts.api";
import { useToast } from "../hooks/useToast";

export default function PageTable({ pool, clientId, viewMode, setViewMode, onSelect, contacts, setContacts, currentUser }) {
  const toast = useToast();
  const [search,   setSearch]   = useState("");
  const [stageF,   setStageF]   = useState("all");
  const [sortBy,   setSortBy]   = useState("lastActivityAt");
  const [addModal, setAddModal] = useState(false);
  const [editC,    setEditC]    = useState(null);

  const q = search.trim();

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
    viewMode === "lost"      ? "Lost / Churned" : "All Contacts";

  const stageOpts =
    viewMode === "leads"     ? LEAD_STAGES     :
    viewMode === "customers" ? CUSTOMER_STAGES :
    viewMode === "lost"      ? LOST_STAGES     : ALL_STAGES;

  async function handleAdd(nc) {
    try {
      const saved = await createContact(nc);
      setContacts(prev => [saved, ...prev]);
      setAddModal(false);
      toast.success("Contact added successfully.");
    } catch (err) {
      console.error("Failed to save contact:", err);
      toast.error("Failed to save contact. Please try again.");
    }
  }

  async function handleEdit(updated) {
    try {
      const refreshed = await updateContact(updated.id, updated);
      setContacts(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      setEditC(null);
      toast.success("Contact updated.");
    } catch (err) {
      console.error("Failed to update contact:", err);
      toast.error("Failed to update contact. Please try again.");
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>

        {/* Left: title + view tabs */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>
            {modeLabel}{" "}
            <span style={{ color: T.muted, fontSize: 14, fontWeight: 400 }}>({rows.length.toLocaleString()})</span>
          </div>
          {/* View filter tabs */}
          <div style={{ display: "flex", gap: 2, marginTop: 8 }}>
            {[["all","All",T.sub],["leads","Leads",T.blue],["customers","Customers",T.green],["lost","Lost",T.red]].map(([mode,label,c]) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setStageF("all"); }}
                style={{
                  padding: "4px 12px", borderRadius: 5, border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  background: viewMode === mode ? c + "15" : "transparent",
                  color: viewMode === mode ? c : T.muted,
                  fontWeight: viewMode === mode ? 700 : 400,
                  fontSize: 12, transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (viewMode !== mode) e.currentTarget.style.background = T.panel; }}
                onMouseLeave={e => { if (viewMode !== mode) e.currentTarget.style.background = "transparent"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: search + filters + add */}
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          {/* Inline search */}
          <div style={{ position: "relative" }}>
            <Search size={14} color={T.muted} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…"
              style={{
                background: T.surface, border: "1px solid " + T.border,
                borderRadius: 7, padding: "6px 28px 6px 28px",
                color: T.text, fontSize: 13, outline: "none",
                fontFamily: "inherit", width: 200,
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e  => (e.target.style.borderColor = T.border)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: 0 }}
              >✕</button>
            )}
          </div>

          <select
            value={stageF}
            onChange={e => setStageF(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
          >
            <option value="all">All stages</option>
            {stageOpts.map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.panel }}>
                {["Name & Email","Company","City","Stage","Score","Last Activity","Actions","Value","Owner",""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "9px 12px", textAlign: "left",
                      color: T.muted, fontWeight: 600,
                      borderBottom: "1px solid " + T.border,
                      fontSize: 10, textTransform: "uppercase",
                      letterSpacing: "0.05em", whiteSpace: "nowrap",
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
                  <td colSpan={10} style={{ padding: 28, textAlign: "center", color: T.muted, fontSize: 13 }}>
                    No contacts found.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 200).map(c => {
                  const acts    = c.activities || [];
                  const emails  = acts.filter(a => ACT_DEF[a.type]?.cat === "email").length;
                  const calls   = acts.filter(a => ACT_DEF[a.type]?.cat === "call").length;
                  const ownUser = USERS_DB.find(u => u.name === c.ownedBy) || USERS_DB[0];

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelect(c)}
                      style={{ borderBottom: "1px solid " + T.border, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.panel)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>
                          <Hi text={c.firstName + " " + c.lastName} q={q} />
                        </div>
                        <div style={{ fontSize: 11, color: T.muted }}>
                          <Hi text={c.email} q={q} />
                        </div>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <div style={{ color: T.sub, fontSize: 12 }}><Hi text={c.company} q={q} /></div>
                        <div style={{ color: T.muted, fontSize: 10 }}>{c.title}</div>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle", fontSize: 12, color: T.muted }}>
                        <Hi text={c.city || "—"} q={q} />
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <StagePill stage={c.lifecycleStage} />
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <ScoreBar score={c.leadScore} />
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 12, color: T.sub }}>{fmt.ago(c.lastActivityAt)}</div>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {emails > 0 && (
                            <span style={{ fontSize: 10, background: T.blue + "15", color: T.blue, border: "1px solid " + T.blue + "30", borderRadius: 3, padding: "2px 5px" }}>
                              ✉ {emails}
                            </span>
                          )}
                          {calls > 0 && (
                            <span style={{ fontSize: 10, background: T.green + "15", color: T.green, border: "1px solid " + T.green + "30", borderRadius: 3, padding: "2px 5px" }}>
                              ☎ {calls}
                            </span>
                          )}
                          {emails === 0 && calls === 0 && <span style={{ fontSize: 11, color: T.muted }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <span style={{ color: T.green, fontWeight: 600, fontSize: 12 }}>
                          {c.contractValue ? "$" + c.contractValue.toLocaleString() : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <Avatar user={ownUser} size={24} />
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setEditC(c); }}
                          style={{
                            background: T.surface, border: "1px solid " + T.border,
                            borderRadius: 5, color: T.sub, fontSize: 11,
                            cursor: "pointer", padding: "4px 8px", fontFamily: "inherit",
                            transition: "all 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}
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
