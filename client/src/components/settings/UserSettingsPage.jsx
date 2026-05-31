import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAppToast } from "../../context/ToastContext";
import { usePool } from "../../context/PoolContext";
import * as db from "../../services/api";
import {
  UserPlus, Pencil, Trash2, KeyRound, Shield, User, Building2,
  ToggleLeft, ToggleRight, Eye, EyeOff, Search, X, RefreshCw,
} from "lucide-react";

const SYSTEM_ROLES = ["Admin", "Manager", "Rep", "Staff"];
const PORTAL_ROLES = ["viewer", "admin"];
const COLORS = ["#6366f1", "#38bdf8", "#fb923c", "#4ade80", "#f43f5e", "#fbbf24", "#c084fc", "#2dd4bf"];

// ── Small shared UI ───────────────────────────────────────────────────────────

function Avatar({ name, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: (color || "#6366f1") + "22",
      border: `1.5px solid ${color || "#6366f1"}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, color: color || "#6366f1",
    }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    Admin: "#6366f1", Manager: "#3b82f6", Rep: "#10b981", Staff: "#f59e0b",
    viewer: "#6b7280", admin: "#6366f1",
  };
  const c = colors[role] || "#6b7280";
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: c + "18", color: c, border: `1px solid ${c}30`,
      textTransform: "capitalize", letterSpacing: "0.04em",
    }}>{role}</span>
  );
}

function FieldRow({ label, children }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  const T = useTheme();
  const accent = "#6366f1";
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "8px 11px", boxSizing: "border-box",
        background: disabled ? T.border + "40" : T.bg,
        border: `1px solid ${T.border}`, borderRadius: 7,
        color: disabled ? T.muted : T.text, fontSize: 12,
        outline: "none", fontFamily: "inherit", cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={e => { if (!disabled) e.target.style.borderColor = accent; }}
      onBlur={e => { e.target.style.borderColor = T.border; }}
    />
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const T = useTheme();
  const accent = "#6366f1";
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "••••••••"}
        style={{
          width: "100%", padding: "8px 34px 8px 11px", boxSizing: "border-box",
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7,
          color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
        }}
        onFocus={e => { e.target.style.borderColor = accent; }}
        onBlur={e => { e.target.style.borderColor = T.border; }}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{
        position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", padding: 0,
      }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function Sel({ value, onChange, options }) {
  const T = useTheme();
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "8px 11px", boxSizing: "border-box",
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7,
        color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── System User Form (create / edit) ──────────────────────────────────────────

function SystemUserForm({ user, onSave, onClose }) {
  const T = useTheme();
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name  || "",
    email:    user?.email || "",
    password: "",
    role:     user?.role  || "Rep",
    color:    user?.color || COLORS[0],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setErr("Name and email are required."); return; }
    if (!isEdit && !form.password) { setErr("Password is required for new users."); return; }
    setSaving(true); setErr("");
    try {
      await onSave(form);
    } catch (e) { setErr(e.message || "Failed to save."); setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: T.surface, borderRadius: 14, width: "100%", maxWidth: 460,
        border: `1px solid ${T.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{isEdit ? "Edit System User" : "Add System User"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2, display: "flex" }}><X size={16} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label="Full Name *"><Input value={form.name} onChange={v => set("name", v)} placeholder="John Smith" /></FieldRow>
            <FieldRow label="Email *"><Input value={form.email} onChange={v => set("email", v)} placeholder="john@company.com" type="email" /></FieldRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label={isEdit ? "New Password (leave blank to keep)" : "Password *"}>
              <PasswordInput value={form.password} onChange={v => set("password", v)} placeholder={isEdit ? "Leave blank to keep" : "••••••••"} />
            </FieldRow>
            <FieldRow label="Role">
              <Sel value={form.role} onChange={v => set("role", v)} options={SYSTEM_ROLES.map(r => ({ value: r, label: r }))} />
            </FieldRow>
          </div>
          <FieldRow label="Brand Color">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set("color", c)} style={{
                  width: 26, height: 26, borderRadius: 6, background: c, cursor: "pointer", padding: 0,
                  border: `2px solid ${form.color === c ? T.text : "transparent"}`,
                  boxShadow: form.color === c ? `0 0 0 3px ${c}40` : "none",
                }} />
              ))}
              <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
                style={{ width: 26, height: 26, padding: 2, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer" }} />
            </div>
          </FieldRow>

          {err && <div style={{ padding: "8px 11px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 12 }}>{err}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 4 }}>
            <button onClick={onClose} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Portal User Form (create) ─────────────────────────────────────────────────

function PortalUserForm({ clientId, clientName, onSave, onClose }) {
  const T = useTheme();
  const [form, setForm] = useState({ name: "", username: "", password: "", email: "", role: "viewer" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name || !form.username || !form.password) { setErr("Name, username, and password are required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, clientId });
    } catch (e) { setErr(e.message || "Failed to save."); setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: T.surface, borderRadius: 14, width: "100%", maxWidth: 460,
        border: `1px solid ${T.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Add Portal User</div>
            {clientName && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>for {clientName}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2, display: "flex" }}><X size={16} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label="Full Name *"><Input value={form.name} onChange={v => set("name", v)} placeholder="Jane Doe" /></FieldRow>
            <FieldRow label="Username *"><Input value={form.username} onChange={v => set("username", v.toLowerCase().replace(/\s/g, "_"))} placeholder="jane_doe" /></FieldRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label="Password *"><PasswordInput value={form.password} onChange={v => set("password", v)} /></FieldRow>
            <FieldRow label="Email (optional)"><Input value={form.email} onChange={v => set("email", v)} placeholder="jane@client.com" type="email" /></FieldRow>
          </div>
          <FieldRow label="Portal Role">
            <Sel value={form.role} onChange={v => set("role", v)} options={[{ value: "viewer", label: "Viewer (read-only)" }, { value: "admin", label: "Admin" }]} />
          </FieldRow>

          {err && <div style={{ padding: "8px 11px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 12 }}>{err}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 4 }}>
            <button onClick={onClose} disabled={saving} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Creating…" : "Create Portal User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────────

function ResetPasswordModal({ userName, onSave, onClose }) {
  const T = useTheme();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!password || password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setSaving(true); setErr("");
    try { await onSave(password); }
    catch (e) { setErr(e.message || "Failed."); setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "100%", maxWidth: 360, border: `1px solid ${T.border}`, padding: "22px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Reset Password</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Set a new password for <strong style={{ color: T.text }}>{userName}</strong></div>
        <PasswordInput value={password} onChange={setPassword} placeholder="New password (min. 6 chars)" />
        {err && <div style={{ marginTop: 8, color: "#f87171", fontSize: 11 }}>{err}</div>}
        <div style={{ display: "flex", gap: 9, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── System Users Tab ──────────────────────────────────────────────────────────

function SystemUsersTab({ currentUserId }) {
  const T = useTheme();
  const toast = useAppToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | { type: 'create' | 'edit' | 'reset', user? }

  useEffect(() => {
    db.getUsers()
      .then(setUsers)
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(form) {
    const created = await db.createSystemUser(form);
    setUsers(u => [...u, created].sort((a, b) => a.name.localeCompare(b.name)));
    setModal(null);
    toast.success("System user created.");
  }

  async function handleEdit(form) {
    const updated = await db.updateSystemUser(modal.user.id, form);
    setUsers(u => u.map(x => x.id === updated.id ? updated : x));
    setModal(null);
    toast.success("User updated.");
  }

  async function handleDelete(user) {
    if (user.id === currentUserId) { toast.error("You cannot delete your own account."); return; }
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    await db.deleteSystemUser(user.id);
    setUsers(u => u.filter(x => x.id !== user.id));
    toast.success("User deleted.");
  }

  async function handleResetPassword(password) {
    await db.updateSystemUser(modal.user.id, { password });
    setModal(null);
    toast.success("Password reset.");
  }

  return (
    <div>
      {modal?.type === "create" && <SystemUserForm onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === "edit"   && <SystemUserForm user={modal.user} onSave={handleEdit} onClose={() => setModal(null)} />}
      {modal?.type === "reset"  && <ResetPasswordModal userName={modal.user.name} onSave={handleResetPassword} onClose={() => setModal(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>System Users</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Internal ProPhone staff accounts</div>
        </div>
        <button
          onClick={() => setModal({ type: "create" })}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <UserPlus size={13} /> Add User
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={13} color={T.muted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            width: "100%", padding: "8px 30px 8px 30px", boxSizing: "border-box",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
            color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", padding: "9px 16px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          {["User", "Email", "Role", "Joined", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "24px 16px", color: T.muted, fontSize: 12 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px 16px", color: T.muted, fontSize: 12, textAlign: "center" }}>
            {search ? "No users match your search." : "No system users yet."}
          </div>
        ) : filtered.map((u, i) => (
          <div key={u.id} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
            alignItems: "center", padding: "11px 16px",
            borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
            background: u.id === currentUserId ? "#6366f108" : "transparent",
          }}>
            {/* Name + avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={u.name} color={u.color} size={30} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                  {u.name}
                  {u.id === currentUserId && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#6366f118", color: "#6366f1" }}>YOU</span>}
                </div>
              </div>
            </div>
            {/* Email */}
            <div style={{ fontSize: 12, color: T.muted }}>{u.email}</div>
            {/* Role */}
            <RoleBadge role={u.role} />
            {/* Joined */}
            <div style={{ fontSize: 11, color: T.muted }}>{new Date(u.createdAt).toLocaleDateString()}</div>
            {/* Actions */}
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setModal({ type: "reset", user: u })}
                title="Reset password"
                style={{ padding: "4px 7px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "#f59e0b44"; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
              >
                <KeyRound size={11} />
              </button>
              <button
                onClick={() => setModal({ type: "edit", user: u })}
                title="Edit user"
                style={{ padding: "4px 7px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#6366f1"; e.currentTarget.style.borderColor = "#6366f144"; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={() => handleDelete(u)}
                title="Delete user"
                style={{ padding: "4px 7px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, cursor: u.id === currentUserId ? "not-allowed" : "pointer", color: T.muted, display: "flex", alignItems: "center", opacity: u.id === currentUserId ? 0.3 : 1 }}
                onMouseEnter={e => { if (u.id !== currentUserId) { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#f8717144"; } }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ── Client Portal Users Tab ───────────────────────────────────────────────────

function ClientPortalUsersTab() {
  const T = useTheme();
  const toast = useAppToast();
  const { clientId: activeClientId } = usePool();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [resetModal, setResetModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([db.getAllPortalUsers(), db.getClients()]);
      setUsers(u || []);
      setClients((c || []).filter(cl => !cl.isCanceled));
    } catch { toast.error("Failed to load portal users."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchClient = filterClient === "all" || u.clientId === filterClient;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    return matchClient && matchSearch;
  });

  async function handleCreate(form) {
    const created = await db.createClientPortalUser(activeClientId, form);
    const client = clients.find(c => c.id === activeClientId);
    setUsers(u => [...u, { ...created, client }]);
    setShowCreate(false);
    toast.success("Portal user created.");
  }

  async function handleToggleActive(user) {
    try {
      const updated = await db.updateClientPortalUser(user.clientId, user.id, { isActive: !user.isActive });
      setUsers(u => u.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    } catch { toast.error("Failed to update."); }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove portal access for ${user.name}?`)) return;
    await db.deleteClientPortalUser(user.clientId, user.id);
    setUsers(u => u.filter(x => x.id !== user.id));
    toast.success("Portal user removed.");
  }

  async function handleResetPassword(password) {
    await db.updateClientPortalUser(resetModal.clientId, resetModal.id, { password });
    setResetModal(null);
    toast.success("Password reset.");
  }

  return (
    <div>
      {showCreate && (
        <PortalUserForm
          clientId={activeClientId}
          clientName={clients.find(c => c.id === activeClientId)?.name}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {resetModal && (
        <ResetPasswordModal userName={resetModal.name} onSave={handleResetPassword} onClose={() => setResetModal(null)} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Client Portal Users</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Manage portal login access per client company</div>
        </div>
        <button
          onClick={() => !activeClientId ? toast.error("Switch to a client first.") : setShowCreate(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <UserPlus size={13} /> Add Portal User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} color={T.muted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username, or email…"
            style={{
              width: "100%", padding: "8px 30px 8px 30px", boxSizing: "border-box",
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
            }}
          />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 0 }}><X size={13} /></button>}
        </div>
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          style={{ padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}
        >
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: T.muted, fontSize: 12, padding: "20px 0" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "40px 24px", textAlign: "center",
        }}>
          <Shield size={36} color={T.border} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dim }}>No portal users found</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            {search || filterClient !== "all" ? "Try a different search or filter." : "Add portal users to give clients access to their data."}
          </div>
        </div>
      ) : (
        // Group by client
        clients
          .filter(c => filtered.some(u => u.clientId === c.id))
          .map(client => {
            const clientUsers = filtered.filter(u => u.clientId === client.id);
            const accent = client.color || "#6366f1";
            return (
              <div key={client.id} style={{ marginBottom: 20 }}>
                {/* Client header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                  padding: "8px 14px", background: accent + "0d", borderRadius: 8, border: `1px solid ${accent}20`,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "#fff",
                  }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{client.name}</div>
                  <span style={{ fontSize: 10, color: accent, background: accent + "18", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>
                    {clientUsers.length} user{clientUsers.length !== 1 ? "s" : ""}
                  </span>
                  <div style={{ fontSize: 10, color: T.muted, marginLeft: "auto" }}>
                    Portal login: <code style={{ color: T.accent, fontFamily: "monospace" }}>/client-login</code>
                  </div>
                </div>

                {/* Users table */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto auto", padding: "8px 14px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                    {["User", "Username / Email", "Role", "Status", "Created", ""].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                    ))}
                  </div>
                  {clientUsers.map((u, i) => (
                    <div key={u.id} style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto auto",
                      alignItems: "center", padding: "10px 14px",
                      borderBottom: i < clientUsers.length - 1 ? `1px solid ${T.border}` : "none",
                      opacity: u.isActive ? 1 : 0.55,
                    }}>
                      {/* Name */}
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar name={u.name} color={accent} size={28} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{u.name}</div>
                      </div>
                      {/* Username / email */}
                      <div>
                        <div style={{ fontSize: 12, color: T.dim }}>@{u.username}</div>
                        {u.email && <div style={{ fontSize: 10, color: T.muted }}>{u.email}</div>}
                      </div>
                      {/* Role */}
                      <RoleBadge role={u.role} />
                      {/* Status */}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: u.isActive ? "#10b98118" : "#6b728018",
                        color: u.isActive ? "#10b981" : "#6b7280",
                        border: `1px solid ${u.isActive ? "#10b98130" : "#6b728030"}`,
                        textTransform: "uppercase",
                      }}>
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                      {/* Created */}
                      <div style={{ fontSize: 11, color: T.muted }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => setResetModal(u)}
                          title="Reset password"
                          style={{ padding: "3px 6px", borderRadius: 5, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.borderColor = "#f59e0b44"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
                        >
                          <KeyRound size={10} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? "Disable access" : "Enable access"}
                          style={{ padding: "3px 6px", borderRadius: 5, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: u.isActive ? "#10b981" : T.muted, display: "flex", alignItems: "center" }}
                        >
                          {u.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Remove user"
                          style={{ padding: "3px 6px", borderRadius: 5, background: "none", border: `1px solid ${T.border}`, cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#f8717144"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
          {filtered.length} portal user{filtered.length !== 1 ? "s" : ""} across {clients.filter(c => filtered.some(u => u.clientId === c.id)).length} client{clients.filter(c => filtered.some(u => u.clientId === c.id)).length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function UserSettingsPage({ currentUser }) {
  const T = useTheme();
  const [tab, setTab] = useState("system");

  const TABS = [
    { id: "system", label: "System Users",       icon: User      },
    { id: "portal", label: "Client Portal Users", icon: Building2 },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>User Management</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
          Manage system staff accounts and client portal access
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 3, marginBottom: 24,
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: 4, width: "fit-content",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: active ? "#6366f1" : "transparent",
                color: active ? "#fff" : T.dim,
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                transition: "background 0.13s, color 0.13s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#6366f114"; e.currentTarget.style.color = T.text; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; } }}
            >
              <Icon size={13} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "system" && <SystemUsersTab currentUserId={currentUser?.id} />}
      {tab === "portal" && <ClientPortalUsersTab />}
    </div>
  );
}
