import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, ChevronDown, LoaderCircle, Code2,
  MoreHorizontal, Pencil, Eye, Send, Copy, Trash2, X,
  Type as TypeIcon, Info,
} from "lucide-react";
import * as store from "../lib/templateStore";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

// ─── Light theme ──────────────────────────────────────────────────────────────
const C = {
  bg:        "#f1f5f9",
  surface:   "#ffffff",
  card:      "#ffffff",
  border:    "#e2e8f0",
  borderSub: "#f1f5f9",
  text:      "#0f172a",
  sub:       "#64748b",
  muted:     "#94a3b8",
  accent:    "#6366f1",
  accentLo:  "#eef2ff",
  green:     "#16a34a",
  greenBg:   "#f0fdf4",
  greenBdr:  "#bbf7d0",
  amber:     "#d97706",
  amberBg:   "#fffbeb",
  amberBdr:  "#fde68a",
  red:       "#dc2626",
  redBg:     "#fef2f2",
  redBdr:    "#fecaca",
  shadow:    "0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.10)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.14)",
};

const EMAIL_W = 560;

function slugify(name) {
  return (name || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const pub = status === "published";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      color: pub ? C.green : C.amber,
      background: pub ? C.greenBg : C.amberBg,
      border: `1px solid ${pub ? C.greenBdr : C.amberBdr}`,
      letterSpacing: "0.02em",
      display: "inline-block",
      whiteSpace: "nowrap",
    }}>
      {pub ? "Published" : "Draft"}
    </span>
  );
}

// ─── Mini block renderers ──────────────────────────────────────────────────────
function MiniBlock({ block }) {
  const { type, props: p } = block;
  if (!p) return null;
  const pt = p.padding?.top    ?? 0;
  const pb = p.padding?.bottom ?? 0;
  const pl = p.padding?.left   ?? 24;
  const pr = p.padding?.right  ?? 24;

  switch (type) {
    case "heading": {
      const Tag = p.level || "h2";
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <Tag style={{ margin: 0, fontSize: p.fontSize || 28, fontWeight: p.fontWeight || 700, color: p.color || "#111827", textAlign: p.align || "center", lineHeight: 1.2 }}>
            {p.text || ""}
          </Tag>
        </div>
      );
    }
    case "text":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 15, color: p.color || "#374151", textAlign: p.align || "left", lineHeight: p.lineHeight || 1.6, whiteSpace: "pre-wrap" }}>
            {p.text || ""}
          </p>
        </div>
      );
    case "button":
      return (
        <div style={{ padding: "16px 24px", textAlign: p.align || "center" }}>
          <span style={{ display: "inline-block", padding: "12px 28px", background: p.bgColor || "#6366f1", color: p.textColor || "#fff", fontSize: p.fontSize || 14, fontWeight: 600, borderRadius: p.borderRadius || 6 }}>
            {p.label || "Click Here"}
          </span>
        </div>
      );
    case "divider":
      return (
        <div style={{ padding: `${p.marginTop || 8}px ${p.sidePadding || 24}px ${p.marginBottom || 8}px` }}>
          <hr style={{ border: "none", borderTop: `${p.thickness || 1}px solid ${p.color || "#e5e7eb"}`, margin: 0 }} />
        </div>
      );
    case "spacer":
      return <div style={{ height: p.height || 32 }} />;
    case "image":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, textAlign: p.align || "center" }}>
          {p.src ? (
            <img src={p.src} alt="" style={{ maxWidth: `${p.width || 100}%`, borderRadius: p.borderRadius || 0, display: "block", margin: p.align === "center" ? "0 auto" : "0" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div style={{ height: 80, background: "#f1f5f9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: 12 }}>Image</div>
          )}
        </div>
      );
    case "footer":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 12, color: p.color || "#9ca3af", textAlign: p.align || "center", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {p.text || ""}
          </p>
        </div>
      );
    case "columns":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, display: "flex", gap: 16 }}>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5 }}>{p.leftText || ""}</div>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5 }}>{p.rightText || ""}</div>
        </div>
      );
    default:
      return null;
  }
}

// ─── Mini email preview (scaled render) ───────────────────────────────────────
function MiniEmailPreview({ template }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(300);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (template.source_type === "html") {
    if (template.html_output) {
      return (
        <div ref={wrapRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
          <iframe
            srcDoc={template.html_output}
            sandbox="allow-same-origin"
            style={{
              position: "absolute", top: 0, left: 0,
              width: EMAIL_W, height: "600px",
              border: "none", pointerEvents: "none",
              transformOrigin: "top left",
              transform: `scale(${w / EMAIL_W})`,
            }}
            title="preview"
          />
        </div>
      );
    }
    return (
      <div style={{ width: "100%", height: "100%", background: "#0d1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Code2 size={28} color="#79c0ff" strokeWidth={1.5} />
        <span style={{ fontSize: 12, color: "#8b949e", fontFamily: "monospace" }}>HTML Template</span>
      </div>
    );
  }

  const blocks  = template.json_structure?.blocks || [];
  const emailBg = template.json_structure?.containerBg || "#ffffff";
  const pageBg  = template.json_structure?.backgroundColor || "#f4f4f4";
  const scale   = w / EMAIL_W;

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: pageBg }}>
      {blocks.length > 0 ? (
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: EMAIL_W,
          background: emailBg,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          pointerEvents: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {blocks.map(b => <MiniBlock key={b.id} block={b} />)}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc" }}>
          <TypeIcon size={28} color="#cbd5e1" strokeWidth={1.5} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>No content yet</span>
        </div>
      )}
    </div>
  );
}

// ─── Send test email modal ─────────────────────────────────────────────────────
function SendTestModal({ template, onClose }) {
  const [email,   setEmail]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSend() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem("prophone_token");
      const res = await fetch(`/api/email-templates/${template.id}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px", boxShadow: C.shadowLg, width: "100%", maxWidth: 440, fontFamily: "inherit" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Send test email</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>
              Send <strong style={{ color: C.text }}>{template.name}</strong> to a test address.
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex", flexShrink: 0, marginLeft: 12 }}>
            <X size={14} />
          </button>
        </div>

        {success ? (
          <div style={{ marginTop: 20, background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Send size={15} color={C.green} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Email sent!</div>
              <div style={{ fontSize: 12, color: C.green, opacity: 0.8 }}>Test email delivered to {email.trim()}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>Recipient email</label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && valid && !busy) handleSend(); if (e.key === "Escape") onClose(); }}
                placeholder="you@example.com"
                style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1.5px solid ${error ? C.red : C.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit" }}
                onFocus={e => { e.currentTarget.style.borderColor = error ? C.red : "#94a3b8"; }}
                onBlur={e => { e.currentTarget.style.borderColor = error ? C.red : C.border; }}
              />
              {error && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{error}</div>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <MBtn onClick={onClose} variant="ghost">Cancel</MBtn>
              <button
                onClick={handleSend}
                disabled={!valid || busy}
                style={{
                  flex: 1, border: "none", borderRadius: 9, padding: "10px 0",
                  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: valid && !busy ? C.accent : C.accentLo,
                  color:      valid && !busy ? "#fff" : "#a5b4fc",
                  cursor:     valid && !busy ? "pointer" : "not-allowed",
                  transition: "background 0.15s",
                }}
              >
                {busy
                  ? <><LoaderCircle size={13} style={{ animation: "_tspin 0.8s linear infinite" }} /> Sending…</>
                  : <><Send size={13} /> Send test</>}
              </button>
            </div>
          </>
        )}

        {success && (
          <button onClick={onClose} style={{ marginTop: 14, width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Options dropdown ──────────────────────────────────────────────────────────
function OptionsDropdown({ template, onClose, onRename, onDetails, onPublish, onEdit, onDuplicate, onDeleteRequest, onSendTest }) {
  const isPub   = template.status === "published";
  const editLabel = template.source_type === "html" ? "Edit HTML" : "Continue editing";
  const items = [
    { label: editLabel,                       Icon: template.source_type === "html" ? Code2 : Pencil, action: () => { onEdit(); onClose(); } },
    { label: "View details",                  Icon: Info,   action: () => { onDetails();       onClose(); } },
    null,
    { label: isPub ? "Unpublish" : "Publish template", Icon: Send, action: () => { onPublish(); onClose(); } },
    ...(isPub ? [{ label: "Send test email", Icon: Send, action: () => { onSendTest(); onClose(); } }] : []),
    { label: "Rename template",               Icon: Pencil, action: () => { onRename();        onClose(); } },
    { label: "Duplicate template",            Icon: Copy,   action: () => { onDuplicate();     onClose(); } },
    null,
    { label: "Delete template",               Icon: Trash2, action: () => { onDeleteRequest(); onClose(); }, danger: true },
  ];

  return (
    <div
      data-opts
      style={{
        position: "absolute", top: 52, right: 10, zIndex: 600,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        boxShadow: C.shadowLg,
        minWidth: 205,
        overflow: "hidden",
        padding: "4px 0",
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (!item) return <div key={`sep-${i}`} style={{ height: 1, background: C.borderSub, margin: "3px 0" }} />;
        return (
          <button
            key={item.label}
            onClick={item.action}
            style={{ width: "100%", background: "transparent", border: "none", padding: "9px 14px", fontSize: 13, color: item.danger ? C.red : C.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 9 }}
            onMouseEnter={e => { e.currentTarget.style.background = item.danger ? C.redBg : C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <item.Icon size={13} style={{ flexShrink: 0, color: item.danger ? C.red : C.muted }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, menuOpenId, onMenuToggle, onEdit, onDuplicate, onRename, onDetails, onPublish, onDeleteRequest, onSendTest }) {
  const slug   = slugify(template.name);
  const isOpen = menuOpenId === template.id;

  return (
    <div
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "visible", boxShadow: C.shadow, cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s, border-color 0.15s" }}
      onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.borderColor = "#cbd5e1"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow;   e.currentTarget.style.borderColor = C.border; }}
    >
      {/* Email preview with 3-dot button */}
      {/* overflow:visible so dropdown can escape; inner div clips the actual preview */}
      <div style={{ margin: "12px 12px 0", borderRadius: 10, height: 224, overflow: "visible", position: "relative", border: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Clip only the email render, not the button/dropdown */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 9, overflow: "hidden" }}>
          <MiniEmailPreview template={template} />
        </div>

        {/* 3-dot button */}
        <button
          data-opts
          onClick={e => { e.stopPropagation(); onMenuToggle(template.id); }}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: `1px solid ${C.border}`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.10)", transition: "box-shadow 0.1s" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.10)"; }}
        >
          <MoreHorizontal size={15} color={C.sub} />
        </button>

        {/* Dropdown — outside the clip div so it renders fully */}
        {isOpen && (
          <OptionsDropdown
            template={template}
            onClose={() => onMenuToggle(null)}
            onEdit={onEdit}
            onDetails={onDetails}
            onPublish={onPublish}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDeleteRequest={onDeleteRequest}
            onSendTest={onSendTest}
          />
        )}
      </div>

      {/* Card info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {template.name}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {slug}
            </div>
          </div>
          <StatusBadge status={template.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal backdrop + button ───────────────────────────────────────────────────
function ModalBackdrop({ children, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px", boxShadow: C.shadowLg, width: "100%", maxWidth: 460 }}>
        {children}
      </div>
    </div>
  );
}

function MBtn({ children, onClick, disabled, variant = "primary" }) {
  const V = {
    primary:  { bg: C.accent, color: "#fff",   bdr: "none",                       csr: "pointer" },
    ghost:    { bg: C.bg,     color: C.sub,    bdr: `1px solid ${C.border}`,      csr: "pointer" },
    danger:   { bg: C.red,    color: "#fff",   bdr: "none",                       csr: "pointer" },
    disabled: { bg: C.bg,     color: C.muted,  bdr: `1px solid ${C.border}`,      csr: "not-allowed" },
    dangerOff:{ bg: C.redBg,  color: "#fca5a5",bdr: `1px solid ${C.redBdr}`,      csr: "not-allowed" },
  };
  const s = V[variant] || V.primary;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 1, background: s.bg, border: s.bdr, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: s.color, cursor: s.csr, fontFamily: "inherit", transition: "opacity 0.15s" }}>
      {children}
    </button>
  );
}


// ─── Rename modal ──────────────────────────────────────────────────────────────
function RenameModal({ template, onConfirm, onCancel }) {
  const [input, setInput] = useState(template.name);
  const canSave = input.trim() && input.trim() !== template.name;

  return (
    <ModalBackdrop onClose={onCancel}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Rename template</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 18 }}>Choose a new name for this template.</div>
      <input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && canSave) onConfirm(input.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder="Template name"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", marginBottom: 16 }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <MBtn onClick={onCancel} variant="ghost">Cancel</MBtn>
        <MBtn onClick={() => canSave && onConfirm(input.trim())} disabled={!canSave} variant={canSave ? "primary" : "disabled"}>
          Rename
        </MBtn>
      </div>
    </ModalBackdrop>
  );
}

// ─── Template details modal ────────────────────────────────────────────────────
function DetailsModal({ template, onClose, onEdit }) {
  const blocks = template.json_structure?.blocks || [];
  const blockCounts = {};
  blocks.forEach(b => { blockCounts[b.type] = (blockCounts[b.type] || 0) + 1; });
  const blockSummary = Object.entries(blockCounts).map(([k, v]) => `${v} ${k}`).join(", ") || "None";

  const rows = [
    { label: "Subject", value: template.subject || "—" },
    { label: "From",    value: template.json_structure?.from || "—" },
    { label: "Status",  value: <StatusBadge status={template.status} /> },
    { label: "Blocks",  value: `${blocks.length} blocks (${blockSummary})` },
    { label: "Version", value: `v${template.version || 1}` },
    { label: "Created", value: fmtDateTime(template.created_at) },
    { label: "Updated", value: fmtDateTime(template.updated_at) },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadowLg, width: "100%", maxWidth: 520, overflow: "hidden" }}>
        {/* Preview */}
        <div style={{ height: 170, position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.border}` }}>
          <MiniEmailPreview template={template} />
        </div>

        <div style={{ padding: "22px 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 2 }}>{template.name}</div>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>{slugify(template.name)}</div>
            </div>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex", flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          {/* Details table */}
          <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
            {rows.map(({ label, value }, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${C.borderSub}` : "none" }}>
                <div style={{ width: 72, flexShrink: 0, fontSize: 12, fontWeight: 600, color: C.muted }}>{label}</div>
                <div style={{ fontSize: 13, color: C.sub, flex: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onEdit(); onClose(); }}
            style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
          >
            <Pencil size={13} /> Continue editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter options ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all",       label: "All Statuses" },
  { value: "draft",     label: "Draft" },
  { value: "published", label: "Published" },
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PageEmailTemplates({ onOpenBuilder, onOpenHtmlEditor }) {
  const openEditor = (t) => t.source_type === "html" ? onOpenHtmlEditor?.(t.id) : onOpenBuilder(t.id);
  const [templates,      setTemplates]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [menuOpenId,     setMenuOpenId]     = useState(null);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [renameTarget,   setRenameTarget]   = useState(null);
  const [detailsTarget,  setDetailsTarget]  = useState(null);
  const [sendTestTarget, setSendTestTarget] = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  const statusRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handle(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusDropOpen(false);
      if (!e.target.closest("[data-opts]")) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function load() {
    setLoading(true);
    try { setTemplates(await store.getTemplates()); }
    catch { setTemplates([]); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await store.deleteTemplate(deleteTarget.id);
      setTemplates(p => p.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert("Failed to delete template.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDuplicate(id) {
    try {
      const copy = await store.duplicateTemplate(id);
      setTemplates(p => [copy, ...p]);
    } catch {
      alert("Failed to duplicate template.");
    }
  }

  async function handleRename(template, newName) {
    try {
      const updated = await store.updateTemplate(template.id, { name: newName });
      setTemplates(p => p.map(t => t.id === template.id ? { ...t, name: updated.name } : t));
      setRenameTarget(null);
    } catch {
      alert("Failed to rename template.");
    }
  }

  async function handlePublishToggle(template) {
    const newStatus = template.status === "published" ? "draft" : "published";
    try {
      const updated = await store.updateTemplate(template.id, { status: newStatus });
      setTemplates(p => p.map(t => t.id === template.id ? { ...t, status: updated.status } : t));
    } catch {
      alert("Failed to update status.");
    }
  }

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.name.toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q))
        && (statusFilter === "all" || t.status === statusFilter);
  });

  const currentLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? "All Statuses";

  return (
    <div style={{ minHeight: "100%", background: C.bg, padding: "32px 36px", fontFamily: "'Inter','DM Sans',system-ui,sans-serif", boxSizing: "border-box" }}>
      <style>{`@keyframes _tspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} input::placeholder{color:#94a3b8!important}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>Templates</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.sub }}>Design and manage your email templates.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => onOpenBuilder(null)}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}
          >
            <Plus size={15} /> New builder
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color={C.muted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box", boxShadow: C.shadow }}
          />
        </div>
        <div ref={statusRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setStatusDropOpen(p => !p)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, minWidth: 148, boxShadow: C.shadow }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>{currentLabel}</span>
            <ChevronDown size={13} color={C.muted} style={{ transform: statusDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {statusDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", zIndex: 200, minWidth: 160, boxShadow: C.shadowMd }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setStatusDropOpen(false); }}
                  style={{ width: "100%", background: statusFilter === opt.value ? C.accentLo : "transparent", border: "none", padding: "10px 16px", fontSize: 13, color: statusFilter === opt.value ? C.accent : C.sub, fontWeight: statusFilter === opt.value ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 20px", gap: 14 }}>
          <LoaderCircle size={28} color={C.accent} style={{ animation: "_tspin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: C.muted }}>Loading templates…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.sub, marginBottom: 6 }}>
            {search || statusFilter !== "all" ? "No templates match your filters" : "No templates yet"}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>
            {search || statusFilter !== "all" ? "Try adjusting your search or filter." : "Create your first template to get started."}
          </div>
          {!search && statusFilter === "all" && (
            <button onClick={() => onOpenBuilder(null)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}>
              <Plus size={14} /> Create template
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              menuOpenId={menuOpenId}
              onMenuToggle={id => setMenuOpenId(prev => prev === id ? null : id)}
              onEdit={() => openEditor(t)}
              onDuplicate={() => handleDuplicate(t.id)}
              onRename={() => setRenameTarget(t)}
              onDetails={() => setDetailsTarget(t)}
              onPublish={() => handlePublishToggle(t)}
              onDeleteRequest={() => setDeleteTarget(t)}
              onSendTest={() => setSendTestTarget(t)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete template"
          itemName={deleteTarget.name}
          description="This action is permanent and cannot be undone."
          confirmLabel="Delete template"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
      {renameTarget && (
        <RenameModal
          template={renameTarget}
          onConfirm={name => handleRename(renameTarget, name)}
          onCancel={() => setRenameTarget(null)}
        />
      )}
      {detailsTarget && (
        <DetailsModal
          template={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onEdit={() => openEditor(detailsTarget)}
        />
      )}
      {sendTestTarget && (
        <SendTestModal
          template={sendTestTarget}
          onClose={() => setSendTestTarget(null)}
        />
      )}
    </div>
  );
}
