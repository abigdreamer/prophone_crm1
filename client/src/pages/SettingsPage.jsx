import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  LayoutGrid, Users, FolderOpen, ChevronLeft, ChevronRight,
  BarChart2, Plus, Pencil, Trash2, X, Eye, EyeOff,
  MoreHorizontal, Search, RefreshCw, Loader2, Check,
} from "lucide-react";

import ClientsPage from "./ClientsPage";
import ComingSoon from "../components/layout/ComingSoon";

import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import { useAppToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";
import * as db from "../services/api";
import {
  listProjects as listPosthogProjects,
  createProject as createPosthogProject,
  updateProject as updatePosthogProject,
  deleteProject as deletePosthogProject,
} from "../services/posthogProjects";

const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_OPEN = 230;
const SIDEBAR_COLLAPSED = 60;

const NAV_ITEMS = [
  { id: "contact_fields",  label: "Contact Fields",  Icon: LayoutGrid },
  { id: "clients",         label: "Clients",         Icon: FolderOpen },
  { id: "posthog_projects", label: "PostHog",        Icon: BarChart2  },
  { id: "user_settings",   label: "User",            Icon: Users      },
];

const CONTACT_FIELD_GROUPS = [
  {
    group: "Contact Info",
    fields: [
      { key: "email", label: "Show Email" },
      { key: "phone", label: "Show Phone" },
      { key: "website", label: "Show Website" },
      { key: "address", label: "Show Address" },
    ],
  },
  {
    group: "Company & Acquisition",
    fields: [
      { key: "company", label: "Show Company" },
      { key: "title", label: "Show Job Title" },
      { key: "accountSize", label: "Show Account Size" },
      { key: "source", label: "Show Source" },
      { key: "campaign", label: "Show Campaign" },
    ],
  },
  {
    group: "Metrics",
    fields: [
      { key: "leadScore", label: "Show Lead Score" },
      { key: "contractValue", label: "Show Contract Value" },
      { key: "trucks", label: "Show Fleet Size (Trucks)" },
    ],
  },
  {
    group: "CRM",
    fields: [
      { key: "notes", label: "Show Notes" },
      { key: "tags", label: "Show Tags" },
    ],
  },
  {
    group: "Social Media",
    span: 2,
    fields: [
      { key: "social_facebook", label: "Show Facebook" },
      { key: "social_instagram", label: "Show Instagram" },
      { key: "social_linkedin", label: "Show LinkedIn" },
      { key: "social_twitter", label: "Show Twitter / X" },
      { key: "social_youtube", label: "Show YouTube" },
      { key: "social_yelp", label: "Show Yelp" },
      { key: "social_pinterest", label: "Show Pinterest" },
      { key: "social_tiktok", label: "Show TikTok" },
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
    return <div style={{ padding: 32, color: T.muted }}>Loading...</div>;
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
        {CONTACT_FIELD_GROUPS.map(({ group, fields, span }) => {
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
                <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
                  {group}{" "}
                  <span style={{ fontWeight: 500, color: T.muted }}>
                    ({onCount}/{fields.length})
                  </span>
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
// PostHog Projects Section
// ─────────────────────────────────────────────────────────────────────────────

function ThreeDotMenu({ items }) {
  const T = useTheme();
  const [open, setOpen] = useState(false);
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={btnRef} style={{ position: "relative" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 30, height: 30, borderRadius: 7,
          background: open ? T.panel : "transparent",
          border: "1px solid " + (open ? T.border : "transparent"),
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.panel; e.currentTarget.style.borderColor = T.border; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{
          position: "fixed",
          top: btnRef.current?.getBoundingClientRect().bottom + 4,
          left: btnRef.current?.getBoundingClientRect().right - 180,
          width: 180, zIndex: 2000,
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden", padding: "4px 0",
        }}>
          {items.map((item, i) => item === "divider"
            ? <div key={i} style={{ height: 1, background: T.border, margin: "3px 0" }} />
            : (
              <button key={i} onClick={e => { e.stopPropagation(); setOpen(false); item.action(); }} style={{
                width: "100%", padding: "9px 14px",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 13, fontFamily: "inherit", textAlign: "left",
                color: item.danger ? "#ef4444" : T.text,
              }}
              onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fef2f230" : T.panel}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {item.icon && <item.icon size={13} />}
                {item.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function ProjectFormModal({ mode, project, onClose, onSaved }) {
  const T = useTheme();
  const toast = useAppToast();
  const [form, setForm] = useState(
    mode === "edit" && project
      ? { label: project.label, domain: project.domain, project_id: project.project_id, sort_order: String(project.sort_order ?? 0) }
      : { key: "", label: "", domain: "", project_id: "", sort_order: "0" }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit() {
    const e = {};
    if (mode === "create" && !form.key.trim())  e.key = "Required";
    if (!form.label.trim())      e.label      = "Required";
    if (!form.domain.trim())     e.domain     = "Required";
    if (!form.project_id.trim()) e.project_id = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        label: form.label, domain: form.domain,
        project_id: form.project_id, sort_order: Number(form.sort_order) || 0,
      };
      if (mode === "create") payload.key = form.key;
      const saved = mode === "create"
        ? await createPosthogProject(payload)
        : await updatePosthogProject(project.id, payload);
      toast.success(mode === "create" ? `${saved.label} added.` : "Project updated.");
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err.status === 409) setErrors({ key: "Key already exists" });
      else toast.error("Failed to save project.");
    } finally { setSaving(false); }
  }

  function Field({ label, k, placeholder, disabled }) {
    const [focus, setFocus] = useState(false);
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
          {label} <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          value={form[k] ?? ""} onChange={e => set(k)(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          style={{
            width: "100%", padding: "9px 12px", boxSizing: "border-box",
            background: disabled ? T.panel : T.surface,
            border: "1.5px solid " + (errors[k] ? "#ef4444" : focus ? T.accent : T.border),
            borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
          }}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        />
        {errors[k] && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors[k]}</div>}
      </div>
    );
  }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", padding: 20,
    }}>
      <div style={{ background: T.surface, borderRadius: 16, width: "100%", maxWidth: 480, border: "1px solid " + T.border, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{mode === "create" ? "Add PostHog Project" : "Edit Project"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <style>{SPIN}</style>
          {mode === "create" && <Field label="Key (slug)" k="key" placeholder="foxtow" />}
          <Field label="Label (display name)" k="label" placeholder="Foxtow" />
          <Field label="Domain" k="domain" placeholder="foxtow.com" />
          <Field label="PostHog Project ID" k="project_id" placeholder="365531" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Sort Order</label>
            <input value={form.sort_order} onChange={e => set("sort_order")(e.target.value)} placeholder="0" style={{ width: "100%", padding: "9px 12px", boxSizing: "border-box", background: T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }} />
          </div>
        </div>
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid " + T.border, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 16px", background: "transparent", border: "1px solid " + T.border, borderRadius: 8, color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: "9px 20px", background: saving ? T.border : T.accent, border: "none",
            borderRadius: 8, color: saving ? T.muted : "#fff", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 7,
          }}>
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? "Saving…" : mode === "create" ? "Add Project" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PosthogProjectsSection() {
  const T     = useTheme();
  const toast = useAppToast();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [projects,     setProjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function loadProjects(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    listPosthogProjects()
      .then(list => setProjects(Array.isArray(list) ? list : []))
      .catch(() => toast.error("Failed to load projects."))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadProjects(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      if (statusFilter === "visible" && p.hidden) return false;
      if (statusFilter === "hidden"  && !p.hidden) return false;
      if (!q) return true;
      return (p.label || "").toLowerCase().includes(q)
        || (p.domain || "").toLowerCase().includes(q)
        || String(p.project_id).includes(q);
    });
  }, [projects, search, statusFilter]);

  function handleSaved(saved) {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
    });
  }

  async function toggleHidden(p) {
    try {
      const updated = await updatePosthogProject(p.id, { hidden: !p.hidden });
      handleSaved(updated);
    } catch { toast.error("Failed to update."); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePosthogProject(deleteTarget.id);
      setProjects(prev => prev.filter(x => x.id !== deleteTarget.id));
      toast.success(`${deleteTarget.label} deleted.`);
      setDeleteTarget(null);
    } catch { toast.error("Failed to delete."); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{SPIN}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>PostHog Projects</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {filtered.length} of {projects.length} project{projects.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => loadProjects(true)} disabled={refreshing} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "transparent", border: "1px solid " + T.border, borderRadius: 7, color: T.text, fontSize: 12, fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            <RefreshCw size={13} style={refreshing ? { animation: "spin 1s linear infinite" } : {}} /> Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setModal({ mode: "create" })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: T.accent, border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Plus size={13} /> Add Project
            </button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} color={T.muted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, domain, project ID…"
            style={{ width: "100%", boxSizing: "border-box", background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: "10px 36px 10px 38px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = T.accent; }}
            onBlur={e =>  { e.target.style.borderColor = T.border; }}
          />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13 }}>✕</button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "10px 12px", background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">All Status</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: T.card || T.surface, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {["Project", "Domain", "Project ID", "Sort", "Status", "Visibility", ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 12px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: "1px solid " + T.border, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center" }}>
                  <Loader2 size={16} color={T.muted} style={{ animation: "spin 1s linear infinite" }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: T.muted, fontSize: 13 }}>
                  {search || statusFilter !== "all" ? "No projects match your filters." : "No projects yet. Add one to see it in Reports."}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}
                  onClick={() => isAdmin && setModal({ mode: "edit", project: p })}
                  style={{ borderBottom: "1px solid " + T.border, cursor: isAdmin ? "pointer" : "default", opacity: p.hidden ? 0.65 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.panel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 600, color: T.text }}>{p.label}</div></td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{p.domain}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{p.project_id}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: T.muted }}>{p.sort_order ?? 0}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase", background: p.hidden ? "#fef2f220" : "#f0fdf420", color: p.hidden ? "#ef4444" : "#16a34a", border: "1px solid " + (p.hidden ? "#fecaca50" : "#86efac50") }}>
                      {p.hidden ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <button onClick={e => { e.stopPropagation(); toggleHidden(p); }} title={p.hidden ? "Show in Reports" : "Hide from Reports"} style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 6, padding: "5px 9px", cursor: "pointer", color: T.muted, display: "inline-flex", alignItems: "center" }}>
                      {p.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </td>
                  <td style={{ padding: "9px 8px" }}>
                    {isAdmin && (
                      <ThreeDotMenu items={[
                        { label: "Edit Project",   icon: Pencil, action: () => setModal({ mode: "edit", project: p }) },
                        "divider",
                        { label: "Delete Project", icon: Trash2, danger: true, action: () => setDeleteTarget(p) },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ProjectFormModal mode={modal.mode} project={modal.project} onClose={() => setModal(null)} onSaved={handleSaved} />}

      {/* Delete confirm */}
      {deleteTarget && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", padding: 20 }}>
          <div style={{ background: T.surface, borderRadius: 16, width: "100%", maxWidth: 420, border: "1px solid " + T.border, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", padding: "28px 28px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 10 }}>Delete Project</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 24 }}>
              Remove <strong style={{ color: T.text }}>{deleteTarget.label}</strong> from PostHog Projects? Reports will no longer include this project.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ padding: "9px 16px", background: "transparent", border: "1px solid " + T.border, borderRadius: 8, color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "9px 18px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}>
                {deleting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {deleting ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const T = useTheme();
  const { clientId } = usePool();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Source of Truth for Tab State
  const activeTab = searchParams.get("tab") || "contact_fields";
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_OPEN;

  return (
    <div style={{ display: "flex", height: "100%", margin: "-20px", overflow: "hidden" }}>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          background: T.surface,
          borderRight: "1px solid " + T.border,
          transition: "width 0.2s",
          position: "relative",
        }}
      >
        <button
          onClick={() => setCollapsed((p) => !p)}
          style={{
            position: "absolute",
            right: -12,
            top: 18,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid " + T.border,
            background: T.surface,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div style={{ padding: 12 }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setSearchParams({ tab: id })}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: active ? T.accent + "15" : "transparent",
                  color: active ? T.accent : T.dim,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  marginBottom: 6,
                  transition: "0.2s",
                  textAlign: "left",
                }}
              >
                <Icon size={18} />
                {!collapsed && label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {activeTab === "contact_fields" && (
          <ContactFieldSettings clientId={clientId} />
        )}

        {activeTab === "clients" && <ClientsPage />}

        {activeTab === "posthog_projects" && <PosthogProjectsSection />}

        {activeTab === "user_settings" && <ComingSoon page="User Settings" />}
      </div>
    </div>
  );
}