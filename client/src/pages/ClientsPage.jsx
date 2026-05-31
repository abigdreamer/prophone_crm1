import { useState, useEffect, useCallback, useMemo } from "react";
import { Building2, Plus, Users, X, Pencil, History, Search, KeyRound, Trash2, UserPlus, ToggleLeft, ToggleRight } from "lucide-react";
import RefreshBtn from "../components/ui/RefreshBtn";
import { useSearchParams } from "react-router-dom";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Sel from "../components/ui/Sel";
import Btn from "../components/ui/Btn";
import { Spinner, SkeletonRow, SkeletonActivityRow } from "../components/ui/Loader";
import CancelModal from "../components/modals/CancelModal";
import { RestoreModal } from "../components/modals/RestoreModal";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import fmt from "../utils/format";
import * as db from "../services/api";

const PLANS = ["Starter", "Pro", "Enterprise"];
const COLORS = ["#6366f1", "#38bdf8", "#fb923c", "#4ade80", "#f43f5e", "#fbbf24", "#c084fc", "#2dd4bf"];

const ACTION_CFG = {
  CREATE: { label: "Created", color: "#6366f1", icon: "✦" },
  UPDATE: { label: "Updated", color: "#38bdf8", icon: "✎" },
  CANCEL: { label: "Canceled", color: "#f43f5e", icon: "✕" },
  RESTORE: { label: "Restored", color: "#22c55e", icon: "↩" },
};

const slugify = (str) => str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
const fmtMrr = v => v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`;

// ── Shared UI ─────────────────────────────────────────────────────────────────

function PlanBadge({ plan }) {
  const T = useTheme();
  const color = { Starter: T.muted, Pro: T.blue, Enterprise: T.accent }[plan] || T.muted;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: color + "18", color, border: `1px solid ${color}35`,
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>{plan}</span>
  );
}

// ── Client modal ──────────────────────────────────────────────────────────────

function ClientModal({ client, onSave, onClose }) {
  const T = useTheme();
  const isEdit = !!client;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(isEdit ? {
    name: client.name, domain: client.domain || "", color: client.color || COLORS[0],
    industry: client.industry || "", plan: client.plan || "Starter", mrr: client.mrr || "",
  } : { name: "", id: "", domain: "", color: COLORS[0], industry: "", plan: "Starter", mrr: "" });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const autoId = slugify(form.name);

  async function handleSave() {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    if (!isEdit && !autoId) { setErr("Enter a company name to generate the client ID."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, id: isEdit ? undefined : autoId, mrr: parseInt(form.mrr) || 0 });
    } catch (e) { setErr(e.message || "Failed to save"); setSaving(false); }
  }

  return (
    <Modal title={isEdit ? "Edit Client" : "Add Client"} onClose={onClose} width={600}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label={isEdit ? "Name *" : "Company Name *"} value={form.name} onChange={v => set("name", v)} placeholder="FoxTow" style={{ gridColumn: "1 / -1" }} />
        <Input label="Domain" value={form.domain} onChange={v => set("domain", v)} placeholder="foxtow.com" />
        <Input label="Industry" value={form.industry} onChange={v => set("industry", v)} placeholder="Towing SaaS" />
        <Sel label="Plan" value={form.plan} onChange={v => set("plan", v)} options={PLANS.map(p => ({ value: p, label: p }))} />
        <Input label="MRR ($)" value={form.mrr} onChange={v => set("mrr", v)} placeholder="4800" type="number" />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Brand Color</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => set("color", c)} style={{
              width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer", padding: 0, flexShrink: 0,
              border: `2px solid ${form.color === c ? T.text : "transparent"}`,
              boxShadow: form.color === c ? `0 0 0 3px ${c}40` : "none", transition: "box-shadow 0.15s",
            }} />
          ))}
          <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
            style={{ width: 28, height: 28, padding: 2, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer" }} />
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 8, background: form.color + "0d", border: `1px solid ${form.color}30` }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: form.color + "22", border: `2px solid ${form.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: form.color }}>
            {(form.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{form.name || "Client Name"}</div>
            <div style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
              {form.industry || "Industry"}
              {!isEdit && autoId && <><span style={{ opacity: 0.35 }}>·</span><code style={{ fontFamily: "monospace", color: T.accent, fontSize: 10 }}>{autoId}</code></>}
            </div>
          </div>
          <PlanBadge plan={form.plan} />
        </div>
      </div>

      {!isEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, padding: "8px 12px", borderRadius: 7, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>Client ID</span>
          <code style={{ flex: 1, fontFamily: "monospace", fontSize: 12, color: autoId ? T.accent : T.muted, fontWeight: autoId ? 600 : 400 }}>
            {autoId || "will be generated from name…"}
          </code>
          {autoId && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: T.green + "18", color: T.green, border: `1px solid ${T.green}30`, letterSpacing: "0.05em", flexShrink: 0 }}>AUTO</span>}
        </div>
      )}

      {err && <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 6, background: T.red + "18", border: `1px solid ${T.red}40`, color: T.red, fontSize: 12 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Spinner size={13} color="#fff" />{isEdit ? "Saving…" : "Adding…"}</span>
            : (isEdit ? "Save Changes" : "Add Client")}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Portal Users Section ──────────────────────────────────────────────────────

function PortalUsersSection({ clientId }) {
  const T = useTheme();
  const toast = useAppToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", email: "", role: "viewer" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setLoading(true);
    db.getClientPortalUsers(clientId)
      .then(data => setUsers(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleCreate() {
    if (!form.name || !form.username || !form.password) {
      setFormErr("Name, username, and password are required.");
      return;
    }
    setSaving(true); setFormErr("");
    try {
      const created = await db.createClientPortalUser(clientId, form);
      setUsers(u => [...u, created]);
      setForm({ name: "", username: "", password: "", email: "", role: "viewer" });
      setShowForm(false);
      toast.success("Portal user created.");
    } catch (e) {
      setFormErr(e.message || "Failed to create user.");
    } finally { setSaving(false); }
  }

  async function handleToggleActive(user) {
    try {
      const updated = await db.updateClientPortalUser(clientId, user.id, { isActive: !user.isActive });
      setUsers(u => u.map(x => x.id === updated.id ? updated : x));
    } catch { toast.error("Failed to update user."); }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove portal access for ${user.name}?`)) return;
    try {
      await db.deleteClientPortalUser(clientId, user.id);
      setUsers(u => u.filter(x => x.id !== user.id));
      toast.success("Portal user removed.");
    } catch { toast.error("Failed to remove user."); }
  }

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <KeyRound size={12} color={T.muted} />
          <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Portal Users</span>
          {users.length > 0 && (
            <span style={{ fontSize: 10, color: T.muted, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0px 6px" }}>{users.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, color: T.muted, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
        >
          <UserPlus size={10} /> Add User
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { k: "name",     label: "Full Name *",  placeholder: "John Smith"      },
              { k: "username", label: "Username *",   placeholder: "john_smith"       },
              { k: "password", label: "Password *",   placeholder: "••••••••", type: "password" },
              { k: "email",    label: "Email",        placeholder: "john@company.com" },
            ].map(({ k, label, placeholder, type }) => (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                <input
                  type={type || "text"}
                  value={form[k]}
                  onChange={e => setF(k, e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: "100%", padding: "6px 9px", boxSizing: "border-box",
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
                    color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Role</div>
            <select
              value={form.role}
              onChange={e => setF("role", e.target.value)}
              style={{ padding: "6px 9px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 11, fontFamily: "inherit" }}
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formErr && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 6 }}>{formErr}</div>}
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={handleCreate} disabled={saving} style={{ padding: "5px 14px", borderRadius: 6, background: T.accent, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Creating…" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setFormErr(""); }} style={{ padding: "5px 12px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, color: T.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={{ fontSize: 11, color: T.muted, fontStyle: "italic", padding: "4px 0 8px" }}>No portal users yet. Add one to give this client access.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 7,
              background: u.isActive ? T.card : T.border + "40",
              border: `1px solid ${T.border}`,
              opacity: u.isActive ? 1 : 0.6,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: u.isActive ? T.accent + "22" : T.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: u.isActive ? T.accent : T.muted,
              }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                <div style={{ fontSize: 10, color: T.muted }}>@{u.username} · {u.role}</div>
              </div>
              <button
                onClick={() => handleToggleActive(u)}
                title={u.isActive ? "Disable access" : "Enable access"}
                style={{ background: "none", border: "none", cursor: "pointer", color: u.isActive ? T.green : T.muted, padding: 2, display: "flex" }}
              >
                {u.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button
                onClick={() => handleDelete(u)}
                title="Remove user"
                style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2, display: "flex" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function activityDetail(a) {
  if (a.action === "CANCEL") return a.metadata?.reason || null;
  if (a.action === "RESTORE") return a.metadata?.previousReason ? `Previously: "${a.metadata.previousReason}"` : null;
  if (a.action === "CREATE") return a.metadata?.plan ? `Plan: ${a.metadata.plan}` : null;
  if (a.action === "UPDATE") {
    const changes = a.metadata?.changes;
    if (!changes) return null;
    return Object.entries(changes).map(([k, { from, to }]) => `${k}: ${from} → ${to}`).join(" · ");
  }
  return null;
}

export function DetailPanel({ client, total, onClose, onEdit, onCanceled, onRestored }) {
  const T = useTheme();
  const toast = useAppToast();
  const [activities, setActivities] = useState([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);

  useEffect(() => {
    setLoadingAct(true);
    db.getClientActivities(client.id)
      .then(data => setActivities(data || []))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoadingAct(false));
  }, [client.id, client.isCanceled]);

  const accent = client.color || T.accent;

  return (
    <div style={{ width: 400, flexShrink: 0, background: T.surface, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", height: "100%" }}>

      {cancelModal && (
        <CancelModal
          contact={{ firstName: client.name, lastName: "" }}
          onSave={async reason => { const u = await db.cancelClient(client.id, reason); onCanceled(u); setCancelModal(false); }}
          onClose={() => setCancelModal(false)}
        />
      )}
      {restoreModal && (
        <RestoreModal
          title="Restore Client"
          message={<>Restore <strong>{client.name}</strong> back to active accounts?</>}
          confirmLabel="Restore Account"
          onClose={() => setRestoreModal(false)}
          onRestore={async () => { const u = await db.restoreClient(client.id); onRestored(u); setRestoreModal(false); }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: client.isCanceled ? T.red : T.green, display: "inline-block" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Client Lifecycle</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex", padding: 2 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 20px" }}>

        {/* Identity card */}
        <div style={{ background: accent + "08", border: `1px solid ${accent}22`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: accent + "18", border: `1.5px solid ${accent}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 18, color: accent,
            }}>
              {client.name?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{client.name}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{client.domain || "—"}</div>
            </div>
            {client.isCanceled
              ? <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: T.red + "15", border: `1px solid ${T.red}30`, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Canceled</span>
              : <PlanBadge plan={client.plan} />
            }
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[["Domain", client.domain || "—"], ["Industry", client.industry || "—"], ["MRR", client.mrr ? fmtMrr(client.mrr) : "—"], ["Leads", total]].map(([label, val]) => (
              <div key={label} style={{ background: T.card, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: T.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={onEdit} style={{ flex: 1, height: 34, borderRadius: 7, background: T.card, border: `1px solid ${T.border}`, color: T.dim, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
            <Pencil size={12} /> Edit
          </button>
          {client.isCanceled ? (
            <button onClick={() => setRestoreModal(true)} style={{ flex: 1, height: 34, borderRadius: 7, background: T.green + "10", border: `1px solid ${T.green}30`, color: T.green, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              <RefreshCw size={12} /> Restore
            </button>
          ) : (
            <button onClick={() => setCancelModal(true)} style={{ flex: 1, height: 34, borderRadius: 7, background: T.red + "10", border: `1px solid ${T.red}25`, color: T.red, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              <X size={12} /> Cancel
            </button>
          )}
        </div>

        {/* Portal Users */}
        {!client.isCanceled && <PortalUsersSection clientId={client.id} />}

        {/* Activity timeline */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <History size={12} style={{ color: T.muted }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Activity History</span>
            {!loadingAct && activities.length > 0 && (
              <span style={{ fontSize: 10, color: T.muted, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0px 6px" }}>{activities.length}</span>
            )}
          </div>

          {loadingAct ? (
            <div style={{ paddingTop: 4 }}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonActivityRow key={i} />)}
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center", color: T.muted, fontSize: 12, fontStyle: "italic" }}>No activity yet.</div>
          ) : (
            <div>
              {activities.map((a, i) => {
                const cfg = ACTION_CFG[a.action] || { label: a.action, color: T.muted, icon: "•" };
                const detail = activityDetail(a);
                const isLast = i === activities.length - 1;
                return (
                  <div key={a.id} style={{ display: "flex", gap: 10, position: "relative", paddingBottom: isLast ? 2 : 14 }}>
                    {!isLast && <div style={{ position: "absolute", left: 9, top: 20, bottom: 0, width: 1, background: T.border }} />}

                    {/* Icon dot */}
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: cfg.color + "18", border: `1.5px solid ${cfg.color}45`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: cfg.color, zIndex: 1, marginTop: 1,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                      {/* Badge + who + when on one line */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                          background: cfg.color + "15", color: cfg.color,
                          border: `1px solid ${cfg.color}30`, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>{cfg.label}</span>
                        <span style={{ fontSize: 10, color: T.muted }}>
                          by {a.performedBy || "system"} · {fmt.date(a.ts)}
                        </span>
                      </div>
                      {/* Detail */}
                      {detail && (
                        <div style={{ fontSize: 11, color: T.dim, marginTop: 3, lineHeight: 1.5, fontStyle: a.action === "CANCEL" ? "italic" : "normal" }}>
                          {detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const T = useTheme();
  const [clients, setClients] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planF, setPlanF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  // Helper to open/close "Add Client" via URL
  const showAddModal = searchParams.get("action") === "add";
  const openAddModal = () => setSearchParams({ tab: "clients", action: "add" });
  const closeAddModal = () => setSearchParams({ tab: "clients" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, cts] = await Promise.all([db.getClients(true), db.getContactCounts()]);
      setClients(cls || []);
      setCounts(cts.clients || {});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.domain || "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = planF === "all" ? true : c.plan === planF;
    const matchStatus = statusF === "all" ? true : statusF === "canceled" ? c.isCanceled : !c.isCanceled;
    return matchSearch && matchPlan && matchStatus;
  }), [clients, search, planF, statusF]);

  const totalMrr = clients.reduce((s, c) => s + (c.mrr || 0), 0);
  const activeCount = clients.filter(c => !c.isCanceled).length;

  const selStyle = {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 7,
    padding: "0 12px", color: T.text, fontSize: 12, cursor: "pointer", height: "100%",
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", margin: "-20px", background: T.bg }}>

      {/* Left content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 20px", minWidth: 0 }}>

        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>Account Management</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Clients</div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, height: 36 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or domain…"
              style={{ width: "100%", height: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, padding: "0 12px 0 32px", color: T.text, fontSize: 12, outline: "none" }}
            />
          </div>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selStyle}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
          </select>
          <select value={planF} onChange={e => setPlanF(e.target.value)} style={selStyle}>
            <option value="all">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <RefreshBtn onClick={load} loading={loading} style={{ height: "100%", borderRadius: 7 }} />
          <button onClick={openAddModal} style={{ height: "100%", padding: "0 16px", background: T.accent, border: "none", borderRadius: 7, color: "#fff", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit" }}>
            <Plus size={14} /> Add Client
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            ["Total Clients", clients.length, T.text],
            ["Revenue (MRR)", fmtMrr(totalMrr), T.green],
            ["Active", activeCount, T.accent],
            ["Enterprise", clients.filter(c => c.plan === "Enterprise").length, T.blue],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ flex: 2 }}>Name & Domain</div>
            <div style={{ flex: 1 }}>Plan</div>
            <div style={{ flex: 1 }}>Status</div>
            <div style={{ flex: 1, textAlign: "right" }}>Leads</div>
            <div style={{ flex: 1, textAlign: "right" }}>MRR</div>
          </div>

          <div>
            {loading && clients.length === 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
                </tbody>
              </table>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 12 }}>No clients match.</div>
            ) : filtered.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => setSelected(prev => prev?.id === c.id ? null : c)}
                style={{
                  display: "flex", alignItems: "center", padding: "12px 20px",
                  borderBottom: idx === filtered.length - 1 ? "none" : `1px solid ${T.border}`,
                  background: selected?.id === c.id ? (c.color || T.accent) + "08" : "transparent",
                  cursor: "pointer", opacity: c.isCanceled ? 0.65 : 1, transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected?.id === c.id ? (c.color || T.accent) + "08" : "transparent"; }}
              >
                <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: (c.color || T.accent) + "18", color: c.color || T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {c.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{c.domain || "—"}</div>
                  </div>
                </div>
                <div style={{ flex: 1 }}><PlanBadge plan={c.plan} /></div>
                <div style={{ flex: 1 }}>
                  {c.isCanceled
                    ? <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: T.red + "12", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Canceled</span>
                    : <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: T.green + "12", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Active</span>
                  }
                </div>
                <div style={{ flex: 1, textAlign: "right", fontSize: 13, color: T.text, fontWeight: 500 }}>{counts[c.id] || 0}</div>
                <div style={{ flex: 1, textAlign: "right", fontSize: 13, fontWeight: 600, color: T.text }}>{fmtMrr(c.mrr || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          client={selected}
          total={counts[selected.id] || 0}
          onClose={() => setSelected(null)}
          onEdit={() => setModal("edit")}
          onCanceled={async updated => { await load(); setSelected(updated); }}
          onRestored={async updated => { await load(); setSelected(updated); }}
        />
      )}

      {/* Modals */}
      {showAddModal && (
        <ClientModal onSave={async data => { await db.createClient(data); await load(); closeAddModal(); }} onClose={closeAddModal} />
      )}
      {modal === "edit" && selected && (
        <ClientModal client={selected} onSave={async data => { const u = await db.updateClient(selected.id, data); await load(); setSelected(u); setModal(null); }} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
