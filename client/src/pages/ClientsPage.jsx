import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, RefreshCw, Users, X, Pencil } from "lucide-react";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Sel from "../components/ui/Sel";
import Btn from "../components/ui/Btn";
import { Spinner } from "../components/ui/Loader";
import { useTheme } from "../context/ThemeContext";
import * as db from "../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const PLANS = ["Starter", "Pro", "Enterprise"];
const COLORS = [
  "#6366f1", "#38bdf8", "#fb923c", "#4ade80",
  "#f43f5e", "#fbbf24", "#c084fc", "#2dd4bf",
];

const fmtMrr  = v => v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`;
const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
  const T = useTheme();
  const PLAN_COLOR = { Starter: T.muted, Pro: T.blue, Enterprise: T.accent };
  const color = PLAN_COLOR[plan] || T.muted;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: color + "20", color, border: `1px solid ${color}40`,
      letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
    }}>{plan}</span>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, color }) {
  const T = useTheme();
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 20px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────────
function ClientCard({ client, isSelected, total, onClick }) {
  const T = useTheme();
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 20px",
        background: isSelected ? client.color + "0d" : T.card,
        border: `1px solid ${isSelected ? client.color + "70" : T.border}`,
        borderRadius: 10, cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.background = T.surface; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.border;   e.currentTarget.style.background = T.card; } }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: client.color + "22", border: `2px solid ${client.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 800, color: client.color,
      }}>
        {client.name[0].toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{client.name}</span>
          <PlanBadge plan={client.plan} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
          {client.industry && <span>{client.industry}</span>}
          {client.industry && client.domain && <span style={{ opacity: 0.4 }}>·</span>}
          {client.domain && <span style={{ fontFamily: "monospace", fontSize: 10 }}>{client.domain}</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: T.green, lineHeight: 1 }}>{fmtMrr(client.mrr)}</span>
        <span style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
          <Users size={10} /> {total} contact{total !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ── Client modal (add or edit) ────────────────────────────────────────────────
function ClientModal({ client, onSave, onClose }) {
  const T = useTheme();
  const isEdit = !!client;
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const [form,   setForm]   = useState(isEdit ? {
    name:     client.name,
    domain:   client.domain     || "",
    color:    client.color      || COLORS[0],
    industry: client.industry   || "",
    plan:     client.plan       || "Starter",
    mrr:      client.mrr        || "",
  } : {
    name: "", id: "", domain: "", color: COLORS[0],
    industry: "", plan: "Starter", mrr: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const autoId = slugify(form.name);

  async function handleSave() {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    if (!isEdit && !autoId) { setErr("Enter a company name to generate the client ID."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, id: isEdit ? undefined : autoId, mrr: parseInt(form.mrr) || 0 });
    } catch (e) {
      setErr(e.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Client" : "Add Client"} onClose={onClose} width={600}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        <Input
          label={isEdit ? "Name *" : "Company Name *"}
          value={form.name}
          onChange={v => set("name", v)}
          placeholder="FoxTow"
          style={{ gridColumn: "1 / -1" }}
        />

        <Input
          label="Domain"
          value={form.domain}
          onChange={v => set("domain", v)}
          placeholder="foxtow.com"
        />

        <Input
          label="Industry"
          value={form.industry}
          onChange={v => set("industry", v)}
          placeholder="Towing SaaS"
        />

        <Sel
          label="Plan"
          value={form.plan}
          onChange={v => set("plan", v)}
          options={PLANS.map(p => ({ value: p, label: p }))}
        />

        <Input
          label="MRR ($)"
          value={form.mrr}
          onChange={v => set("mrr", v)}
          placeholder="4800"
          type="number"
        />
      </div>

      {/* Brand color */}
      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Brand Color
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => set("color", c)}
              style={{
                width: 28, height: 28, borderRadius: 6, background: c,
                border: `2px solid ${form.color === c ? T.text : "transparent"}`,
                cursor: "pointer", padding: 0, flexShrink: 0,
                boxShadow: form.color === c ? `0 0 0 3px ${c}40` : "none",
                transition: "box-shadow 0.15s",
              }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={e => set("color", e.target.value)}
            style={{
              width: 28, height: 28, padding: 2, borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.surface,
              cursor: "pointer",
            }}
            title="Custom color"
          />
        </div>

        {/* Live preview pill */}
        <div style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 10,
          padding: "9px 13px", borderRadius: 8,
          background: form.color + "0d", border: `1px solid ${form.color}30`,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: form.color + "22", border: `2px solid ${form.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: form.color,
          }}>
            {(form.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{form.name || "Client Name"}</div>
            <div style={{ fontSize: 10, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
              {form.industry || "Industry"}
              {!isEdit && autoId && (
                <>
                  <span style={{ opacity: 0.35 }}>·</span>
                  <code style={{ fontFamily: "monospace", color: T.accent, fontSize: 10 }}>{autoId}</code>
                </>
              )}
            </div>
          </div>
          <PlanBadge plan={form.plan} />
        </div>
      </div>

      {!isEdit && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 2, padding: "8px 12px", borderRadius: 7,
          background: T.surface, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
            Client ID
          </span>
          <code style={{
            flex: 1, fontFamily: "monospace", fontSize: 12,
            color: autoId ? T.accent : T.muted,
            fontWeight: autoId ? 700 : 400,
          }}>
            {autoId || "will be generated from name…"}
          </code>
          {autoId && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: T.green + "18", color: T.green, border: `1px solid ${T.green}30`,
              letterSpacing: "0.05em", flexShrink: 0,
            }}>AUTO</span>
          )}
        </div>
      )}

      {err && (
        <div style={{
          marginTop: 12, padding: "9px 12px", borderRadius: 6,
          background: T.red + "18", border: `1px solid ${T.red}40`,
          color: T.red, fontSize: 12,
        }}>{err}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving
            ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Spinner size={13} color="#fff" />
                {isEdit ? "Saving…" : "Adding…"}
              </span>
            : (isEdit ? "Save Changes" : "Add Client")
          }
        </Btn>
      </div>
    </Modal>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ client, total, onClose, onEdit }) {
  const T = useTheme();
  const PLAN_COLOR = { Starter: T.muted, Pro: T.blue, Enterprise: T.accent };
  const col = client.color;

  const rows = [
    { key: "CLIENT ID", val: <span style={{ fontFamily: "monospace", fontSize: 11, color: T.dim }}>{client.id}</span> },
    { key: "DOMAIN",    val: client.domain ? (
      <a href={`https://${client.domain}`} target="_blank" rel="noreferrer"
         style={{ color: T.blue, fontSize: 12, textDecoration: "none" }}>{client.domain}</a>
    ) : <span style={{ fontSize: 12, color: T.muted }}>—</span> },
    { key: "INDUSTRY",  val: <span style={{ fontSize: 12, color: T.dim }}>{client.industry || "—"}</span> },
    { key: "PLAN",      val: <PlanBadge plan={client.plan} /> },
    { key: "MRR",       val: <span style={{ fontSize: 13, fontWeight: 800, color: T.green }}>{fmtMrr(client.mrr)}</span> },
    { key: "ADDED",     val: <span style={{ fontSize: 12, color: T.dim }}>{fmtDate(client.createdAt)}</span> },
  ];

  return (
    <div style={{
      width: 460, flexShrink: 0,
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 18px", borderBottom: `1px solid ${T.border}`,
        background: col + "08",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, flexShrink: 0,
            background: col + "22", border: `2px solid ${col}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: col,
          }}>
            {client.name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 5, letterSpacing: "-0.01em" }}>
              {client.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlanBadge plan={client.plan} />
              {client.industry && <span style={{ fontSize: 11, color: T.muted }}>{client.industry}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${T.border}` }}>
        {[
          { label: "CONTACTS", value: total,              color: T.text  },
          { label: "MRR",      value: fmtMrr(client.mrr), color: T.green },
          { label: "PLAN",     value: client.plan,         color: PLAN_COLOR[client.plan] || T.muted },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "14px 16px",
            borderRight: i < 2 ? `1px solid ${T.border}` : "none",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info rows */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: T.muted,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12,
        }}>
          Client Details
        </div>

        {rows.map(({ key, val }) => (
          <div key={key} style={{
            display: "grid", gridTemplateColumns: "100px 1fr",
            alignItems: "center", padding: "10px 0",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.05em" }}>{key}</span>
            <div>{val}</div>
          </div>
        ))}

        <div style={{
          display: "grid", gridTemplateColumns: "100px 1fr",
          alignItems: "center", padding: "10px 0",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.05em" }}>COLOR</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: col }} />
            <span style={{ fontFamily: "monospace", fontSize: 11, color: T.dim }}>{col}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "10px 0", borderRadius: 7,
            background: T.card, border: `1px solid ${T.border}`,
            color: T.text, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Pencil size={13} /> Edit Client
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const T = useTheme();
  const PLAN_COLOR = { Starter: T.muted, Pro: T.blue, Enterprise: T.accent };
  const [clients,  setClients]  = useState([]);
  const [counts,   setCounts]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [planF,    setPlanF]    = useState("all");
  const [selected, setSelected] = useState(null);
  const [modal,    setModal]    = useState(null); // null | "add" | "edit"

  const load = useCallback(async () => {
    try {
      const [cls, cts] = await Promise.all([db.getClients(), db.getContactCounts()]);
      setClients(cls);
      setCounts(cts.clients || {});
      setSelected(prev => prev ? (cls.find(c => c.id === prev.id) || null) : null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleAdded(c) {
    setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
    setSelected(c);
    setModal(null);
  }
  function handleUpdated(c) {
    setClients(prev => prev.map(x => x.id === c.id ? c : x));
    setSelected(c);
    setModal(null);
  }

  const filtered = clients.filter(c => {
    if (planF !== "all" && c.plan !== planF) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.domain   || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q)
    );
  });

  const totalMrr = clients.reduce((s, c) => s + (c.mrr || 0), 0);
  const stats = [
    { label: "CLIENTS",    value: clients.length,                                      color: T.text   },
    { label: "TOTAL MRR",  value: "$" + totalMrr.toLocaleString(),                     color: T.green  },
    { label: "ENTERPRISE", value: clients.filter(c => c.plan === "Enterprise").length,  color: T.accent },
    { label: "PRO",        value: clients.filter(c => c.plan === "Pro").length,         color: T.blue   },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", margin: "-20px" }}>

      {/* ── Left list ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 20px", minWidth: 0 }}>

        <div style={{
          fontSize: 10, fontWeight: 700, color: T.muted,
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10,
        }}>
          CRM · Accounts
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 5, letterSpacing: "-0.02em" }}>
              Clients
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              Manage client accounts and track leads and revenue.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={load}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", background: T.card,
                border: `1px solid ${T.border}`, borderRadius: 7,
                color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => setModal("add")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", background: T.accent,
                border: "none", borderRadius: 7,
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={14} /> Add Client
            </button>
          </div>
        </div>

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {stats.map(s => <StatTile key={s.label} {...s} />)}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: T.muted, fontSize: 14, pointerEvents: "none",
            }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, domain, or industry…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "8px 12px 8px 34px",
                color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e  => (e.target.style.borderColor = T.border)}
            />
          </div>
          <select
            value={planF}
            onChange={e => setPlanF(e.target.value)}
            style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "8px 12px",
              color: T.text, fontSize: 12, outline: "none",
              fontFamily: "inherit", cursor: "pointer", flexShrink: 0,
            }}
          >
            <option value="all">All plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: T.muted, fontSize: 13 }}>
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "50px 24px", textAlign: "center",
          }}>
            <Building2 size={28} color={T.border} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
              {search || planF !== "all" ? "No clients match your filters" : "No clients yet"}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>
              {search || planF !== "all"
                ? "Try adjusting your search or plan filter."
                : "Add your first client account to get started."}
            </div>
            {!search && planF === "all" && (
              <button
                onClick={() => setModal("add")}
                style={{
                  background: T.accent, border: "none", borderRadius: 6,
                  color: "#fff", fontWeight: 700, padding: "9px 22px",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                + Add Client
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                isSelected={selected?.id === c.id}
                total={counts[c.id] || 0}
                onClick={() => setSelected(prev => prev?.id === c.id ? null : c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right detail panel ──────────────────────────────────────────────── */}
      {selected && (
        <DetailPanel
          client={selected}
          total={counts[selected.id] || 0}
          onClose={() => setSelected(null)}
          onEdit={() => setModal("edit")}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === "add" && (
        <ClientModal
          onSave={async data => { const c = await db.createClient(data); handleAdded(c); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "edit" && selected && (
        <ClientModal
          client={selected}
          onSave={async data => { const c = await db.updateClient(selected.id, data); handleUpdated(c); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
