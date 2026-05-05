import { useState, useRef } from "react";
import Hi from "./ui/Hi";
import ScoreBar from "./ui/ScoreBar";
import ContactModal from "./modals/ContactModal";
import T from "../theme";
import { useAppToast } from "../context/ToastContext";
import CLIENTS from "../data/clients";
import { STAGE_DEF, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";

// ─── Left sidebar — contact list ──────────────────────────────────────────────
export default function Sidebar({
  pool, clientId, viewMode, selected, onSelect,
  search, setSearch, searchRef, contacts, setContacts, currentUser,
}) {
  const [stageF,      setStageF]      = useState("all");
  const [sortF,       setSortF]       = useState("recent");
  const [addModal,    setAddModal]    = useState(false);
  const [editContact, setEditContact] = useState(null);
  const listRef = useRef(null);
  const toast = useAppToast();

  const client = CLIENTS.find(c => c.id === clientId);
  const col    = pool === "prospect" ? T.accent : (client?.color || T.accent);

  const modeFiltered = contacts.filter(c => {
    if (viewMode === "leads")     return LEAD_STAGES.includes(c.lifecycleStage);
    if (viewMode === "customers") return c.lifecycleStage === "customer";
    if (viewMode === "lost")      return LOST_STAGES.includes(c.lifecycleStage);
    return true;
  });

  const stageOpts =
    viewMode === "leads"     ? LEAD_STAGES     :
    viewMode === "customers" ? CUSTOMER_STAGES :
    viewMode === "lost"      ? LOST_STAGES     : ALL_STAGES;

  const filtered = modeFiltered
    .filter(c => {
      if (stageF !== "all" && c.lifecycleStage !== stageF) return false;
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
      if (sortF === "score") return b.leadScore - a.leadScore;
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selected) setEditContact(selected);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
    e.preventDefault();
    const visible = filtered.slice(0, 150);
    if (visible.length === 0) return;
    const currentIdx = selected ? visible.findIndex(c => c.id === selected.id) : -1;

    let nextIdx;
    if (e.key === "ArrowDown") {
      nextIdx = currentIdx === -1 ? 0 : Math.min(currentIdx + 1, visible.length - 1);
    } else if (e.key === "ArrowUp") {
      if (currentIdx <= 0) return;
      nextIdx = currentIdx - 1;
    } else {
      // PageDown / PageUp — compute page size from actual DOM dimensions
      const container = listRef.current;
      const firstRow  = container?.querySelector("[data-contact-id]");
      const pageSize  = (container && firstRow)
        ? Math.max(1, Math.floor(container.clientHeight / firstRow.offsetHeight))
        : 10;
      if (e.key === "PageDown") {
        nextIdx = currentIdx === -1 ? pageSize - 1 : Math.min(currentIdx + pageSize, visible.length - 1);
      } else {
        nextIdx = currentIdx === -1 ? 0 : Math.max(currentIdx - pageSize, 0);
      }
    }

    const next = visible[nextIdx];
    onSelect(next);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-contact-id="${next.id}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  async function handleAdd(nc) {
    try {
      const saved = await db.createContact(nc);
      setContacts(prev => [saved, ...prev]);
      setAddModal(false);
      toast.success("Contact added.");
    } catch (err) {
      console.error("Failed to save contact:", err);
      toast.error("Failed to save contact.");
    }
  }

  return (
    <div
      style={{
        width: 280, flexShrink: 0,
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

      {editContact && (
        <ContactModal
          contact={editContact}
          onSave={async (updated) => {
            try {
              const refreshed = await db.updateContact(updated.id, updated);
              onSelect(refreshed);
              setEditContact(null);
              toast.success("Contact saved.");
            } catch {
              toast.error("Failed to save contact.");
              setEditContact(null);
            }
          }}
          onClose={() => setEditContact(null)}
          pool={editContact.pool}
          clientId={editContact.clientId}
          currentUser={currentUser}
        />
      )}

      {/* Pool header */}
      <div
        style={{
          padding: "7px 10px",
          background: col + "08", borderBottom: "1px solid " + col + "28",
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: col, flex: 1 }}>
          {pool === "prospect" ? "Prospect Pool" : (client?.name || "Client")}
        </span>
        <span style={{ fontSize: 9, color: T.muted }}>{filtered.length}/{contacts.length}</span>
        <button
          onClick={() => setAddModal(true)}
          style={{
            background: col, border: "none", borderRadius: 5,
            color: "#fff", fontSize: 11, fontWeight: 700,
            padding: "3px 9px", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + Add
        </button>
      </div>

      {/* Search & filters */}
      <div style={{ padding: "8px 8px 5px", flexShrink: 0, borderBottom: "1px solid " + T.border }}>
        <div style={{ position: "relative", marginBottom: 6 }}>
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
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name, company, city…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.card,
              border: "1px solid " + (search ? col : T.border),
              borderRadius: 6, padding: "7px 26px 7px 28px",
              color: T.text, fontSize: 11,
              outline: "none", fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none",
                color: T.muted, cursor: "pointer", fontSize: 11, padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={sortF}
            onChange={e => setSortF(e.target.value)}
            style={{
              background: T.bg, border: "1px solid " + T.border,
              borderRadius: 4, padding: "3px 6px",
              color: T.dim, fontSize: 10, outline: "none",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <option value="recent">Recent</option>
            <option value="name">Name A→Z</option>
            <option value="score">Score ↓</option>
          </select>

          <StageFilterBtn label="All" active={stageF === "all"} color={col} onClick={() => setStageF("all")} />
          {stageOpts.slice(0, 5).map(s => {
            const sd = STAGE_DEF[s];
            return (
              <StageFilterBtn key={s} label={sd.label} active={stageF === s} color={sd.color} onClick={() => setStageF(s)} />
            );
          })}
        </div>
      </div>

      {/* Contact list */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "20px 14px", textAlign: "center", color: T.muted, fontSize: 12 }}>
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
                data-contact-id={c.id}
                onClick={() => onSelect(c)}
                style={{
                  padding: "10px 13px",
                  borderBottom: "1px solid " + T.border,
                  cursor: "pointer",
                  background: isSel ? col + "10" : "transparent",
                  borderLeft: isSel ? "3px solid " + col : "3px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!isSel) { e.currentTarget.style.background = T.card; e.currentTarget.style.borderLeft = "3px solid " + T.borderHi; }
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
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 2 }}><Hi text={c.company} q={q} /></div>
                {c.city && (
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>
                    📍 <Hi text={c.city} q={q} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <ScoreBar score={c.leadScore} />
                  <span style={{ fontSize: 9, color: T.muted, whiteSpace: "nowrap" }}>{fmt.ago(c.lastActivityAt)}</span>
                </div>
                {c.trucks && <div style={{ marginTop: 4, fontSize: 9, color: T.orange }}>🚛 {c.trucks} trucks</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Small stage filter button ────────────────────────────────────────────────
function StageFilterBtn({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "2px 5px", fontSize: 8, borderRadius: 3, cursor: "pointer",
        background: active ? color + "25" : "transparent",
        border: "1px solid " + (active ? color : T.border),
        color: active ? color : T.muted,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
