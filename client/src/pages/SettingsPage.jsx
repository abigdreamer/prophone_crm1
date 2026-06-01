import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { User, TrendingUp, Building2, Wrench, Database, Share2, Plus, Trash2, GripVertical } from "lucide-react";

import ClientsPage from "./ClientsPage";
import UserSettingsPage from "../components/settings/UserSettingsPage";

import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import { useAppToast } from "../context/ToastContext";
import { SkeletonRow } from "../components/ui/Loader";
import * as db from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CONTACT_FIELD_GROUPS = [
  {
    group: "Contact Info",
    icon: User,
    fields: [
      { key: "firstName", label: "Show First Name" },
      { key: "lastName",  label: "Show Last Name" },
      { key: "phone",     label: "Show Phone" },
      { key: "email",     label: "Show Email" },
      { key: "website",   label: "Show Website" },
      { key: "address",   label: "Show Address" },
      { key: "title",     label: "Show Job Title" },
    ],
  },
  {
    group: "Pipeline",
    icon: TrendingUp,
    fields: [
      { key: "lifecycleStage", label: "Show Lead Stage" },
      { key: "leadScore",      label: "Show Lead Score" },
    ],
  },
  {
    group: "Company & Account",
    icon: Building2,
    span: 2,
    fields: [
      { key: "company",            label: "Show Company" },
      { key: "accountSize",        label: "Show Account Size" },
      { key: "trucks",             label: "Show Fleet Size (Trucks)" },
      { key: "estAnnualRevenue",   label: "Show Est. Revenue" },
      { key: "contractValue",      label: "Show Contract Value" },
      { key: "yearsInBusiness",    label: "Show Years in Business" },
      { key: "serviceAreaMiles",   label: "Show Service Area (mi)" },
      { key: "dispatcherSoftware", label: "Show Dispatcher Software" },
      { key: "source",             label: "Show Source" },
      { key: "campaign",           label: "Show Campaign" },
    ],
  },
  {
    group: "Services & Operations",
    icon: Wrench,
    fields: [
      { key: "servicesOffered",       label: "Show Services Offered" },
      { key: "motorClubAffiliations", label: "Show Motor Club Affiliations" },
      { key: "painPoints",            label: "Show Pain Points" },
    ],
  },
  {
    group: "CRM",
    icon: Database,
    fields: [
      { key: "notes", label: "Show Notes" },
      { key: "tags",  label: "Show Tags" },
    ],
  },
  {
    group: "Social Media",
    icon: Share2,
    span: 2,
    fields: [
      { key: "social_facebook",  label: "Show Facebook" },
      { key: "social_instagram", label: "Show Instagram" },
      { key: "social_linkedin",  label: "Show LinkedIn" },
      { key: "social_twitter",   label: "Show Twitter / X" },
      { key: "social_youtube",   label: "Show YouTube" },
      { key: "social_yelp",      label: "Show Yelp" },
      { key: "social_pinterest", label: "Show Pinterest" },
      { key: "social_tiktok",    label: "Show TikTok" },
    ],
  },
];

const DEFAULT_VISIBILITY = Object.fromEntries(
  CONTACT_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, true]))
);

// ─────────────────────────────────────────────────────────────────────────────
// Small Components
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  const T = useTheme();

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? T.accent : T.border,
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function SmallButton({ children, onClick }) {
  const T = useTheme();

  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 5,
        border: "1px solid " + T.border,
        background: "transparent",
        color: T.muted,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Field Settings
// ─────────────────────────────────────────────────────────────────────────────

function ContactFieldSettings({ clientId }) {
  const T = useTheme();
  const toast = useAppToast();

  const [vis, setVis] = useState(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setDirty(false);

      try {
        const res = await db.getSettings(clientId, "contact_fields");
        if (!mounted) return;

        if (res?.config && Object.keys(res.config).length > 0) {
          setVis({ ...DEFAULT_VISIBILITY, ...res.config });
        } else {
          setVis({ ...DEFAULT_VISIBILITY });
        }
      } catch {
        if (mounted) setVis({ ...DEFAULT_VISIBILITY });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [clientId]);

  const toggleField = useCallback((key) => {
    setVis((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }, []);

  const toggleGroup = useCallback((keys, value) => {
    setVis((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = value));
      return next;
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.saveSettings(clientId, "contact_fields", vis);
      setDirty(false);
      toast.success("Visibility settings updated.");
    } catch {
      toast.error("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} cols={2} />)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
          Show/Hide Details from Contact
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
          Choose which fields are displayed in the lead profile view.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {CONTACT_FIELD_GROUPS.map(({ group, icon: Icon, fields, span }) => {
          const keys = fields.map((f) => f.key);
          const onCount = fields.filter((f) => vis[f.key] !== false).length;

          return (
            <div
              key={group}
              style={{
                gridColumn: span === 2 ? "1 / -1" : undefined,
                background: T.card,
                border: "1px solid " + T.border,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: "1px solid " + T.border,
                  background: T.surface,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: T.accent + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={13} color={T.accent} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
                    {group}{" "}
                    <span style={{ fontWeight: 500, color: T.muted }}>
                      ({onCount}/{fields.length})
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <SmallButton onClick={() => toggleGroup(keys, true)}>All On</SmallButton>
                  <SmallButton onClick={() => toggleGroup(keys, false)}>All Off</SmallButton>
                </div>
              </div>

              <div style={span === 2 ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : {}}>
                {fields.map((f, idx) => {
                  const isOn = vis[f.key] !== false;
                  return (
                    <div
                      key={f.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "13px 18px",
                        borderBottom: idx === fields.length - 1 ? "none" : "1px solid " + T.border + "44",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: isOn ? T.text : T.muted }}>
                        {f.label}
                      </span>
                      <Toggle checked={isOn} onChange={() => toggleField(f.key)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: dirty ? T.accent : T.surface,
            color: dirty ? "#fff" : T.muted,
            fontWeight: 800,
            cursor: dirty ? "pointer" : "not-allowed",
            transition: "0.2s",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Custom Fields (UDF) Management
// ─────────────────────────────────────────────────────────────────────────────

const UDF_TYPES = ["TEXT", "DROPDOWN", "NUMBER", "DATE", "CHECKBOX"];

// All contact fields available for custom sort / filter options
const AVAILABLE_CONTACT_FIELDS = [
  { field: "lifecycleStage",     label: "Stage",                fieldType: "text"   },
  { field: "status",             label: "Status",               fieldType: "text"   },
  { field: "leadScore",          label: "Lead Score",           fieldType: "number" },
  { field: "email",              label: "Email",                fieldType: "text"   },
  { field: "phone",              label: "Phone",                fieldType: "text"   },
  { field: "title",              label: "Job Title",            fieldType: "text"   },
  { field: "source",             label: "Source",               fieldType: "text"   },
  { field: "campaign",           label: "Campaign",             fieldType: "text"   },
  { field: "state",              label: "State",                fieldType: "text"   },
  { field: "zip",                label: "ZIP Code",             fieldType: "text"   },
  { field: "ownedBy",            label: "Owned By",             fieldType: "text"   },
  { field: "addedBy",            label: "Added By",             fieldType: "text"   },
  { field: "accountSize",        label: "Account Size",         fieldType: "text"   },
  { field: "dispatcherSoftware", label: "Dispatcher Software",  fieldType: "text"   },
  { field: "trucks",             label: "Fleet Size",           fieldType: "number" },
  { field: "contractValue",      label: "Contract Value",       fieldType: "number" },
  { field: "yearsInBusiness",    label: "Years in Business",    fieldType: "number" },
  { field: "serviceAreaMiles",   label: "Service Area (mi)",    fieldType: "number" },
  { field: "createdAt",          label: "Date Added",           fieldType: "date"   },
  { field: "lastActivityAt",     label: "Last Activity",        fieldType: "date"   },
];

const SORTABLE_FIELDS = AVAILABLE_CONTACT_FIELDS;
const FILTERABLE_FIELDS = AVAILABLE_CONTACT_FIELDS.filter(f => f.fieldType !== "date");

function dirLabel(fieldType, dir) {
  if (fieldType === "number") return dir === "asc" ? "Low → High" : "High → Low";
  if (fieldType === "date")   return dir === "asc" ? "Oldest → Newest" : "Newest → Oldest";
  return dir === "asc" ? "A → Z" : "Z → A";
}

function filterTypeForField(fieldType) {
  if (fieldType === "number") return "NUMBER";
  return "TEXT";
}

function CustomFieldsSettings({ clientId }) {
  const T = useTheme();
  const toast = useAppToast();

  const inputStyle = (active) => ({
    background: T.bg, border: "1px solid " + (active ? T.accent : T.border),
    borderRadius: 7, padding: "7px 10px", color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%",
  });

  return (
    <div style={{ padding: "0 40px" }}>
      <CustomSortSection clientId={clientId} T={T} toast={toast} inputStyle={inputStyle} />
      <CustomFilterSection clientId={clientId} T={T} toast={toast} inputStyle={inputStyle} />
      <CardDisplaySection clientId={clientId} T={T} toast={toast} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Sort Options Section
// ─────────────────────────────────────────────────────────────────────────────

function useDragReorder(items, setItems, updateFn) {
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  function onDragStart(idx) { dragIdx.current = idx; }
  function onDragOver(e, idx) { e.preventDefault(); setOverIdx(idx); }
  function onDragLeave() { setOverIdx(null); }
  async function onDrop(e, idx) {
    e.preventDefault();
    setOverIdx(null);
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from == null || from === idx) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    try {
      await Promise.all(next.map((item, i) => updateFn(item.id, { displayOrder: i })));
    } catch { /* silent */ }
  }
  return { overIdx, onDragStart, onDragOver, onDragLeave, onDrop };
}

function CustomSortSection({ clientId, T, toast, inputStyle }) {
  const [sorts,   setSorts]   = useState([]);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(null);
  const [newSort, setNewSort] = useState({ label: "", field: "", direction: "asc" });
  const drag = useDragReorder(sorts, setSorts, (id, data) => db.updateCustomSort(id, data));

  useEffect(() => {
    db.getCustomSorts().then(r => setSorts(r.data || [])).catch(() => {});
  }, [clientId]);

  const selectedFieldMeta = SORTABLE_FIELDS.find(f => f.field === newSort.field);

  async function handleAdd() {
    if (!newSort.label.trim() || !newSort.field) return toast.error("Label and field are required.");
    setSaving("new");
    try {
      const res = await db.createCustomSort({ label: newSort.label.trim(), contactField: newSort.field, direction: newSort.direction });
      setSorts(prev => [...prev, res.data]);
      setNewSort({ label: "", field: "", direction: "asc" });
      setAdding(false);
      toast.success("Sort option created.");
    } catch { toast.error("Failed to create."); }
    finally { setSaving(null); }
  }

  async function handleToggle(opt) {
    setSaving(opt.id);
    try {
      const res = await db.updateCustomSort(opt.id, { isActive: !opt.isActive });
      setSorts(prev => prev.map(o => o.id === opt.id ? res.data : o));
    } catch { toast.error("Failed to update."); }
    finally { setSaving(null); }
  }

  async function handleDelete(opt) {
    if (!window.confirm(`Delete sort option "${opt.label}"?`)) return;
    setSaving(opt.id);
    try {
      await db.deleteCustomSort(opt.id);
      setSorts(prev => prev.filter(o => o.id !== opt.id));
      toast.success("Deleted.");
    } catch { toast.error("Failed to delete."); }
    finally { setSaving(null); }
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Sort Options</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Drag to reorder. Toggle on/off to control what appears in the sort dropdown.
      </div>

      {sorts.length > 0 && (
        <div style={{ columns: "480px 2", columnGap: 8, marginBottom: 12 }}>
          {sorts.map((opt, idx) => {
            const meta = SORTABLE_FIELDS.find(f => f.field === opt.contactField);
            const isOver = drag.overIdx === idx;
            return (
              <div key={opt.id}
                draggable
                onDragStart={() => drag.onDragStart(idx)}
                onDragOver={e => drag.onDragOver(e, idx)}
                onDragLeave={drag.onDragLeave}
                onDrop={e => drag.onDrop(e, idx)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "11px 14px", borderRadius: 8,
                  border: "1.5px solid " + (isOver ? T.accent : T.border),
                  background: isOver ? T.accent + "0c" : T.card,
                  transition: "border-color 0.1s, background 0.1s",
                  cursor: "grab", breakInside: "avoid", marginBottom: 8,
                }}
              >
                <GripVertical size={13} style={{ color: T.muted, flexShrink: 0, cursor: "grab" }} />
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: T.dim, flexShrink: 0 }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{opt.label}</span>
                    {opt.isBuiltIn && <span style={{ fontSize: 8, fontWeight: 700, background: T.accent + "18", color: T.accent, padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap" }}>built-in</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {meta?.label || opt.contactField} · {dirLabel(meta?.fieldType || "text", opt.direction)}
                  </div>
                </div>
                <Toggle checked={opt.isActive} onChange={() => handleToggle(opt)} />
                {!opt.isBuiltIn ? (
                  <button onClick={() => handleDelete(opt)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4, borderRadius: 5, display: "flex", flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = T.red; }} onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}>
                    <Trash2 size={13} />
                  </button>
                ) : <div style={{ width: 21, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <div style={{ background: T.card, borderRadius: 10, border: "1px solid " + T.accent + "50", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 12 }}>New Sort Option</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>CONTACT FIELD</div>
              <select value={newSort.field} onChange={e => {
                  const meta = SORTABLE_FIELDS.find(f => f.field === e.target.value);
                  setNewSort(p => ({ ...p, field: e.target.value, label: meta ? `${meta.label} ${dirLabel(meta.fieldType, p.direction)}` : p.label }));
                }} style={{ ...inputStyle(!!newSort.field), cursor: "pointer" }}>
                <option value="">Select a field…</option>
                {SORTABLE_FIELDS.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>DIRECTION</div>
              <select value={newSort.direction} onChange={e => {
                  const meta = SORTABLE_FIELDS.find(f => f.field === newSort.field);
                  setNewSort(p => ({ ...p, direction: e.target.value, label: meta ? `${meta.label} ${dirLabel(meta.fieldType, e.target.value)}` : p.label }));
                }} style={{ ...inputStyle(false), cursor: "pointer" }}>
                <option value="asc">{selectedFieldMeta ? dirLabel(selectedFieldMeta.fieldType, "asc") : "Ascending"}</option>
                <option value="desc">{selectedFieldMeta ? dirLabel(selectedFieldMeta.fieldType, "desc") : "Descending"}</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>LABEL IN DROPDOWN</div>
              <input value={newSort.label} onChange={e => setNewSort(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Revenue High → Low" style={inputStyle(!!newSort.label)} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setAdding(false); setNewSort({ label: "", field: "", direction: "asc" }); }}
                style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving === "new" || !newSort.label.trim() || !newSort.field}
                style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (saving === "new" || !newSort.label.trim() || !newSort.field) ? 0.6 : 1 }}>
                {saving === "new" ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, border: "1px dashed " + T.border, background: "transparent", color: T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
          <Plus size={14} /> Add Sort Option
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Filter Options Section
// ─────────────────────────────────────────────────────────────────────────────

function CustomFilterSection({ clientId, T, toast, inputStyle }) {
  const [filters,   setFilters]   = useState([]);
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(null);
  const [newFilter, setNewFilter] = useState({ label: "", field: "", filterType: "TEXT", options: "" });
  const drag = useDragReorder(filters, setFilters, (id, data) => db.updateCustomFilterOpt(id, data));

  useEffect(() => {
    db.getCustomFilterOpts().then(r => setFilters(r.data || [])).catch(() => {});
  }, [clientId]);

  async function handleAdd() {
    if (!newFilter.label.trim() || !newFilter.field) return toast.error("Label and field are required.");
    setSaving("new");
    try {
      const options = newFilter.filterType === "DROPDOWN"
        ? newFilter.options.split(",").map(s => s.trim()).filter(Boolean).map(s => ({ value: s, label: s }))
        : [];
      const res = await db.createCustomFilterOpt({ label: newFilter.label.trim(), contactField: newFilter.field, filterType: newFilter.filterType, options });
      setFilters(prev => [...prev, res.data]);
      setNewFilter({ label: "", field: "", filterType: "TEXT", options: "" });
      setAdding(false);
      toast.success("Filter created.");
    } catch { toast.error("Failed to create filter."); }
    finally { setSaving(null); }
  }

  async function handleToggle(opt) {
    setSaving(opt.id);
    try {
      const res = await db.updateCustomFilterOpt(opt.id, { isActive: !opt.isActive });
      setFilters(prev => prev.map(o => o.id === opt.id ? res.data : o));
    } catch { toast.error("Failed to update."); }
    finally { setSaving(null); }
  }

  async function handleDelete(opt) {
    if (!window.confirm(`Delete filter "${opt.label}"?`)) return;
    setSaving(opt.id);
    try {
      await db.deleteCustomFilterOpt(opt.id);
      setFilters(prev => prev.filter(o => o.id !== opt.id));
      toast.success("Deleted.");
    } catch { toast.error("Failed to delete."); }
    finally { setSaving(null); }
  }

  const selectedMeta = FILTERABLE_FIELDS.find(f => f.field === newFilter.field);

  return (
    <div style={{ marginTop: 32, paddingBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Filter Options</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Drag to reorder. Toggle on/off to control what appears in the sidebar filter panel.
      </div>

      {filters.length > 0 && (
        <div style={{ columns: "480px 2", columnGap: 8, marginBottom: 12 }}>
          {filters.map((opt, idx) => {
            const meta = FILTERABLE_FIELDS.find(f => f.field === opt.contactField);
            const isOver = drag.overIdx === idx;
            return (
              <div key={opt.id}
                draggable
                onDragStart={() => drag.onDragStart(idx)}
                onDragOver={e => drag.onDragOver(e, idx)}
                onDragLeave={drag.onDragLeave}
                onDrop={e => drag.onDrop(e, idx)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "11px 14px", borderRadius: 8,
                  border: "1.5px solid " + (isOver ? T.accent : T.border),
                  background: isOver ? T.accent + "0c" : T.card,
                  transition: "border-color 0.1s, background 0.1s",
                  cursor: "grab", breakInside: "avoid", marginBottom: 8,
                }}
              >
                <GripVertical size={13} style={{ color: T.muted, flexShrink: 0, cursor: "grab" }} />
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: T.dim, flexShrink: 0 }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                    {opt.isBuiltIn && <span style={{ fontSize: 8, fontWeight: 700, background: T.accent + "18", color: T.accent, padding: "1px 5px", borderRadius: 4, whiteSpace: "nowrap" }}>built-in</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <span>{meta?.label || opt.contactField}</span>
                    <span style={{ background: T.border, color: T.dim, padding: "0px 4px", borderRadius: 3, fontSize: 8, fontWeight: 700 }}>{opt.filterType}</span>
                    {opt.filterType === "DROPDOWN" && Array.isArray(opt.options) && opt.options.length > 0 && (
                      <span style={{ color: T.dim }}>· {opt.options.length} opts</span>
                    )}
                  </div>
                </div>
                <Toggle checked={opt.isActive} onChange={() => handleToggle(opt)} />
                {!opt.isBuiltIn ? (
                  <button onClick={() => handleDelete(opt)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4, borderRadius: 5, display: "flex", flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = T.red; }} onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}>
                    <Trash2 size={13} />
                  </button>
                ) : <div style={{ width: 21, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <div style={{ background: T.card, borderRadius: 10, border: "1px solid " + T.accent + "50", padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 12 }}>New Filter Option</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>CONTACT FIELD</div>
              <select value={newFilter.field} onChange={e => {
                  const meta = FILTERABLE_FIELDS.find(f => f.field === e.target.value);
                  setNewFilter(p => ({ ...p, field: e.target.value, label: meta?.label || p.label, filterType: meta ? filterTypeForField(meta.fieldType) : p.filterType }));
                }} style={{ ...inputStyle(!!newFilter.field), cursor: "pointer" }}>
                <option value="">Select a field…</option>
                {FILTERABLE_FIELDS.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>FILTER TYPE</div>
              <select value={newFilter.filterType} onChange={e => setNewFilter(p => ({ ...p, filterType: e.target.value }))}
                style={{ ...inputStyle(false), cursor: "pointer" }}>
                <option value="TEXT">Text (search)</option>
                <option value="NUMBER">Number (range)</option>
                <option value="DROPDOWN">Dropdown (exact)</option>
              </select>
            </div>
            {newFilter.filterType === "DROPDOWN" && (
              <div>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>OPTIONS <span style={{ fontWeight: 400 }}>(comma-separated)</span></div>
                <input value={newFilter.options} onChange={e => setNewFilter(p => ({ ...p, options: e.target.value }))} placeholder="Option 1, Option 2, Option 3" style={inputStyle(!!newFilter.options)} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 600 }}>LABEL IN FILTER PANEL</div>
              <input value={newFilter.label} onChange={e => setNewFilter(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Source, Campaign Name" style={inputStyle(!!newFilter.label)} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setAdding(false); setNewFilter({ label: "", field: "", filterType: "TEXT", options: "" }); }}
                style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving === "new" || !newFilter.label.trim() || !newFilter.field}
                style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (saving === "new" || !newFilter.label.trim() || !newFilter.field) ? 0.6 : 1 }}>
                {saving === "new" ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, border: "1px dashed " + T.border, background: "transparent", color: T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
          <Plus size={14} /> Add Filter Option
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Display Section
// ─────────────────────────────────────────────────────────────────────────────

const STATIC_DISPLAY_FIELDS = [
  { key: "company",    label: "Company"      },
  { key: "full_name",  label: "Full Name"    },
  { key: "email",      label: "Email"        },
  { key: "phone",      label: "Phone"        },
  { key: "lead_score", label: "Lead Score"   },
  { key: "address",    label: "Address"      },
  { key: "city_state", label: "City / State" },
  { key: "trucks",     label: "Fleet Size"   },
];

function CardDisplaySection({ clientId, T, toast }) {
  const [fields,   setFields]   = useState(["company", "lead_score", "address"]);
  const [saving,   setSaving]   = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    db.getSettings(clientId, "sidebar_card_display")
      .then(res => { if (res?.config?.fields?.length > 0) setFields(res.config.fields); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [clientId]);

  // Auto-save 600ms after any change (skip the initial load)
  useEffect(() => {
    if (!loaded) return;
    setSaving(true);
    const timer = setTimeout(() => {
      db.saveSettings(clientId, "sidebar_card_display", { fields })
        .catch(() => toast.error("Failed to save display settings."))
        .finally(() => setSaving(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [fields]); // eslint-disable-line

  function toggle(key) {
    setFields(prev => {
      if (prev.includes(key)) {
        const next = prev.filter(k => k !== key);
        return next.length === 0 ? prev : next;
      }
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  const fieldOptions = [...STATIC_DISPLAY_FIELDS];

  function renderPreviewField(key) {
    if (key === "company")    return { icon: "🏢", text: "ABC Towing Co." };
    if (key === "full_name")  return { icon: "👤", text: "John Doe" };
    if (key === "email")      return { icon: "✉️",  text: "john@abctowing.com" };
    if (key === "phone")      return { icon: "📞", text: "(555) 123-4567" };
    if (key === "address")    return { icon: "📍", text: "123 Main St, Houston TX" };
    if (key === "city_state") return { icon: "🗺️",  text: "Houston, TX" };
    if (key === "trucks")     return { icon: "🚛", text: "8 trucks" };
    return null;
  }

  return (
    <div style={{ marginTop: 32, paddingBottom: 40 }}>
      {/* Section header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Contact Card Display</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>
          Choose which fields appear in each contact card in the sidebar (1–3 fields). Name and last activity are always shown.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Field picker card ── */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden" }}>
          {/* Card header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 18px", borderBottom: "1px solid " + T.border, background: T.surface,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
                Select Fields <span style={{ fontWeight: 500, color: T.muted }}>({fields.length}/3 selected)</span>
              </span>
            </div>
            {saving && <span style={{ fontSize: 10, color: T.muted }}>Saving…</span>}
          </div>

          {/* Field grid */}
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {fieldOptions.map(({ key, label }) => {
                const idx    = fields.indexOf(key);
                const isOn   = idx !== -1;
                const canAdd = fields.length < 3;
                const order  = isOn ? idx + 1 : null;
                return (
                  <div
                    key={key}
                    onClick={() => (isOn || canAdd) && toggle(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 8,
                      border: "1.5px solid " + (isOn ? T.accent + "70" : T.border),
                      background: isOn ? T.accent + "12" : T.bg,
                      cursor: isOn || canAdd ? "pointer" : "default",
                      userSelect: "none", transition: "all 0.12s",
                      opacity: !isOn && !canAdd ? 0.38 : 1,
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isOn ? T.accent : T.border + "60",
                      fontSize: 10, fontWeight: 800, color: isOn ? "#fff" : T.muted,
                      transition: "all 0.12s",
                    }}>
                      {order || ""}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isOn ? 700 : 500, color: isOn ? T.text : T.muted, transition: "color 0.12s" }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: T.muted }}>
              Click a field to toggle · order reflects selection sequence
            </div>
          </div>
        </div>

        {/* ── Live preview card ── */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden" }}>
          {/* Card header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderBottom: "1px solid " + T.border, background: T.surface,
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Live Preview</span>
          </div>

          {/* Preview content */}
          <div style={{ padding: "16px 18px" }}>
            <div style={{
              background: T.bg, border: "1px solid " + T.border, borderRadius: 10,
              overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            }}>
              {/* Sidebar header stub */}
              <div style={{ padding: "8px 12px", borderBottom: "1px solid " + T.border, background: T.card }}>
                <div style={{ height: 8, width: "55%", borderRadius: 4, background: T.border }} />
              </div>
              {/* Ghost row above */}
              <div style={{ padding: "9px 12px", borderBottom: "1px solid " + T.border, opacity: 0.35 }}>
                <div style={{ height: 9, width: "45%", borderRadius: 3, background: T.border, marginBottom: 5 }} />
                <div style={{ height: 7, width: "30%", borderRadius: 3, background: T.border }} />
              </div>
              {/* Active contact card */}
              <div style={{
                padding: "10px 12px", borderBottom: "1px solid " + T.border,
                borderLeft: "3px solid " + T.accent, background: T.accent + "10",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: T.accent + "25", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.accent,
                }}>JD</div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>John Doe</span>
                    <span style={{ fontSize: 7, fontWeight: 800, background: "#3b82f620", color: "#3b82f6", padding: "2px 5px", borderRadius: 4, whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0 }}>LEAD</span>
                  </div>
                  {fields.map(key => {
                    if (key === "lead_score") return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: T.border, overflow: "hidden" }}>
                          <div style={{ width: "72%", height: "100%", background: T.accent, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.text, flexShrink: 0 }}>72</span>
                      </div>
                    );
                    const f = renderPreviewField(key);
                    if (!f) return null;
                    return (
                      <div key={key} style={{ fontSize: 10, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.icon} {f.text}
                      </div>
                    );
                  })}
                  <div style={{ textAlign: "right", marginTop: 1 }}>
                    <span style={{ fontSize: 9, color: T.muted }}>2h ago</span>
                  </div>
                </div>
              </div>
              {/* Ghost rows below */}
              <div style={{ padding: "9px 12px", borderBottom: "1px solid " + T.border, opacity: 0.35 }}>
                <div style={{ height: 9, width: "52%", borderRadius: 3, background: T.border, marginBottom: 5 }} />
                <div style={{ height: 7, width: "36%", borderRadius: 3, background: T.border }} />
              </div>
              <div style={{ padding: "9px 12px", opacity: 0.2 }}>
                <div style={{ height: 9, width: "40%", borderRadius: 3, background: T.border, marginBottom: 5 }} />
                <div style={{ height: 7, width: "28%", borderRadius: 3, background: T.border }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage({ currentUser }) {
  const { clientId } = usePool();
  const [searchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "contact_fields";

  return (
    <div style={{ padding: "28px 32px", overflowY: "auto", height: "100%" }}>
      {activeTab === "contact_fields" && (
        <ContactFieldSettings clientId={clientId} />
      )}
      {activeTab === "custom_fields" && <CustomFieldsSettings clientId={clientId} />}
      {activeTab === "clients" && <ClientsPage />}
      {activeTab === "user" && <UserSettingsPage currentUser={currentUser} />}
    </div>
  );
}