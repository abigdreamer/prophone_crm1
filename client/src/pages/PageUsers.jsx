import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, X, Loader2, ShieldCheck, Search } from "lucide-react";
import T from "../theme";
import { getUsers, createUser, updateUser, deleteUser } from "../api/auth.api";
import { listCompanies } from "../api/companies.api";
import { useToast } from "../hooks/useToast";

const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

const ROLE_META = {
  super_admin: { bg: "#fef3c7", color: "#92400e",  border: "#fcd34d",  label: "Super Admin" },
  admin:       { bg: "#eff6ff", color: "#2563eb",   border: "#bfdbfe",  label: "Admin"       },
  manager:     { bg: "#f0fdf4", color: "#166534",   border: "#86efac",  label: "Manager"     },
  accountant:  { bg: "#fdf4ff", color: "#7e22ce",   border: "#d8b4fe",  label: "Accountant"  },
  rep:         { bg: "#f1f5f9", color: "#64748b",   border: "#cbd5e1",  label: "Rep"         },
};

const ALL_ROLES = [
  { value: "rep",         label: "Rep"         },
  { value: "accountant",  label: "Accountant"  },
  { value: "manager",     label: "Manager"     },
  { value: "admin",       label: "Admin"       },
  { value: "super_admin", label: "Super Admin" },
];

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.rep;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, border: "1px solid " + m.border, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

// ── Shared form primitives ────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, onSubmit, submitLabel, submitting, children }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", padding: 20 }}
    >
      <div style={{ background: T.surface, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", border: "1px solid " + T.border, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 0" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = T.text} onMouseLeave={e => e.currentTarget.style.color = T.muted}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid " + T.border, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 16px", background: "transparent", border: "1px solid " + T.border, borderRadius: 8, color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = T.panel} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={submitting}
            style={{ padding: "9px 20px", background: submitting ? T.border : T.accent, border: "none", borderRadius: 8, color: submitting ? T.muted : "#fff", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, transition: "background 0.15s" }}
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", padding: "9px 12px", background: disabled ? T.panel : T.surface, border: "1.5px solid " + (error ? "#ef4444" : focus ? T.accent : T.border), borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Sel({ label, value, onChange, options, required, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", background: T.surface, border: "1.5px solid " + (error ? "#ef4444" : T.border), borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</div>}
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

  const set = key => val => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: undefined })); };

  const roleOptions = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r.value !== "super_admin");

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
    if (needsCompany && !form.prophone_id) e.prophone_id = "Company is required for this role";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, role: form.role, prophone_id: needsCompany ? form.prophone_id : null };
      if (mode === "create") { payload.email = form.email; payload.password = form.password; }
      else if (form.password) payload.password = form.password;

      const saved = mode === "create" ? await createUser(payload) : await updateUser(user.id, payload);
      toast.success(mode === "create" ? `${saved.name} created.` : "User updated.");
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err.message.includes("409") || err.message.includes("already")) setErrors({ email: "Email already exists" });
      else toast.error("Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Create User" : "Edit User"}
      subtitle={mode === "edit" ? user.email : "Add a new user to the system"}
      onClose={onClose} onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create User" : "Save Changes"}
      submitting={saving}
    >
      <style>{SPIN}</style>
      <Field label="Full Name" required value={form.name} onChange={set("name")} placeholder="Jane Smith" error={errors.name} />

      {mode === "create" && (
        <Field label="Email" required type="email" value={form.email} onChange={set("email")} placeholder="jane@company.io" error={errors.email} />
      )}

      <Field
        label={mode === "create" ? "Password" : "New Password"}
        required={mode === "create"} type="password"
        value={form.password} onChange={set("password")}
        placeholder={mode === "edit" ? "Leave blank to keep current" : "Min. 6 characters"}
        error={errors.password}
      />

      <Sel label="Role" required value={form.role} onChange={set("role")} options={roleOptions} />

      {needsCompany && (
        isSuperAdmin ? (
          <Sel label="Company" required value={form.prophone_id} onChange={set("prophone_id")} options={companyOptions} error={errors.prophone_id} />
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Company</label>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.accentLow, color: T.accent, border: "1px solid " + T.accent + "30", borderRadius: 7, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
              <ShieldCheck size={13} />{currentUser?.prophone_id}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>User will be added to your company</div>
          </div>
        )
      )}
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PageUsers({ currentUser, scopedCompany }) {
  const toast = useToast();
  const [users,     setUsers]     = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isAdmin      = ["admin", "super_admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super_admin";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsers(isSuperAdmin ? scopedCompany : undefined),
      isSuperAdmin ? listCompanies() : Promise.resolve([]),
    ])
      .then(([u, c]) => { setUsers(u); setCompanies(c); })
      .catch(() => toast.error("Failed to load data."))
      .finally(() => setLoading(false));
  }, [scopedCompany]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.prophone_id || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, search, roleFilter]);

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

  // Role counts for the filter pills
  const roleCounts = useMemo(() => {
    const counts = {};
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, [users]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{SPIN}</style>

      {/* ── Page header ── */}
      <div style={{ padding: "24px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Users</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
              {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal({ mode: "create" })}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: T.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
              onMouseLeave={e => e.currentTarget.style.background = T.accent}
            >
              <Plus size={15} /> New User
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 32px", background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none" }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Role filter */}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: "8px 12px", background: T.surface, border: "1px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}{roleCounts[r.value] ? ` (${roleCounts[r.value]})` : ""}</option>
            ))}
          </select>

        </div>

        {/* Role summary pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {ALL_ROLES.filter(r => roleCounts[r.value]).map(r => {
            const m = ROLE_META[r.value] || ROLE_META.rep;
            const active = roleFilter === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setRoleFilter(active ? "all" : r.value)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: active ? m.color : m.bg, border: "1px solid " + (active ? m.color : m.border), borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: active ? "#fff" : m.color, transition: "all 0.1s" }}
              >
                {r.label} <span style={{ opacity: 0.7 }}>{roleCounts[r.value]}</span>
              </button>
            );
          })}
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.2fr 110px", gap: 12, padding: "6px 18px", borderBottom: "1px solid " + T.border }}>
          {["User", "Email", "Role", "Company", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
          ))}
        </div>
      </div>

      {/* ── User list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontSize: 13 }}>
            {users.length === 0 ? "No users found." : "No users match your filters."}
          </div>
        ) : (
          filtered.map(u => {
            const isSelf   = u.id === currentUser?.id;
            const initials = u.avatar || (u.name ? u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?");
            return (
              <div key={u.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.2fr 110px", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: "1px solid " + T.border, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.panel}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: (u.color || T.accent) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: u.color || T.accent, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text, lineHeight: 1.2 }}>
                      {u.name} {isSelf && <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>you</span>}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>

                {/* Role */}
                <div><RoleBadge role={u.role} /></div>

                {/* Company */}
                <div style={{ fontSize: 12, color: T.muted, fontFamily: u.prophone_id ? "monospace" : "inherit" }}>
                  {u.prophone_id || <span style={{ color: T.border }}>—</span>}
                </div>

                {/* Actions */}
                {isAdmin && !isSelf ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setModal({ mode: "edit", user: u })}
                      style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      style={{ background: "transparent", border: "1px solid " + T.border, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.muted, fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : <div />}
              </div>
            );
          })
        )}
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
