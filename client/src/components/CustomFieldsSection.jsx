import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useUdfs } from "../context/UdfContext";
import { createUdf, updateUdf, deleteUdf, updateContactUdfs } from "../services/api";
import { SlidersHorizontal, X } from "lucide-react";

export default function CustomFieldsSection({ clientId, contactId, udfValues, onValueChange, toast, editMode, noWrapper }) {
  const T = useTheme();
  const { udfs, setUdfs, udfsLoaded, refreshUdfs } = useUdfs();
  const [editingId,   setEditingId]   = useState(null);
  const [labelDraft,  setLabelDraft]  = useState("");
  const [hoverIdx,    setHoverIdx]    = useState(null);
  const [overIdx,     setOverIdx]     = useState(null);
  const [fieldStatus, setFieldStatus] = useState({}); // { [sortKey]: 'saving'|'saved'|null }
  const fieldStatusTimers             = useRef({});
  const dragIdx                       = useRef(null);

  // Seed defaults only after context confirms UDFs are loaded and empty
  useEffect(() => {
    if (!udfsLoaded || udfs.length > 0) return;
    async function seed() {
      const defaults = ["Usrdefine1", "Usrdefine2", "Usrdefine3", "Usrdefine4", "Usrdefine5"];
      for (const [i, label] of defaults.entries()) {
        await createUdf({ label, type: "TEXT", displayOrder: i });
      }
      refreshUdfs();
    }
    seed().catch(() => {});
  }, [udfsLoaded]); // eslint-disable-line

  useEffect(() => {
    const timers = fieldStatusTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  function onDragStart(idx) { dragIdx.current = idx; }
  function onDragOver(e, idx) { e.preventDefault(); setOverIdx(idx); }
  function onDragLeave() { setOverIdx(null); }
  async function onDrop(e, idx) {
    e.preventDefault();
    setOverIdx(null);
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from == null || from === idx) return;
    const next = [...udfs];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setUdfs(next);
    try {
      await Promise.all(next.map((u, i) => updateUdf(u.id, { displayOrder: i })));
    } catch { /* silent */ }
  }

  function startEditLabel(udf) { setEditingId(udf.id); setLabelDraft(udf.label); }

  async function commitLabel(udf) {
    const trimmed = labelDraft.trim();
    setEditingId(null);
    if (!trimmed || trimmed === udf.label) return;
    try {
      const res = await updateUdf(udf.id, { label: trimmed });
      setUdfs(prev => prev.map(u => u.id === udf.id ? res.data : u));
    } catch { toast?.error("Failed to rename field."); }
  }

  async function handleDelete(udf) {
    try {
      await deleteUdf(udf.id);
      onValueChange(udf.sortKey, "");
      setUdfs(prev => prev.filter(u => u.id !== udf.id));
    } catch { toast?.error("Failed to delete field."); }
  }

  async function handleAdd() {
    try {
      const label = "Usrdefine" + (udfs.length + 1);
      const res = await createUdf({ label, type: "TEXT", displayOrder: udfs.length });
      const newUdf = res.data;
      setUdfs(prev => [...prev, newUdf]);
      // Auto-focus the new label for immediate rename
      setTimeout(() => setEditingId(newUdf.id), 50);
      setLabelDraft(label);
    } catch { toast?.error("Failed to add field."); }
  }

  async function handleValueBlur(sortKey, value) {
    if (!contactId) return;
    clearTimeout(fieldStatusTimers.current[sortKey]);
    setFieldStatus(prev => ({ ...prev, [sortKey]: 'saving' }));
    try {
      await updateContactUdfs(contactId, { [sortKey]: value });
      setFieldStatus(prev => ({ ...prev, [sortKey]: 'saved' }));
      fieldStatusTimers.current[sortKey] = setTimeout(
        () => setFieldStatus(prev => ({ ...prev, [sortKey]: null })),
        2000
      );
    } catch {
      setFieldStatus(prev => ({ ...prev, [sortKey]: null }));
      toast?.error("Failed to save.");
    }
  }

  function SaveIndicator({ sortKey }) {
    const status = fieldStatus[sortKey];
    if (status === 'saving') {
      return (
        <span style={{ flexShrink: 0, width: 16, fontSize: 11, color: T.muted, animation: "spin 0.8s linear infinite", display: "inline-block" }}>
          ◌
        </span>
      );
    }
    if (status === 'saved') {
      return <span style={{ flexShrink: 0, width: 16, fontSize: 11, color: T.green, fontWeight: 700 }}>✓</span>;
    }
    return <span style={{ flexShrink: 0, width: 16 }} />;
  }

  function renderRows() {
    return udfs.map((udf, idx) => (
      <div
        key={udf.id}
        draggable
        onDragStart={() => onDragStart(idx)}
        onDragOver={e => onDragOver(e, idx)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, idx)}
        onMouseEnter={() => setHoverIdx(idx)}
        onMouseLeave={() => setHoverIdx(null)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
          borderBottom: idx < udfs.length - 1 ? "1px solid " + T.border + "44" : "none",
          background: overIdx === idx ? T.accent + "0a" : "transparent",
          borderRadius: 4, transition: "background 0.1s",
        }}
      >
        {/* Drag handle — only in edit mode */}
        <span
          style={{
            cursor: editMode ? "grab" : "default", color: T.muted, fontSize: 16,
            lineHeight: 1, flexShrink: 0, userSelect: "none",
            opacity: editMode ? 0.6 : 0, width: 18, display: "inline-block",
            transition: "opacity 0.15s",
          }}
          title={editMode ? "Drag to reorder" : undefined}
        >
          {editMode ? "⠿" : ""}
        </span>

        {/* Label — click to rename */}
        <div style={{ flex: "0 0 120px", minWidth: 0 }}>
          {editingId === udf.id ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={() => commitLabel(udf)}
              onKeyDown={e => {
                if (e.key === "Enter")  { e.preventDefault(); commitLabel(udf); }
                if (e.key === "Escape") { setEditingId(null); }
              }}
              style={{
                width: "100%", padding: "4px 7px", background: T.bg,
                border: "1.5px solid " + T.accent, borderRadius: 4, color: T.text,
                fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit",
                boxSizing: "border-box", boxShadow: `0 0 0 3px ${T.accent}22`,
              }}
            />
          ) : (
            <span
              onClick={() => startEditLabel(udf)}
              title="Click to rename"
              style={{
                fontSize: 12, fontWeight: 600, color: T.dim, cursor: "text",
                display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {udf.label}
            </span>
          )}
        </div>

        {/* Value input */}
        <input
          data-field-nav
          type="text"
          value={udfValues?.[udf.sortKey] ?? ""}
          onChange={e => onValueChange(udf.sortKey, e.target.value)}
          onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`; }}
          onBlur={e => {
            e.target.style.borderColor = T.border;
            e.target.style.boxShadow = "none";
            handleValueBlur(udf.sortKey, e.target.value);
          }}
          placeholder="Enter value…"
          style={{
            flex: 1, padding: "6px 10px", background: T.surface,
            border: "1px solid " + T.border, borderRadius: 5, color: T.text,
            fontSize: 13, outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s, box-shadow 0.15s", minHeight: 32, boxSizing: "border-box",
          }}
        />

        {/* Per-field save indicator */}
        {contactId && <SaveIndicator sortKey={udf.sortKey} />}

        {/* Delete — only visible in edit mode */}
        {editMode && (
          <button
            onClick={() => handleDelete(udf)}
            title="Delete field"
            style={{
              flexShrink: 0, width: 26, height: 26, border: "none", borderRadius: 4,
              background: hoverIdx === idx ? T.red + "18" : "transparent",
              color: hoverIdx === idx ? T.red : T.muted,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "color 0.15s, background 0.15s",
              fontFamily: "inherit", padding: 0, opacity: hoverIdx === idx ? 1 : 0.35,
            }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    ));
  }

  function renderAddButton() {
    if (!editMode) return null;
    return (
      <button
        onClick={handleAdd}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
        style={{
          marginTop: 10, padding: "6px 12px", background: "transparent",
          border: "1px dashed " + T.border, borderRadius: 5, color: T.muted,
          fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          width: "100%", textAlign: "center", transition: "border-color 0.15s, color 0.15s",
        }}
      >
        + Add Field
      </button>
    );
  }

  if (noWrapper) {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column" }}>{renderRows()}</div>
        {renderAddButton()}
      </>
    );
  }

  return (
    <div style={{ background: T.card, borderRadius: 8, padding: "14px 16px", marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1.5px solid " + T.border }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: T.accent + "1a", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SlidersHorizontal size={13} color={T.accent} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "0.01em" }}>
            Custom Fields
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{renderRows()}</div>
      {renderAddButton()}
    </div>
  );
}
