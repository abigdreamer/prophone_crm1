import { useState, useEffect } from "react";
import {
  Plus, Mail, LoaderCircle, Pencil, Copy, Trash2,
  Type, AlignLeft, Image as ImageIcon, MousePointerClick,
  Columns2, Minus, ArrowUpDown, PanelBottom, Search,
} from "lucide-react";
import * as store from "../lib/templateStore";

const W = {
  bg:       "#f8fafc",
  surface:  "#ffffff",
  border:   "#e2e8f0",
  text:     "#0f172a",
  sub:      "#475569",
  muted:    "#94a3b8",
  accent:   "#6366f1",
  accentLo: "#eef2ff",
  green:    "#16a34a",
  greenLo:  "#dcfce7",
  red:      "#dc2626",
  redLo:    "#fee2e2",
  amber:    "#d97706",
  amberLo:  "#fef3c7",
  shadow:   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

const BLOCK_ICON_MAP = {
  heading: Type,
  text:    AlignLeft,
  image:   ImageIcon,
  button:  MousePointerClick,
  divider: Minus,
  spacer:  ArrowUpDown,
  footer:  PanelBottom,
  columns: Columns2,
};

function statusBadge(status) {
  const cfg =
    status === "published"
      ? { bg: W.greenLo, color: W.green, label: "Published" }
      : { bg: W.amberLo, color: W.amber, label: "Draft" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" }}>
      {cfg.label}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function BlockChips({ blocks }) {
  const seen = {};
  (blocks || []).forEach(b => { seen[b.type] = (seen[b.type] || 0) + 1; });
  const entries = Object.entries(seen).slice(0, 5);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
      {entries.map(([type, count]) => {
        const Icon = BLOCK_ICON_MAP[type];
        return (
          <span key={type} style={{ fontSize: 10, color: W.sub, background: W.bg, border: "1px solid " + W.border, borderRadius: 4, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
            {Icon ? <Icon size={10} /> : <span style={{ fontWeight: 600 }}>{type}</span>}
            {count > 1 && <span style={{ color: W.muted }}>×{count}</span>}
          </span>
        );
      })}
      {Object.keys(seen).length > 5 && (
        <span style={{ fontSize: 10, color: W.muted }}>+{Object.keys(seen).length - 5} more</span>
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onDuplicate, onDelete, deleting }) {
  const [hover, setHover] = useState(false);
  const blocks = template.json_structure?.blocks || [];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: W.surface, border: "1px solid " + (hover ? W.accent + "70" : W.border), borderRadius: 12, overflow: "hidden", boxShadow: hover ? W.shadowMd : W.shadow, transition: "all 0.15s ease", cursor: "pointer", display: "flex", flexDirection: "column" }}
    >
      {/* Preview strip */}
      <div
        onClick={() => onEdit(template)}
        style={{ height: 100, background: template.json_structure?.backgroundColor || "#f4f4f4", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        <div style={{ width: "80%", background: template.json_structure?.containerBg || "#fff", borderRadius: 6, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {blocks.slice(0, 3).map(b => (
            <div
              key={b.id}
              style={{
                height: b.type === "spacer" ? (b.props?.height || 8) / 4 : 8,
                background:
                  b.type === "heading" ? "#111827" :
                  b.type === "button"  ? (b.props?.bgColor || W.accent) :
                  b.type === "divider" ? (b.props?.color || "#e5e7eb") :
                  b.type === "image"   ? "#d1d5db" : "#9ca3af",
                borderRadius: b.type === "button" ? 4 : 2,
                marginBottom: 5,
                width: b.type === "heading" ? "70%" : b.type === "button" ? "40%" : b.type === "divider" ? "100%" : "85%",
                margin: b.type === "button" ? "4px auto 4px" : undefined,
              }}
            />
          ))}
        </div>
        {hover && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(1px)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: W.accent, background: W.accentLo, padding: "5px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Pencil size={12} /> Edit Template
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: W.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {template.name}
            </div>
            {template.subject && (
              <div style={{ fontSize: 11, color: W.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {template.subject}
              </div>
            )}
          </div>
          {statusBadge(template.status)}
        </div>

        <BlockChips blocks={blocks} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 6 }}>
          <span style={{ fontSize: 10, color: W.muted }}>
            {blocks.length} block{blocks.length !== 1 ? "s" : ""} · Updated {fmtDate(template.updated_at)}
          </span>
          {template._source === "localStorage" && import.meta.env.DEV && (
            <span title="Saved locally — not yet synced to database" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
              Local
            </span>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid " + W.border, display: "flex", gap: 6 }}>
        <button onClick={() => onEdit(template)} style={actionBtn(W.accent, W.accentLo)}>
          <Pencil size={11} /> Edit
        </button>
        <button onClick={() => onDuplicate(template.id)} style={actionBtn(W.sub, "#f1f5f9")}>
          <Copy size={11} /> Duplicate
        </button>
        <button
          onClick={() => onDelete(template.id)}
          disabled={deleting === template.id}
          style={{ ...actionBtn(W.red, W.redLo), marginLeft: "auto", opacity: deleting === template.id ? 0.5 : 1 }}
        >
          {deleting === template.id ? "…" : <><Trash2 size={11} /> Delete</>}
        </button>
      </div>
    </div>
  );
}

function actionBtn(color, bg) {
  return {
    background: bg, color, border: "none", borderRadius: 6,
    padding: "5px 12px", fontSize: 11, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 4,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PageEmailTemplates({ onOpenBuilder }) {
  const [templates,   setTemplates]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [deleting,    setDeleting]    = useState(null);
  const [localCount,  setLocalCount]  = useState(0);
  const [migrating,   setMigrating]   = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await store.getTemplates();
      setTemplates(data);
      setLocalCount(data.filter(t => t._source === "localStorage").length);

      if (data.some(t => t._source === "localStorage")) {
        runMigration(false);
      }
    } catch {
      setTemplates([]);
      setLocalCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function runMigration(manual = true) {
    if (manual) setMigrating(true);
    try {
      const { migrated } = await store.migrateLocalToDb();
      if (migrated > 0) await load();
    } finally {
      if (manual) setMigrating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await store.deleteTemplate(id);
      setTemplates(p => p.filter(t => t.id !== id));
    } catch {
      alert("Failed to delete template.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDuplicate(id) {
    try {
      const copy = await store.duplicateTemplate(id);
      setTemplates(p => [copy, ...p]);
      if (copy._source === "localStorage") setLocalCount(n => n + 1);
    } catch {
      alert("Failed to duplicate template.");
    }
  }

  const filtered = search
    ? templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.subject || "").toLowerCase().includes(search.toLowerCase())
      )
    : templates;

  return (
    <div style={{ minHeight: "100%", background: W.bg, padding: 28, fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: W.text, letterSpacing: "-0.03em" }}>
            Email Templates
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: W.sub }}>
            Design and manage reusable email templates for your team.
          </p>
        </div>
        <button
          onClick={() => onOpenBuilder(null)}
          style={{ background: W.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.30)", flexShrink: 0 }}
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Local-storage fallback banner — dev only, hidden in production */}
      {localCount > 0 && import.meta.env.DEV && (
        <div style={{ marginBottom: 20, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              {localCount} template{localCount !== 1 ? "s" : ""} saved locally (dev mode)
            </div>
            <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
              Database was unavailable when these were saved. They will be synced automatically when the database is reachable. Local data is temporary and not available in production.
            </div>
          </div>
          <button
            onClick={() => runMigration(true)}
            disabled={migrating}
            style={{ background: "#d97706", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: migrating ? "default" : "pointer", fontFamily: "inherit", opacity: migrating ? 0.6 : 1, flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
          >
            {migrating
              ? <><LoaderCircle size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Syncing…</>
              : "Sync to Database"}
          </button>
        </div>
      )}

      {/* Search */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 20, maxWidth: 340, position: "relative" }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Search size={13} color={W.muted} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8, border: "1px solid " + W.border, fontSize: 12, color: W.text, background: W.surface, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: W.muted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <style>{`@keyframes _tspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <LoaderCircle size={32} color={W.accent} style={{ animation: "_tspin 0.8s linear infinite" }} />
          <span style={{ fontWeight: 500 }}>Loading templates…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 20px", background: W.surface, borderRadius: 16, border: "2px dashed " + W.border }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Mail size={40} color={W.muted} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: W.text, marginBottom: 6 }}>
            {search ? "No templates match your search" : "No templates yet"}
          </div>
          <div style={{ fontSize: 13, color: W.sub, marginBottom: 20 }}>
            {search ? "Try a different search term." : "Create your first email template to get started."}
          </div>
          {!search && (
            <button
              onClick={() => onOpenBuilder(null)}
              style={{ background: W.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={15} /> Create Template
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={tmpl => onOpenBuilder(tmpl.id)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
