import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Search, MoreHorizontal, Eye, Pencil, MessageSquare, ArrowRightCircle, Trash2, UserPlus, Upload } from "lucide-react";
import Card from "../components/ui/Card";
import { StagePill } from "../components/ui/Pill";
import Hi from "../components/ui/Hi";
import Btn from "../components/ui/Btn";
import ContactModal from "../components/modals/ContactModal";
import StageModal from "../components/modals/StageModal";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";
import ImportModal from "../components/modals/ImportModal";
import T from "../theme";
import { STAGE_DEF, CONTACT_STAGES, LEAD_STAGES, CUSTOMER_STAGES, LOST_STAGES, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import { getContacts, createContact, updateContact, deleteContact } from "../api/contacts.api";
import { useToast } from "../hooks/useToast";

// ─── Three-dot row menu (portal — escapes overflow:hidden parents) ────────────
function RowMenu({ onView, onEdit, onLogActivity, onChangeStage, onDelete }) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (
        btnRef.current  && btnRef.current.contains(e.target)  ||
        menuRef.current && menuRef.current.contains(e.target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Recalculate position on scroll/resize so the menu tracks the button
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 200 });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 200 });
    }
    setOpen(o => !o);
  }

  function action(fn) {
    return e => { e.stopPropagation(); setOpen(false); fn(); };
  }

  const items = [
    { icon: Eye,              label: "View Detail",    fn: onView },
    { icon: Pencil,           label: "Edit Contact",   fn: onEdit },
    { divider: true },
    { icon: MessageSquare,    label: "Log Activity",   fn: onLogActivity },
    { icon: ArrowRightCircle, label: "Change Stage",   fn: onChangeStage },
    { divider: true },
    { icon: Trash2,           label: "Delete Contact",    fn: onDelete, danger: true },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30, borderRadius: "50%",
          background: open ? "#f1f5f9" : "transparent",
          border: "1px solid " + (open ? "#e2e8f0" : "transparent"),
          cursor: "pointer", color: "#64748b", transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
            background: "#ffffff", border: "1px solid #e2e8f0",
            borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            minWidth: 200, padding: "6px 0",
          }}
        >
          {items.map((item, i) =>
            item.divider
              ? <div key={i} style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              : (
                <button
                  key={item.label}
                  onClick={action(item.fn)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "10px 16px",
                    background: "transparent", border: "none",
                    fontSize: 14, fontFamily: "inherit", textAlign: "left",
                    color: item.danger ? "#dc2626" : "#0f172a",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <item.icon size={15} style={{ flexShrink: 0, opacity: item.danger ? 1 : 0.55 }} />
                  {item.label}
                </button>
              )
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────
export default function PageTable({ viewMode, setViewMode, onSelect, contacts, setContacts, groups = [], currentUser }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search,   setSearch]   = useState("");
  const [stageF,   setStageF]   = useState("all");
  const [groupF,   setGroupF]   = useState(() => searchParams.get("group") || "all");

  function changeGroupF(val) {
    setGroupF(val);
    if (val === "all") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ group: val }, { replace: true });
    }
  }
  const [sortBy,   setSortBy]   = useState("lastActivityAt");
  const [addModal, setAddModal] = useState(false);
  const [editC,    setEditC]    = useState(null);
  const [deleteC,    setDeleteC]    = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [stageC,      setStageC]     = useState(null);
  const [refreshing,  setRefreshing] = useState(false);
  const [addChoice,   setAddChoice]  = useState(false);
  const [importModal, setImportModal] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const data = await getContacts();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to refresh contacts.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleImportDone(imported) {
    setImportModal(false);
    try {
      const data = await getContacts();
      setContacts(Array.isArray(data) ? data : []);
      toast.success(`${imported} contact${imported !== 1 ? "s" : ""} imported.`);
    } catch {
      toast.error("Import done but failed to refresh list.");
    }
  }

  // For Log Activity and Change Stage we reuse the lifecycle panel by selecting the contact
  // then the user can act from the panel — no separate modal needed here
  const q = search.trim();

  const modeFiltered = contacts.filter(c => {
    if (viewMode === "all")       return true;
    if (viewMode === "contacts")  return CONTACT_STAGES.includes(c.lifecycleStage);
    if (viewMode === "leads")     return LEAD_STAGES.includes(c.lifecycleStage);
    if (viewMode === "customers") return c.lifecycleStage === "customer";
    if (viewMode === "lost")      return LOST_STAGES.includes(c.lifecycleStage);
    return true;
  });

  const rows = modeFiltered
    .filter(c => {
      if (stageF !== "all" && c.lifecycleStage !== stageF) return false;
      if (groupF !== "all" && c.groupId !== groupF) return false;
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
      if (sortBy === "name") return a.firstName.localeCompare(b.firstName);
      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });

  const modeLabel =
    viewMode === "contacts"  ? "Contacts"  :
    viewMode === "leads"     ? "Leads"     :
    viewMode === "customers" ? "Customers" :
    viewMode === "lost"      ? "Lost"      : "All";

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

  async function handleStageChange(updated) {
    try {
      const refreshed = await updateContact(updated.id, updated);
      setContacts(prev => prev.map(c => c.id === refreshed.id ? refreshed : c));
      setStageC(null);
      toast.success("Stage updated.");
    } catch (err) {
      toast.error("Failed to update stage. Please try again.");
    }
  }

  async function handleDelete() {
    if (!deleteC) return;
    setDeleting(true);
    try {
      await deleteContact(deleteC.id);
      setContacts(prev => prev.filter(c => c.id !== deleteC.id));
      setDeleteC(null);
      toast.success(`${deleteC.firstName} ${deleteC.lastName} deleted.`);
    } catch (err) {
      console.error("Failed to delete contact:", err);
      toast.error("Failed to delete contact. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {addChoice && createPortal(
        <div
          onClick={() => setAddChoice(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 20,
              boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
              padding: "36px 32px 32px",
              width: 480, maxWidth: "90vw",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Add Contact</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28 }}>Choose how you want to add contacts</div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                {
                  icon: UserPlus,
                  label: "Create Manually",
                  sub: "Fill in a contact form one by one",
                  action: () => { setAddChoice(false); setAddModal(true); },
                },
                {
                  icon: Upload,
                  label: "Import from File",
                  sub: "Upload a CSV or Excel spreadsheet",
                  action: () => { setAddChoice(false); setImportModal(true); },
                },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 14, padding: "28px 20px", borderRadius: 14,
                    border: "2px solid #e2e8f0", background: "#fff",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    textAlign: "center",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "#6366f110",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <item.icon size={24} color="#6366f1" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {addModal && (
        <ContactModal onSave={handleAdd} onClose={() => setAddModal(false)} currentUser={currentUser} groups={groups} />
      )}
      {editC && (
        <ContactModal contact={editC} onSave={handleEdit} onClose={() => setEditC(null)} currentUser={currentUser} groups={groups} />
      )}
      {stageC && (
        <StageModal contact={stageC} onSave={handleStageChange} onClose={() => setStageC(null)} currentUser={currentUser} />
      )}
      {importModal && (
        <ImportModal groups={groups} onDone={handleImportDone} onClose={() => setImportModal(false)} />
      )}
      {deleteC && (
        <ConfirmDeleteModal
          title="Delete Contact"
          itemName={`${deleteC.firstName} ${deleteC.lastName}`}
          description={
            <>
              This will permanently remove <strong>{deleteC.firstName} {deleteC.lastName}</strong> and all their activity history. This action cannot be undone.
            </>
          }
          confirmLabel="Delete Contact"
          onConfirm={handleDelete}
          onClose={() => setDeleteC(null)}
          busy={deleting}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>
            {modeLabel}{" "}
            <span style={{ color: T.muted, fontSize: 14, fontWeight: 400 }}>({rows.length.toLocaleString()})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 8 }}>
            {[
              ["all",       "All",       T.sub],
              ["contacts",  "Contacts",  T.blue],
              ["leads",     "Leads",     "#8b5cf6"],
              ["customers", "Customers", T.green],
              ["lost",      "Lost",      T.red],
            ].map(([mode, label, c]) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setStageF("all"); changeGroupF("all"); }}
                style={{
                  padding: "4px 12px", borderRadius: 5, border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  background: viewMode === mode ? c + "20" : "transparent",
                  color: viewMode === mode ? c : T.muted,
                  fontWeight: viewMode === mode ? 700 : 400,
                  fontSize: 12, transition: "all 0.12s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (viewMode !== mode) e.currentTarget.style.background = T.panel; }}
                onMouseLeave={e => { if (viewMode !== mode) e.currentTarget.style.background = "transparent"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={stageF}
            onChange={e => setStageF(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
          >
            <option value="all">All stages</option>
            {(viewMode === "contacts"  ? CONTACT_STAGES  :
              viewMode === "leads"     ? LEAD_STAGES     :
              viewMode === "customers" ? CUSTOMER_STAGES :
              viewMode === "lost"      ? LOST_STAGES     : ALL_STAGES
            ).map(s => <option key={s} value={s}>{STAGE_DEF[s]?.label}</option>)}
          </select>

          {groups.length > 0 && (
            <select
              value={groupF}
              onChange={e => changeGroupF(e.target.value)}
              style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
            >
              <option value="all">All groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
          >
            <option value="lastActivityAt">Recent activity</option>
            <option value="name">Name A-Z</option>
          </select>

          <Btn onClick={() => setAddChoice(true)}>+ Add Contact</Btn>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <Search size={14} color={T.muted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts by name, email, company or city…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: T.surface, border: "1px solid " + T.border,
            borderRadius: 10, padding: "10px 36px 10px 38px",
            color: T.text, fontSize: 13, outline: "none",
            fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = "0 0 0 3px " + T.accent + "20"; }}
          onBlur={e  => { e.target.style.borderColor = T.border;  e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)"; }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}
          >✕</button>
        )}
      </div>

      {/* Table */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.panel }}>
                {["Name & Email","Company","City","Stage","Last Activity","Owner","Action"].map((h, i) => (
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
                  <td colSpan={7} style={{ padding: 28, textAlign: "center", color: T.muted, fontSize: 13 }}>
                    No leads found.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 200).map(c => {
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
                        <div style={{ fontSize: 12, color: T.sub }}>{fmt.ago(c.lastActivityAt)}</div>
                      </td>
                      <td style={{ padding: "9px 12px", verticalAlign: "middle" }}>
                        {c.ownedBy ? (
                          <div title={c.ownedBy} style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: "#6366f120", border: "1.5px solid #6366f140",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: "#6366f1", flexShrink: 0,
                          }}>
                            {c.ownedBy.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 2)}
                          </div>
                        ) : <span style={{ fontSize: 11, color: T.muted }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 8px", verticalAlign: "middle" }}>
                        <RowMenu
                          onView={()   => onSelect(c)}
                          onEdit={()   => setEditC(c)}
                          onLogActivity={() => onSelect(c)}
                          onChangeStage={()  => setStageC(c)}
                          onDelete={()  => setDeleteC(c)}
                        />
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
