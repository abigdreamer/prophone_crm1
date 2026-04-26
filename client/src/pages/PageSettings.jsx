import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users, Building2, Save, Loader2, Plus, Trash2,
  ShieldCheck, Pencil, X, Check,
} from "lucide-react";
import T from "../theme";
import {
  getCompany, updateCompany, listCompanies,
  createCompany, deleteCompany,
} from "../api/companies.api";
import { getUsers, createUser, updateUser, deleteUser } from "../api/auth.api";
import { useToast } from "../hooks/useToast";
import { CompanyGroupsView } from "./PageCompanies";

// ── Shared primitives ─────────────────────────────────────────────────────────

const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

function Modal({ title, subtitle, onClose, onSubmit, submitLabel, submitting, children, wide }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", padding: 20,
      }}
    >
      <div style={{
        background: T.surface, borderRadius: 16, width: "100%",
        maxWidth: wide ? 620 : 480,
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        border: "1px solid " + T.border,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 0" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, marginTop: -2, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = T.text}
            onMouseLeave={e => e.currentTarget.style.color = T.muted}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid " + T.border,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 16px", background: "transparent", border: "1px solid " + T.border, borderRadius: 8, color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = T.panel}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              padding: "9px 20px", background: submitting ? T.border : T.accent,
              border: "none", borderRadius: 8, color: submitting ? T.muted : "#fff",
              fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = T.accent; }}
          >
            {submitting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, value, onChange, placeholder, type = "text", disabled, error, required, hint }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 12px",
          background: disabled ? T.panel : T.surface,
          border: "1.5px solid " + (error ? "#ef4444" : focus ? T.accent : T.border),
          borderRadius: 8, fontSize: 13, color: T.text,
          fontFamily: "inherit", outline: "none",
          transition: "border-color 0.15s", boxSizing: "border-box",
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled, error, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 12px",
          background: disabled ? T.panel : T.surface,
          border: "1.5px solid " + (error ? "#ef4444" : T.border),
          borderRadius: 8, fontSize: 13, color: value ? T.text : T.muted,
          fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "default",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const ROLE_COLORS = {
  super_admin: { bg: "#fef3c7", color: "#92400e",  border: "#fcd34d" },
  admin:       { bg: T.accentLow, color: T.accent, border: T.accent + "40" },
  manager:     { bg: "#f0fdf4", color: "#166534",  border: "#86efac" },
  accountant:  { bg: "#fdf4ff", color: "#7e22ce",  border: "#d8b4fe" },
  rep:         { bg: T.panel,   color: T.muted,    border: T.border },
};

const PLAN_COLORS = {
  starter:    { bg: T.panel,    color: T.muted,   border: T.border },
  pro:        { bg: T.accentLow, color: T.accent, border: T.accent + "40" },
  enterprise: { bg: "#fef3c7",  color: "#92400e", border: "#fcd34d" },
};

const ROLE_OPTIONS = [
  { value: "rep",         label: "Rep"         },
  { value: "accountant",  label: "Accountant"  },
  { value: "manager",     label: "Manager"     },
  { value: "admin",       label: "Admin"       },
];

const PLAN_OPTIONS = [
  { value: "starter",    label: "Starter"    },
  { value: "pro",        label: "Pro"        },
  { value: "enterprise", label: "Enterprise" },
];

function RoleBadge({ role }) {
  const rc = ROLE_COLORS[role] || ROLE_COLORS.rep;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.color, border: "1px solid " + rc.border, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
    </span>
  );
}

function ReadonlyBadge({ label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.accentLow, color: T.accent, border: "1px solid " + T.accent + "30", borderRadius: 7, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
      <ShieldCheck size={13} />{label}
    </div>
  );
}

// ── Company Modal ─────────────────────────────────────────────────────────────

const BLANK_COMPANY = { prophone_id: "", name: "", website: "", phone: "", city: "", address: "", industry: "", plan: "starter", notes: "" };

function CompanyModal({ mode, company, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    mode === "edit"
      ? { prophone_id: company.prophone_id, name: company.name || "", website: company.website || "", phone: company.phone || "", city: company.city || "", address: company.address || "", industry: company.industry || "", plan: company.plan || "starter", notes: company.notes || "" }
      : { ...BLANK_COMPANY }
  );
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  const set = key => val => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  function validate() {
    const e = {};
    if (mode === "create") {
      if (!form.prophone_id.trim()) e.prophone_id = "Company ID is required";
      else if (!/^[a-z0-9-]+$/.test(form.prophone_id)) e.prophone_id = "Lowercase letters, numbers, and hyphens only";
    }
    if (!form.name.trim()) e.name = "Company name is required";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createCompany(form);
        toast.success("Company created.");
        onSaved(created);
      } else {
        const { prophone_id, ...data } = form;
        const updated = await updateCompany(prophone_id, data);
        toast.success("Company updated.");
        onSaved(updated);
      }
      onClose();
    } catch (err) {
      if (err.message.includes("409") || err.message.includes("already")) {
        setErrors({ prophone_id: "This Company ID is already taken" });
      } else {
        toast.error("Failed to save company.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Create Company" : "Edit Company"}
      subtitle={mode === "edit" ? form.prophone_id : "Set up a new tenant workspace"}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create Company" : "Save Changes"}
      submitting={saving}
      wide
    >
      <style>{SPIN}</style>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>

        {/* Company ID — editable on create, read-only on edit */}
        {mode === "create" ? (
          <Field
            label="Company ID" required
            value={form.prophone_id}
            onChange={v => set("prophone_id")(v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="acme-towing"
            error={errors.prophone_id}
            hint="Unique slug · cannot be changed later"
          />
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Company ID</label>
            <ReadonlyBadge label={form.prophone_id} />
          </div>
        )}

        <SelectField label="Plan" value={form.plan} onChange={set("plan")} options={PLAN_OPTIONS} />

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Company Name" required value={form.name} onChange={set("name")} placeholder="Acme Towing" error={errors.name} />
        </div>

        <Field label="Phone"    value={form.phone}    onChange={set("phone")}    placeholder="+1 555 000 0000" />
        <Field label="Website"  value={form.website}  onChange={set("website")}  placeholder="https://example.com" />
        <Field label="City"     value={form.city}     onChange={set("city")}     placeholder="Dallas, TX" />
        <Field label="Industry" value={form.industry} onChange={set("industry")} placeholder="Towing & Recovery" />

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Address" value={form.address} onChange={set("address")} placeholder="123 Main St, Suite 100" />
        </div>

        <div style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Internal notes…"
            rows={2}
            style={{ width: "100%", padding: "9px 12px", background: T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>
    </Modal>
  );
}

// ── ManageCompany ─────────────────────────────────────────────────────────────

function ManageCompany({ currentUser }) {
  const toast = useToast();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin      = ["admin", "super_admin"].includes(currentUser?.role);

  // Super admin state
  const [companies,   setCompanies]   = useState([]);
  const [modal,       setModal]       = useState(null);

  // Admin state — their own company form
  const [form,   setForm]   = useState(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) {
      listCompanies()
        .then(rows => setCompanies(rows))
        .catch(() => toast.error("Failed to load companies."))
        .finally(() => setLoading(false));
    } else {
      if (!currentUser?.prophone_id) { setLoading(false); return; }
      getCompany(currentUser.prophone_id)
        .then(d => setForm({
          name: d.name || "", website: d.website || "", city: d.city || "",
          address: d.address || "", phone: d.phone || "", email: d.email || "",
          fax: d.fax || "", zipcode: d.zipcode || "", state: d.state || "",
          country: d.country || "", timezone: d.timezone || "",
          industry: d.industry || "", notes: d.notes || "",
        }))
        .catch(() => toast.error("Failed to load company."))
        .finally(() => setLoading(false));
    }
  }, []);

  async function handleAdminSave() {
    setSaving(true);
    try {
      await updateCompany(currentUser.prophone_id, form);
      toast.success("Company saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone and will affect all associated data.`)) return;
    try {
      await deleteCompany(c.prophone_id);
      setCompanies(prev => prev.filter(x => x.prophone_id !== c.prophone_id));
      toast.success(`${c.name} deleted.`);
    } catch { toast.error("Failed to delete company."); }
  }

  function handleSaved(saved) {
    setCompanies(prev => {
      const idx = prev.findIndex(c => c.prophone_id === saved.prophone_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...saved }; return n; }
      return [saved, ...prev];
    });
    setModal(null);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: T.muted, fontSize: 13 }}>
      <style>{SPIN}</style>
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading…
    </div>
  );

  // ── Admin: full-page two-column company form ──
  if (!isSuperAdmin) {
    if (!form) return null;
    const D = !isAdmin;
    const set = k => v => setForm(f => ({ ...f, [k]: v }));

    const US_STATES = [
      { value: "", label: "Select State" },
      ...[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]].map(([v,l]) => ({ value: v, label: l }))
    ];
    const TIMEZONES = [
      { value: "", label: "Select Time Zone" },
      { value: "America/New_York",    label: "(GMT-05:00) Eastern Time"  },
      { value: "America/Chicago",     label: "(GMT-06:00) Central Time"  },
      { value: "America/Denver",      label: "(GMT-07:00) Mountain Time" },
      { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time"  },
      { value: "America/Anchorage",   label: "(GMT-09:00) Alaska"        },
      { value: "Pacific/Honolulu",    label: "(GMT-10:00) Hawaii"        },
      { value: "America/Phoenix",     label: "(GMT-07:00) Arizona"       },
    ];

    function FLabel({ children, required }) {
      return (
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
          {children}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
        </label>
      );
    }

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <style>{SPIN}</style>

        {/* Header */}
        <div style={{ padding: "20px 32px", borderBottom: "1px solid " + T.border, background: T.surface, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 4 }}>Company Profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: T.muted }}>Manage your company's information and contact details.</div>
            <ReadonlyBadge label={currentUser.prophone_id} />
          </div>
          {!isAdmin && (
            <div style={{ marginTop: 10, display: "inline-flex", gap: 6, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: 7, padding: "5px 12px", fontSize: 12 }}>
              View only — contact your admin to make changes
            </div>
          )}
        </div>

        {/* Two-column form */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, padding: "28px 32px 0" }}>

            {/* Left — Company Information */}
            <div style={{ paddingRight: 32, borderRight: "1px solid " + T.border, paddingBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid " + T.border }}>
                Company Information
              </div>

              <div style={{ marginBottom: 14 }}>
                <FLabel required>Company Name</FLabel>
                <Field label="" value={form.name} onChange={set("name")} placeholder="Acme Corp" disabled={D} />
              </div>

              <Field label="Address" value={form.address} onChange={set("address")} placeholder="123 Main St, Suite 100" disabled={D} />

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <Field label="City" value={form.city} onChange={set("city")} placeholder="Los Angeles" disabled={D} />
                <Field label="ZIP" value={form.zipcode} onChange={set("zipcode")} placeholder="90001" disabled={D} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <FLabel>State</FLabel>
                  <select value={form.state} onChange={e => !D && set("state")(e.target.value)} disabled={D}
                    style={{ width: "100%", padding: "9px 12px", background: D ? T.panel : T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box", cursor: D ? "not-allowed" : "pointer" }}>
                    {US_STATES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Field label="Country" value={form.country} onChange={set("country")} placeholder="United States" disabled={D} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FLabel>Time Zone</FLabel>
                <select value={form.timezone} onChange={e => !D && set("timezone")(e.target.value)} disabled={D}
                  style={{ width: "100%", padding: "9px 12px", background: D ? T.panel : T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box", cursor: D ? "not-allowed" : "pointer" }}>
                  {TIMEZONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <Field label="Email" value={form.email} onChange={set("email")} placeholder="info@company.com" disabled={D} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" disabled={D} />
                <Field label="Fax"   value={form.fax}   onChange={set("fax")}   placeholder="+1 555 000 0001" disabled={D} />
              </div>
            </div>

            {/* Right — Additional Details */}
            <div style={{ paddingLeft: 32, paddingBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid " + T.border }}>
                Additional Details
              </div>

              <Field label="Website"  value={form.website}  onChange={set("website")}  placeholder="https://yourcompany.com" disabled={D} />
              <Field label="Industry" value={form.industry} onChange={set("industry")} placeholder="e.g. Technology, Retail, Logistics…" disabled={D} />

              <div style={{ marginBottom: 14 }}>
                <FLabel>Notes</FLabel>
                <textarea value={form.notes} onChange={e => !D && setForm(f => ({ ...f, notes: e.target.value }))} disabled={D} placeholder="Any additional information…" rows={6}
                  style={{ width: "100%", padding: "9px 12px", background: D ? T.panel : T.surface, border: "1.5px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save bar */}
        {isAdmin && (
          <div style={{ padding: "16px 32px", borderTop: "1px solid " + T.border, background: T.surface, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleAdminSave} disabled={saving}
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

  // ── Super admin: full company list with CRUD ──
  return (
    <div style={{ padding: 32 }}>
      <style>{SPIN}</style>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={() => setModal({ mode: "create" })}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background = T.accent}
        >
          <Plus size={14} /> Create Company
        </button>
      </div>

      {companies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontSize: 13 }}>
          No companies yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {companies.map(c => {
            const pc = PLAN_COLORS[c.plan] || PLAN_COLORS.starter;
            return (
              <div key={c.prophone_id} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentLow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={18} color={T.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.color, border: "1px solid " + pc.border, borderRadius: 5, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.plan}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {c.prophone_id}
                    {c._count && ` · ${c._count.users} user${c._count.users !== 1 ? "s" : ""} · ${c._count.contacts} contacts`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setModal({ mode: "edit", company: c })}
                    style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

// ── User Modal ────────────────────────────────────────────────────────────────

function UserModal({ mode, user, companies, currentUser, onClose, onSaved }) {
  const toast = useToast();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [form, setForm] = useState(
    mode === "edit"
      ? { name: user.name || "", role: user.role || "rep", password: "", prophone_id: user.prophone_id || "" }
      : { name: "", email: "", password: "", role: "rep", prophone_id: isSuperAdmin ? "" : (currentUser?.prophone_id || "") }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = key => val => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const roleOptions = [
    ...ROLE_OPTIONS,
    ...(isSuperAdmin ? [{ value: "super_admin", label: "Super Admin" }] : []),
  ];

  const companyOptions = [
    { value: "", label: "— Select a company —" },
    ...companies.map(c => ({ value: c.prophone_id, label: `${c.name} (${c.prophone_id})` })),
  ];

  const needsCompany = form.role !== "super_admin";

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (mode === "create") {
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password.trim()) e.password = "Password is required";
      else if (form.password.length < 6) e.password = "At least 6 characters";
    }
    if (needsCompany && !form.prophone_id) {
      e.prophone_id = "Company is required for this role";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        name:        form.name,
        role:        form.role,
        prophone_id: needsCompany ? form.prophone_id : null,
      };
      if (mode === "create") {
        payload.email    = form.email;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const saved = mode === "create"
        ? await createUser(payload)
        : await updateUser(user.id, payload);

      toast.success(mode === "create" ? `${saved.name} created.` : "User updated.");
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err.message.includes("409") || err.message.includes("already")) {
        setErrors({ email: "Email already exists" });
      } else {
        toast.error("Failed to save user.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Create User" : "Edit User"}
      subtitle={mode === "edit" ? user.email : "Add a new user to the system"}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create User" : "Save Changes"}
      submitting={saving}
    >
      <style>{SPIN}</style>

      <Field
        label="Full Name" required
        value={form.name} onChange={set("name")}
        placeholder="Jane Smith" error={errors.name}
      />

      {mode === "create" && (
        <Field
          label="Email" required type="email"
          value={form.email} onChange={set("email")}
          placeholder="jane@company.io" error={errors.email}
        />
      )}

      <Field
        label={mode === "create" ? "Password" : "New Password"}
        required={mode === "create"} type="password"
        value={form.password} onChange={set("password")}
        placeholder={mode === "edit" ? "Leave blank to keep current" : "Min. 6 characters"}
        error={errors.password}
      />

      <SelectField
        label="Role" required
        value={form.role} onChange={set("role")}
        options={roleOptions}
      />

      {/* Company assignment */}
      {needsCompany && (
        isSuperAdmin ? (
          <SelectField
            label="Company" required
            value={form.prophone_id} onChange={set("prophone_id")}
            options={companyOptions}
            error={errors.prophone_id}
          />
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              Company
            </label>
            <ReadonlyBadge label={currentUser?.prophone_id} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>User will be added to your company</div>
          </div>
        )
      )}
    </Modal>
  );
}

// ── ManageUsers ───────────────────────────────────────────────────────────────

function ManageUsers({ currentUser }) {
  const toast = useToast();
  const [users,     setUsers]     = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);

  const isAdmin      = ["admin", "super_admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super_admin";

  useEffect(() => {
    Promise.all([
      getUsers(),
      isSuperAdmin ? listCompanies() : Promise.resolve([]),
    ])
      .then(([u, c]) => { setUsers(u); setCompanies(c); })
      .catch(() => toast.error("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(saved) {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
  }

  async function handleDelete(u) {
    if (!window.confirm(`Remove ${u.name}?`)) return;
    try {
      await deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`${u.name} removed.`);
    } catch { toast.error("Failed to remove user."); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: T.muted, fontSize: 13 }}>
      <style>{SPIN}</style>
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Loading users…
    </div>
  );

  return (
    <div style={{ maxWidth: 700, padding: 32 }}>
      <style>{SPIN}</style>

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
            onMouseLeave={e => e.currentTarget.style.background = T.accent}
          >
            <Plus size={14} /> Create User
          </button>
        </div>
      )}

      {/* User cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map(u => {
          const isSelf   = u.id === currentUser?.id;
          const initials = u.avatar || (u.name ? u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?");
          return (
            <div key={u.id} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: (u.color || T.accent) + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: u.color || T.accent, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{u.name}</span>
                  {isSelf && <span style={{ fontSize: 10, color: T.muted }}>you</span>}
                  <RoleBadge role={u.role} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {u.email}{u.prophone_id ? ` · ${u.prophone_id}` : ""}
                </div>
              </div>
              {isAdmin && !isSelf && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setModal({ mode: "edit", user: u })}
                    style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          companies={companies}
          currentUser={currentUser}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "manage-company", label: "Companies", icon: Building2 },
  { id: "manage-users",   label: "Users",          icon: Users     },
];

export default function PageSettings({ currentUser }) {
  const [active, setActive] = useState("manage-company");
  const isSuperAdmin = currentUser?.role === "super_admin";

  const visibleSections = SECTIONS.filter(s => !s.superAdminOnly || isSuperAdmin);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Sub-sidebar */}
      <div style={{ width: 210, flexShrink: 0, background: T.surface, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", paddingTop: 16 }}>
        <div style={{ padding: "0 14px 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Settings
        </div>
        {visibleSections.map(s => {
          const Icon = s.icon;
          const sel  = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "10px 14px",
                background: sel ? T.accentLow : "transparent",
                borderLeft: sel ? "3px solid " + T.accent : "3px solid transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                color: sel ? T.accent : T.sub,
                fontSize: 13, fontWeight: sel ? 600 : 400,
                textAlign: "left", transition: "all 0.1s",
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = T.panel; e.currentTarget.style.color = T.text; } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.sub; } }}
            >
              <Icon size={15} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: T.bg, overflow: "hidden" }}>
        {active === "manage-company" && (
          isSuperAdmin
            ? <CompanyGroupsView />
            : <ManageCompany currentUser={currentUser} />
        )}
        {active === "manage-users" && <ManageUsers currentUser={currentUser} />}
      </div>
    </div>
  );
}
