import { useState } from "react";
import Hi from "./ui/Hi";
import ScoreBar from "./ui/ScoreBar";
import ContactModal from "./modals/ContactModal";
import T from "../theme";
import CLIENTS from "../data/clients";
import { STAGE_DEF, CONTACT_STAGES, LEAD_STAGES, LOST_STAGES } from "../data/stages";
import fmt from "../utils/format";
import { calcLeadScore } from "../utils/scoring";
import { createContact } from "../api/contacts.api";
import { useToast } from "../hooks/useToast";

export default function Sidebar({
  pool, clientId, viewMode, selected, onSelect,
  search, setSearch, searchRef, contacts, setContacts, currentUser,
}) {
  const toast = useToast();
  const [sortF,    setSortF]    = useState("recent");
  const [addModal, setAddModal] = useState(false);

  const client = CLIENTS.find(c => c.id === clientId);
  const col    = pool === "prospect" ? T.accent : (client?.color || T.accent);

  const modeFiltered = contacts.filter(c => {
    if (!viewMode || viewMode === "all")      return true;
    if (viewMode === "contacts")  return CONTACT_STAGES.includes(c.lifecycleStage);
    if (viewMode === "leads")     return LEAD_STAGES.includes(c.lifecycleStage);
    if (viewMode === "customers") return c.lifecycleStage === "customer";
    if (viewMode === "lost")      return LOST_STAGES.includes(c.lifecycleStage);
    return true;
  });

  const filtered = modeFiltered
    .filter(c => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.firstName + " " + c.lastName).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortF === "name")  return a.firstName.localeCompare(b.firstName);
      if (sortF === "score") return calcLeadScore(b) - calcLeadScore(a);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  async function handleAdd(nc) {
    try {
      const saved = await createContact(nc);
      setContacts(prev => [saved, ...prev]);
      setAddModal(false);
      toast.success("Contact added.");
    } catch (err) {
      console.error("Failed to save contact:", err);
      toast.error("Failed to save contact. Please try again.");
    }
  }

  return (
    <div
      style={{
        width: 272, flexShrink: 0,
        background: T.surface, borderRight: "1px solid " + T.border,
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden",
      }}
    >
      {addModal && (
        <ContactModal
          onSave={handleAdd}
          onClose={() => setAddModal(false)}
          pool={pool}
          clientId={clientId}
          currentUser={currentUser}
        />
      )}

      {/* Header */}
      <div
        style={{
          padding: "8px 10px",
          background: T.panel, borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>
          {pool === "prospect" ? "All Contacts" : (client?.name || "Client")}
        </span>
        <span style={{ fontSize: 10, color: T.muted }}>{filtered.length}/{contacts.length}</span>
        <button
          onClick={() => setAddModal(true)}
          style={{
            background: col, border: "none", borderRadius: 5,
            color: "#fff", fontSize: 12, fontWeight: 700,
            padding: "3px 9px", cursor: "pointer", fontFamily: "inherit",
            transition: "opacity 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          + Add
        </button>
      </div>

      {/* Search & sort */}
      <div style={{ padding: "8px 8px 6px", flexShrink: 0, borderBottom: "1px solid " + T.border }}>
        <div style={{ position: "relative", marginBottom: 7 }}>
          <span
            style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              color: T.muted, fontSize: 13, pointerEvents: "none",
            }}
          >
            ⌕
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, company, city…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.bg,
              border: "1px solid " + (search ? col : T.border),
              borderRadius: 6, padding: "7px 26px 7px 28px",
              color: T.text, fontSize: 12,
              outline: "none", fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = col)}
            onBlur={e  => (e.target.style.borderColor = search ? col : T.border)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none",
                color: T.muted, cursor: "pointer", fontSize: 12, padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={sortF}
          onChange={e => setSortF(e.target.value)}
          style={{
            width: "100%", background: T.bg, border: "1px solid " + T.border,
            borderRadius: 5, padding: "5px 8px",
            color: T.sub, fontSize: 11, outline: "none",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="recent">Sort: Recent activity</option>
          <option value="name">Sort: Name A→Z</option>
          <option value="score">Sort: Score ↓</option>
        </select>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "24px 14px", textAlign: "center", color: T.muted, fontSize: 13 }}>
            No contacts match.
          </div>
        ) : (
          filtered.slice(0, 150).map(c => {
            const sd    = STAGE_DEF[c.lifecycleStage] || STAGE_DEF.new;
            const q     = search.trim();
            const isSel = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                style={{
                  padding: "10px 13px",
                  borderBottom: "1px solid " + T.border,
                  cursor: "pointer",
                  background: isSel ? col + "10" : "transparent",
                  borderLeft: isSel ? "3px solid " + col : "3px solid transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => {
                  if (!isSel) { e.currentTarget.style.background = T.panel; e.currentTarget.style.borderLeft = "3px solid " + T.borderHi; }
                }}
                onMouseLeave={e => {
                  if (!isSel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeft = "3px solid transparent"; }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, lineHeight: 1.2 }}>
                    <Hi text={c.firstName + " " + c.lastName} q={q} />
                  </div>
                  <span style={{ fontSize: 9, color: sd.color, fontWeight: 700, flexShrink: 0 }}>{sd.label}</span>
                </div>
                <div style={{ fontSize: 12, color: T.sub, marginBottom: 2 }}><Hi text={c.company} q={q} /></div>
                {c.city && (
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>
                    📍 <Hi text={c.city} q={q} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <ScoreBar score={calcLeadScore(c)} />
                  <span style={{ fontSize: 10, color: T.muted, whiteSpace: "nowrap" }}>{fmt.ago(c.lastActivityAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
