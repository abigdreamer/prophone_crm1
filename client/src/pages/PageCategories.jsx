import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tag, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import Btn from "../components/ui/Btn";
import { Spinner } from "../components/ui/Loader";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";
import T from "../theme";
import fmt from "../utils/format";
import { createGroup, updateGroup, deleteGroup } from "../api/groups.api";
import { useToast } from "../hooks/useToast";

// ─── Three-dot row menu ───────────────────────────────────────────────────────
function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 180 });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 180 });
    }
    setOpen(o => !o);
  }

  function act(fn) { return e => { e.stopPropagation(); setOpen(false); fn(); }; }

  const items = [
    { icon: Pencil, label: "Rename",       fn: onEdit },
    { divider: true },
    { icon: Trash2, label: "Delete Group", fn: onDelete, danger: true },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30, borderRadius: "50%",
          background: open ? T.panel : "transparent",
          border: "1px solid " + (open ? T.border : "transparent"),
          cursor: "pointer", color: T.muted, transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.panel; e.currentTarget.style.borderColor = T.border; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          minWidth: 180, padding: "6px 0",
        }}>
          {items.map((item, i) =>
            item.divider
              ? <div key={i} style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              : (
                <button key={item.label} onClick={act(item.fn)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 16px",
                  background: "transparent", border: "none",
                  fontSize: 13, fontFamily: "inherit", textAlign: "left",
                  color: item.danger ? "#dc2626" : "#0f172a",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <item.icon size={14} style={{ flexShrink: 0, opacity: item.danger ? 1 : 0.55 }} />
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PageCategories({ groups = [], setGroups, currentUser, setContacts }) {
  const toast = useToast();
  const [newName,   setNewName]   = useState("");
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editName,  setEditName]  = useState("");
  const [editSaving,setEditSaving]= useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const g = await createGroup(name);
      setGroups(prev => [g, ...prev]);
      setNewName("");
      setAdding(false);
      toast.success(`Group "${name}" created.`);
    } catch (err) {
      toast.error(err.message || "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    const name = editName.trim();
    if (!name) return;
    setEditSaving(true);
    try {
      const g = await updateGroup(editId, name);
      setGroups(prev => prev.map(x => x.id === editId ? g : x));
      setEditId(null);
      toast.success("Group renamed.");
    } catch (err) {
      toast.error(err.message || "Failed to rename group.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroup(deleteTarget.id);
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id));
      // Clear group reference from any contacts in local state (backend uses onDelete: SetNull)
      setContacts?.(prev => prev.map(c =>
        c.groupId === deleteTarget.id ? { ...c, groupId: null, groupName: null } : c
      ));
      toast.success(`Group "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete group.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {deleteTarget && (
        <ConfirmDeleteModal
          title={`Delete "${deleteTarget.name}"`}
          itemName={deleteTarget.name}
          description={
            deleteTarget.contactCount === 0
              ? "This group has no contacts. It will be permanently removed."
              : <>
                  This group contains{" "}
                  <strong style={{ color: "#dc2626" }}>
                    {deleteTarget.contactCount} contact{deleteTarget.contactCount !== 1 ? "s" : ""}
                  </strong>.
                  {" "}Deleting the group will <strong>unassign</strong> all contacts from it —
                  the contacts themselves will not be deleted.
                  {deleteTarget.contactCount > 20 && (
                    <span style={{ display: "block", marginTop: 8, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                      ⚠ This group has many contacts. The operation may take a moment.
                    </span>
                  )}
                </>
          }
          confirmLabel="Delete Group"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>
            Contact Groups{" "}
            <span style={{ color: T.muted, fontSize: 14, fontWeight: 400 }}>({groups.length})</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
            Group contacts into named lists for targeted actions and bulk operations.
          </div>
        </div>
        <Btn onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={13} style={{ marginRight: 4 }} /> New Group
        </Btn>
      </div>

      {/* New group input */}
      {adding && (
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8 }}>Group name</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
              placeholder="e.g. VIP Clients, Q1 Campaign, Newsletter Group…"
              style={{
                flex: 1, background: T.bg, border: "1px solid " + T.border,
                borderRadius: 7, padding: "7px 12px",
                color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e  => (e.target.style.borderColor = T.border)}
            />
            <Btn onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving ? <Spinner size={13} color="#fff" /> : "Create"}
            </Btn>
            <Btn variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Table */}
      {groups.length === 0 && !adding ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Tag size={28} color={T.muted} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: T.sub, marginBottom: 6 }}>No groups yet</div>
          <div style={{ fontSize: 12, color: T.muted }}>
            Create groups to organize contacts for bulk actions, imports, and campaigns.
          </div>
        </Card>
      ) : groups.length > 0 && (
        <Card style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.panel }}>
                {["Group Name", "Contacts", "Created By", "Created", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 14px", textAlign: "left",
                    color: T.muted, fontWeight: 600, fontSize: 10,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: "1px solid " + T.border, whiteSpace: "nowrap",
                    ...(i === 4 ? { width: 48 } : {}),
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}
                  style={{ borderBottom: "1px solid " + T.border }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.panel)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Name */}
                  <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                    {editId === g.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditId(null); }}
                          style={{
                            background: T.bg, border: "1px solid " + T.accent,
                            borderRadius: 6, padding: "4px 9px",
                            color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit",
                          }}
                        />
                        <Btn onClick={handleEditSave} disabled={!editName.trim() || editSaving}>
                          {editSaving ? <Spinner size={13} color="#fff" /> : "Save"}
                        </Btn>
                        <Btn variant="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: T.accent + "15", border: "1px solid " + T.accent + "25",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Tag size={13} color={T.accent} />
                        </div>
                        <span style={{ fontWeight: 600, color: T.text }}>{g.name}</span>
                      </div>
                    )}
                  </td>

                  {/* Contact count */}
                  <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: T.blue + "12", color: T.blue,
                      border: "1px solid " + T.blue + "25",
                      borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                    }}>
                      {g.contactCount} contact{g.contactCount !== 1 ? "s" : ""}
                    </span>
                  </td>

                  {/* Created by */}
                  <td style={{ padding: "12px 14px", verticalAlign: "middle", color: T.sub, fontSize: 12 }}>
                    {g.createdBy || "—"}
                  </td>

                  {/* Created date */}
                  <td style={{ padding: "12px 14px", verticalAlign: "middle", color: T.muted, fontSize: 12 }}>
                    {fmt.ago(g.createdAt)}
                  </td>

                  {/* Three-dot menu */}
                  <td style={{ padding: "12px 8px", verticalAlign: "middle", textAlign: "right" }}>
                    <RowMenu
                      onEdit={() => { setEditId(g.id); setEditName(g.name); }}
                      onDelete={() => setDeleteTarget(g)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
