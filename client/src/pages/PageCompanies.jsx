import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Building2, Plus, Pencil, Trash2, X, Loader2,
  ShieldCheck, Search, MoreHorizontal, Users, Globe,
} from "lucide-react";
import T from "../theme";
import {
  listCompanies, getCompany, createCompany,
  updateCompany, deleteCompany,
} from "../api/companies.api";
import { useToast } from "../hooks/useToast";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

const PLAN_META = {
  starter:    { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", label: "Starter"    },
  pro:        { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Pro"        },
  enterprise: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Enterprise" },
};

const PLAN_OPTIONS = [
  { value: "starter",    label: "Starter"    },
  { value: "pro",        label: "Pro"        },
  { value: "enterprise", label: "Enterprise" },
];

function genId(name) {
  return name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

// ── Shared form primitives ────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text", disabled, error, required, half }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: 18, ...(half ? { flex: 1 } : {}) }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: disabled ? T.muted : T.sub, marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 13px",
          background: disabled ? T.panel : T.surface,
          border: "1.5px solid " + (error ? "#ef4444" : focus ? T.accent : T.border),
          borderRadius: 9, fontSize: 13, color: disabled ? T.muted : T.text,
          fontFamily: "inherit", outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function SelField({ label, value, onChange, options, disabled }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: disabled ? T.muted : T.sub, marginBottom: 6 }}>{label}</label>
      <select
        value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}
        style={{
          width: "100%", padding: "10px 13px",
          background: disabled ? T.panel : T.surface,
          border: "1.5px solid " + T.border, borderRadius: 9,
          fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
          boxSizing: "border-box",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Three-dot portal menu ─────────────────────────────────────────────────────

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
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.right - 180 });
    const reposition = () => {
      if (!btnRef.current) return;
      const r2 = btnRef.current.getBoundingClientRect();
      setPos({ top: r2.bottom + 6, left: r2.right - 180 });
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [open]);

  function toggle(e) {
    e.stopPropagation();
    setOpen(o => !o);
  }
  function act(fn) { return e => { e.stopPropagation(); setOpen(false); fn(); }; }

  return (
    <>
      <button
        ref={btnRef} onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: "50%",
          background: open ? "#f1f5f9" : "transparent",
          border: "1px solid " + (open ? T.border : "transparent"),
          cursor: "pointer", color: T.muted, transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = T.border; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && createPortal(
        <div ref={menuRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          minWidth: 180, padding: "6px 0",
        }}>
          {[
            { icon: Pencil, label: "Edit Company",   fn: onEdit },
            null,
            { icon: Trash2, label: "Delete Company", fn: onDelete, danger: true },
          ].map((item, i) =>
            item === null
              ? <div key={i} style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              : (
                <button key={item.label} onClick={act(item.fn)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 16px",
                  background: "transparent", border: "none",
                  fontSize: 13, fontFamily: "inherit", textAlign: "left",
                  color: item.danger ? "#dc2626" : "#0f172a",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <item.icon size={14} style={{ opacity: item.danger ? 1 : 0.6 }} />
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

// ── Company modal (create / edit) ─────────────────────────────────────────────

const BLANK = {
  name: "", phone: "", website: "",
  address: "", city: "", zipcode: "", state: "", country: "",
  industry: "", plan: "starter", notes: "",
};

function CompanyModal({ mode, company, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    mode === "edit"
      ? {
          name:     company.name     || "",
          phone:    company.phone    || "",
          website:  company.website  || "",
          address:  company.address  || "",
          city:     company.city     || "",
          zipcode:  company.zipcode  || "",
          state:    company.state    || "",
          country:  company.country  || "",
          industry: company.industry || "",
          plan:     company.plan     || "starter",
          notes:    company.notes    || "",
        }
      : { ...BLANK }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };
  const previewId = mode === "create" ? genId(form.name) : null;

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit() {
    const e = {};
    if (!form.name.trim()) e.name = "Company name is required";
    if (mode === "create" && !genId(form.name)) e.name = "Name must contain letters or numbers";
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const saved = mode === "create"
        ? await createCompany(form)
        : await updateCompany(company.prophone_id, form);
      toast.success(mode === "create" ? "Company created." : "Company updated.");
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("already")) {
        setErrors({ name: "A company with a similar name already exists" });
      } else {
        toast.error("Failed to save company.");
      }
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", padding: 20 }}
    >
      <div style={{ background: T.surface, borderRadius: 16, width: "100%", maxWidth: 580, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", border: "1px solid " + T.border, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid " + T.border }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {mode === "create" ? "Create Company" : "Edit Company"}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {mode === "edit" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "monospace", color: T.accent, fontWeight: 600 }}>
                  <ShieldCheck size={12} />{company.prophone_id}
                </span>
              ) : "Fill in the details to create a new company workspace"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <style>{SPIN}</style>

          {/* Auto ID preview */}
          {mode === "create" && (
            <div style={{ marginBottom: 20, padding: "10px 14px", background: T.accentLow, border: "1px solid " + T.accent + "30", borderRadius: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Company ID — auto-generated
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: previewId ? T.accent : T.muted }}>
                {previewId || "Type a name to preview the ID…"}
              </div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>Derived from company name · cannot be changed later</div>
            </div>
          )}

          <Field label="Company Name" required value={form.name} onChange={set("name")} placeholder="Acme Towing & Recovery" error={errors.name} />

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}><Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" /></div>
            <div style={{ flex: 1 }}><Field label="Website" value={form.website} onChange={set("website")} placeholder="https://acmetowing.com" /></div>
          </div>

          <Field label="Street Address" value={form.address} onChange={set("address")} placeholder="2777 Giant Road, Suite 100" />

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 2 }}><Field label="City" value={form.city} onChange={set("city")} placeholder="Los Angeles" /></div>
            <div style={{ flex: 1 }}><Field label="ZIP Code" value={form.zipcode} onChange={set("zipcode")} placeholder="90001" /></div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}><Field label="State" value={form.state} onChange={set("state")} placeholder="CA" /></div>
            <div style={{ flex: 2 }}><Field label="Country" value={form.country} onChange={set("country")} placeholder="United States" /></div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}><Field label="Industry" value={form.industry} onChange={set("industry")} placeholder="Towing & Recovery" /></div>
            <div style={{ flex: 1 }}><SelField label="Plan" value={form.plan} onChange={set("plan")} options={PLAN_OPTIONS} /></div>
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.sub, marginBottom: 6 }}>Notes</label>
            <textarea
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Internal notes about this company…" rows={2}
              style={{ width: "100%", padding: "10px 13px", background: T.surface, border: "1.5px solid " + T.border, borderRadius: 9, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid " + T.border, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid " + T.border, borderRadius: 9, color: T.sub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = T.panel}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "9px 22px", background: saving ? T.border : T.accent, border: "none", borderRadius: 9, color: saving ? T.muted : "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, transition: "background 0.15s" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = T.accent; }}
          >
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? "Saving…" : mode === "create" ? "Create Company" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Super Admin: Company list ──────────────────────────────────────────

export function CompanyGroupsView() {
  const toast = useToast();
  const [companies,    setCompanies]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    listCompanies()
      .then(setCompanies)
      .catch(() => toast.error("Failed to load companies."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.prophone_id.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  const totalUsers = useMemo(() =>
    companies.reduce((sum, c) => sum + (c._count?.users || 0), 0),
  [companies]);

  function handleSaved(saved) {
    setCompanies(prev => {
      const idx = prev.findIndex(c => c.prophone_id === saved.prophone_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...saved }; return n; }
      return [saved, ...prev];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompany(deleteTarget.prophone_id);
      setCompanies(prev => prev.filter(c => c.prophone_id !== deleteTarget.prophone_id));
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete company.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>
      <style>{SPIN}</style>
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading companies…
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{SPIN}</style>

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title={`Delete "${deleteTarget.name}"`}
          itemName={deleteTarget.name}
          description={
            <>
              This will permanently remove <strong>{deleteTarget.name}</strong> and all its associated data.
              {(deleteTarget._count?.users || 0) > 0 && (
                <span style={{ display: "block", marginTop: 8, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "7px 12px", fontSize: 12 }}>
                  ⚠ This company has <strong>{deleteTarget._count.users} user{deleteTarget._count.users !== 1 ? "s" : ""}</strong> who will lose access immediately.
                </span>
              )}
            </>
          }
          confirmLabel="Delete Company"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      {/* ── Top bar ── */}
      <div style={{
        padding: "20px 28px", borderBottom: "1px solid " + T.border,
        background: T.surface, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.accentLow, border: "1px solid " + T.accent + "30",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Building2 size={22} color={T.accent} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: "-0.01em" }}>Companies</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              Create and manage companies
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, pointerEvents: "none" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search companies…"
              style={{ padding: "8px 12px 8px 32px", background: T.bg, border: "1px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", width: 220, boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: T.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
            onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
            onMouseLeave={e => e.currentTarget.style.background = T.accent}
          >
            <Plus size={15} /> Add Company
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div style={{ padding: "20px 28px", borderBottom: "1px solid " + T.border, background: T.bg, display: "flex", gap: 16, flexShrink: 0 }}>
        {[
          { label: "COMPANIES",   value: companies.length, icon: Building2, color: T.accent, sub: "Total registered"     },
          { label: "TOTAL USERS", value: totalUsers,       icon: Users,     color: T.green,  sub: "Across all companies" },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} style={{
            flex: 1, background: T.surface, border: "1px solid " + T.border,
            borderRadius: 12, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Company list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 32px" }}>
        <div style={{ fontSize: 12, color: T.muted, padding: "14px 0 10px" }}>
          Showing {filtered.length} of {companies.length} {companies.length === 1 ? "company" : "companies"}
        </div>

        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            border: "1px dashed " + T.border, borderRadius: 12, color: T.muted, fontSize: 13,
          }}>
            {companies.length === 0
              ? <><Building2 size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} /><div style={{ fontWeight: 600, marginBottom: 6 }}>No companies yet</div><div>Click &ldquo;Add Company&rdquo; to create the first workspace.</div></>
              : "No companies match your search."}
          </div>
        ) : filtered.map(c => {
          const pm = PLAN_META[c.plan] || PLAN_META.starter;
          const userCount = c._count?.users || 0;
          return (
            <div key={c.prophone_id}
              onClick={() => setModal({ mode: "edit", company: c })}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                background: T.surface,
                border: "1px solid " + T.border,
                borderLeft: "3px solid " + T.accent,
                borderRadius: 10, marginBottom: 8,
                transition: "box-shadow 0.15s, background 0.1s",
                cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.background = T.panel; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = T.surface; }}
            >
              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                background: T.accentLow,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Building2 size={18} color={T.accent} />
              </div>

              {/* Name + ID */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.name}</span>
                  <span style={{
                    fontFamily: "monospace", fontSize: 11, fontWeight: 600,
                    color: T.muted, background: T.panel,
                    border: "1px solid " + T.border, borderRadius: 5,
                    padding: "2px 8px",
                  }}>
                    {c.prophone_id}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: pm.bg, color: pm.color,
                    border: "1px solid " + pm.border,
                    borderRadius: 5, padding: "2px 7px",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {pm.label}
                  </span>
                </div>
                {(c.city || c.state) && (
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                    {[c.city, c.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>

              {/* User count */}
              <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Users</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{userCount}</div>
              </div>

              {/* 3-dot menu */}
              <RowMenu
                onEdit={()   => setModal({ mode: "edit", company: c })}
                onDelete={() => setDeleteTarget(c)}
              />
            </div>
          );
        })}
      </div>

      {modal && (
        <CompanyModal
          mode={modal.mode}
          company={modal.company}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const US_STATES = [
  { value: "", label: "Select State" },
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

const TIMEZONES = [
  { value: "", label: "Select Time Zone" },
  { value: "America/New_York",    label: "(GMT-05:00) Eastern Time (US & Canada)"  },
  { value: "America/Chicago",     label: "(GMT-06:00) Central Time (US & Canada)"  },
  { value: "America/Denver",      label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)"  },
  { value: "America/Anchorage",   label: "(GMT-09:00) Alaska"                      },
  { value: "Pacific/Honolulu",    label: "(GMT-10:00) Hawaii"                      },
  { value: "America/Phoenix",     label: "(GMT-07:00) Arizona"                     },
];

const COMMISSION_OPTIONS = [
  { value: "",            label: "Select Commission Type" },
  { value: "flat",        label: "Flat Rate"              },
  { value: "percentage",  label: "Percentage"             },
  { value: "per_call",    label: "Per Call"               },
  { value: "hourly",      label: "Hourly"                 },
];

// ── Regular user: My Company profile ─────────────────────────────────────────

const BLANK_PROFILE = {
  name: "", address: "", city: "", zipcode: "", state: "", timezone: "",
  country: "", email: "", phone: "", fax: "", website: "", industry: "",
  ca_number: "", usdot: "", enable_vehicle_locator: false, include_price: false,
  hostname: "", notes: "", commission_type: "", plan: "starter",
};

function MyCompanyView({ currentUser }) {
  const toast = useToast();
  const canEdit = ["admin", "super_admin"].includes(currentUser?.role);
  const [form,    setForm]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.prophone_id) { setLoading(false); return; }
    getCompany(currentUser.prophone_id)
      .then(d => setForm({
        name:                   d.name                   || "",
        address:                d.address                || "",
        city:                   d.city                   || "",
        zipcode:                d.zipcode                || "",
        state:                  d.state                  || "",
        timezone:               d.timezone               || "",
        country:                d.country                || "",
        email:                  d.email                  || "",
        phone:                  d.phone                  || "",
        fax:                    d.fax                    || "",
        website:                d.website                || "",
        industry:               d.industry               || "",
        ca_number:              d.ca_number              || "",
        usdot:                  d.usdot                  || "",
        enable_vehicle_locator: d.enable_vehicle_locator ?? false,
        include_price:          d.include_price          ?? false,
        hostname:               d.hostname               || "",
        notes:                  d.notes                  || "",
        commission_type:        d.commission_type        || "",
        plan:                   d.plan                   || "starter",
      }))
      .catch(() => toast.error("Failed to load company."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try { await updateCompany(currentUser.prophone_id, form); toast.success("Changes saved."); }
    catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>
      <style>{SPIN}</style>
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading…
    </div>
  );
  if (!form) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>
      No company assigned to your account.
    </div>
  );

  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const D = canEdit ? false : true; // disabled shorthand

  function FLabel({ children, required }) {
    return (
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: D ? T.muted : T.sub, marginBottom: 6 }}>
        {children}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
    );
  }

  function FInput({ value, onChange, placeholder, type = "text" }) {
    const [focus, setFocus] = useState(false);
    return (
      <input
        type={type} value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={D}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px",
          background: D ? T.panel : T.surface,
          border: "1.5px solid " + (focus && !D ? T.accent : T.border),
          borderRadius: 8, fontSize: 13, color: D ? T.muted : T.text,
          fontFamily: "inherit", outline: "none", transition: "border-color 0.15s",
        }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      />
    );
  }

  function FSelect({ value, onChange, options }) {
    return (
      <select
        value={value} onChange={e => onChange?.(e.target.value)} disabled={D}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px",
          background: D ? T.panel : T.surface,
          border: "1.5px solid " + T.border, borderRadius: 8,
          fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
          cursor: D ? "not-allowed" : "pointer",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  function FCheck({ checked, onChange, label }) {
    return (
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: D ? "not-allowed" : "pointer", fontSize: 13, color: T.sub }}>
        <input
          type="checkbox" checked={checked}
          onChange={e => !D && onChange?.(e.target.checked)}
          disabled={D}
          style={{ width: 16, height: 16, cursor: D ? "not-allowed" : "pointer", accentColor: T.accent }}
        />
        {label}
      </label>
    );
  }

  function FRow({ children }) {
    return <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>{children}</div>;
  }

  function FGroup({ label, required, children, mb = 18 }) {
    return (
      <div style={{ marginBottom: mb }}>
        <FLabel required={required}>{label}</FLabel>
        {children}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{SPIN}</style>

      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid " + T.border, background: T.surface, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>Company Profile</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: T.muted }}>
            Please fill out your company's basic information such as Name, Address etc.
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.accentLow, color: T.accent, border: "1px solid " + T.accent + "30", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
            <ShieldCheck size={11} />{currentUser.prophone_id}
          </span>
        </div>
        {!canEdit && (
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: 7, padding: "5px 12px", fontSize: 12 }}>
            View only — contact your admin to make changes
          </div>
        )}
      </div>

      {/* Two-column form body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, padding: "28px 32px 0" }}>

          {/* ── LEFT: Company Information ── */}
          <div style={{ paddingRight: 32, borderRight: "1px solid " + T.border, paddingBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid " + T.border }}>
              Company Information
            </div>

            <FGroup label="Company Name" required mb={18}>
              <FInput value={form.name} onChange={canEdit ? set("name") : undefined} placeholder="Acme Towing & Recovery" />
            </FGroup>

            <FGroup label="Address" mb={18}>
              <FInput value={form.address} onChange={canEdit ? set("address") : undefined} placeholder="2777 Giant Road" />
            </FGroup>

            <FRow>
              <div style={{ flex: 2 }}>
                <FGroup label="City" mb={0}>
                  <FInput value={form.city} onChange={canEdit ? set("city") : undefined} placeholder="Richmond" />
                </FGroup>
              </div>
              <div style={{ flex: 1 }}>
                <FGroup label="ZIP" mb={0}>
                  <FInput value={form.zipcode} onChange={canEdit ? set("zipcode") : undefined} placeholder="94806" />
                </FGroup>
              </div>
            </FRow>

            <FRow>
              <div style={{ flex: 1 }}>
                <FGroup label="State" mb={0}>
                  <FSelect value={form.state} onChange={canEdit ? set("state") : undefined} options={US_STATES} />
                </FGroup>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <FCheck
                  checked={form.state !== ""}
                  onChange={v => { if (!v) set("state")(""); }}
                  label="Auto Select State"
                />
              </div>
            </FRow>

            <FRow>
              <div style={{ flex: 1 }}>
                <FGroup label="Time Zone" mb={0}>
                  <FSelect value={form.timezone} onChange={canEdit ? set("timezone") : undefined} options={TIMEZONES} />
                </FGroup>
              </div>
              <div style={{ flex: 1 }}>
                <FGroup label="Country" mb={0}>
                  <FInput value={form.country} onChange={canEdit ? set("country") : undefined} placeholder="United States" />
                </FGroup>
              </div>
            </FRow>

            <FGroup label="Email" mb={18}>
              <FInput type="email" value={form.email} onChange={canEdit ? set("email") : undefined} placeholder="contact@acmetowing.com" />
            </FGroup>

            <FRow>
              <div style={{ flex: 1 }}>
                <FGroup label="Phone" mb={0}>
                  <FInput value={form.phone} onChange={canEdit ? set("phone") : undefined} placeholder="(510) 235-0874" />
                </FGroup>
              </div>
              <div style={{ flex: 1 }}>
                <FGroup label="Fax" mb={0}>
                  <FInput value={form.fax} onChange={canEdit ? set("fax") : undefined} placeholder="+1 (211) 922-1251" />
                </FGroup>
              </div>
            </FRow>
          </div>

          {/* ── RIGHT: License Information ── */}
          <div style={{ paddingLeft: 32, paddingBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid " + T.border }}>
              License Information
            </div>

            <FGroup label="CA Number" mb={18}>
              <FInput value={form.ca_number} onChange={canEdit ? set("ca_number") : undefined} placeholder="165455" />
            </FGroup>

            <FGroup label="USDOT" mb={18}>
              <FInput value={form.usdot} onChange={canEdit ? set("usdot") : undefined} placeholder="2669538" />
            </FGroup>

            {/* Vehicle Locator */}
            <div style={{ marginBottom: 18 }}>
              <FLabel>Vehicle Locator</FLabel>
              <div style={{ display: "flex", gap: 24, padding: "10px 14px", background: T.panel, borderRadius: 8, border: "1px solid " + T.border }}>
                <FCheck checked={form.enable_vehicle_locator} onChange={canEdit ? set("enable_vehicle_locator") : undefined} label="Enable Vehicle Locator" />
                <FCheck checked={form.include_price} onChange={canEdit ? set("include_price") : undefined} label="Include Price" />
              </div>
            </div>

            {/* Hostname */}
            <FGroup label="Hostname" mb={18}>
              <FInput value={form.hostname} onChange={canEdit ? set("hostname") : undefined} placeholder="ACME" />
            </FGroup>

            {/* Notes */}
            <div style={{ marginBottom: 18 }}>
              <FLabel>Notes</FLabel>
              <textarea
                value={form.notes}
                onChange={canEdit ? e => setForm(f => ({ ...f, notes: e.target.value })) : undefined}
                disabled={D}
                placeholder="Any additional information…"
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: D ? T.panel : T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: D ? T.muted : T.text, fontFamily: "inherit", outline: "none", resize: "vertical" }}
              />
            </div>

            {/* Commission Type */}
            <FGroup label="Commission Type" mb={18}>
              <FSelect value={form.commission_type} onChange={canEdit ? set("commission_type") : undefined} options={COMMISSION_OPTIONS} />
            </FGroup>
          </div>
        </div>
      </div>

      {/* Save button */}
      {canEdit && (
        <div style={{ padding: "16px 32px", borderTop: "1px solid " + T.border, background: T.surface, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 28px", background: saving ? T.border : T.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s", boxShadow: "0 2px 8px rgba(37,99,235,0.2)" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = T.accent; }}
          >
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function PageCompanies({ currentUser }) {
  const isSuperAdmin = currentUser?.role === "super_admin";
  return isSuperAdmin
    ? <CompanyGroupsView />
    : <MyCompanyView currentUser={currentUser} />;
}
