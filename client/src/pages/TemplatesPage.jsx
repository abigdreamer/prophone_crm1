import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, ChevronDown, LoaderCircle,
  MoreHorizontal, Pencil, Send, Copy, Trash2, X,
  Type as TypeIcon, RefreshCw, ChevronLeft, ChevronUp,
  GripVertical, Info, AlignLeft, AlignCenter, AlignRight,
  Tag as TagIcon, Eye, Download,
} from "lucide-react";
import * as store from "../services/api";

// ─── Theme (dark, matches app theme.js) ──────────────────────────────────────
const C = {
  bg:        "#0b0c10",
  surface:   "#12151c",
  card:      "#181d27",
  border:    "#222836",
  borderSub: "#1a1d26",
  text:      "#e2e8f0",
  sub:       "#94a3b8",
  muted:     "#64748b",
  accent:    "#6366f1",
  accentLo:  "rgba(99,102,241,0.12)",
  green:     "#22c55e",
  greenBg:   "rgba(34,197,94,0.10)",
  greenBdr:  "rgba(34,197,94,0.28)",
  amber:     "#f59e0b",
  amberBg:   "rgba(245,158,11,0.10)",
  amberBdr:  "rgba(245,158,11,0.28)",
  red:       "#ef4444",
  redBg:     "rgba(239,68,68,0.10)",
  redBdr:    "rgba(239,68,68,0.28)",
  shadow:    "0 1px 4px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.25)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.50)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.60)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function slugify(name) {
  return (name || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ─── Block types & defaults ───────────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: "heading",  label: "Heading",  desc: "Title or section header" },
  { type: "text",     label: "Text",     desc: "Body paragraph" },
  { type: "image",    label: "Image",    desc: "Image block" },
  { type: "button",   label: "Button",   desc: "Call-to-action" },
  { type: "columns",  label: "Columns",  desc: "Two-column layout" },
  { type: "divider",  label: "Divider",  desc: "Horizontal rule" },
  { type: "spacer",   label: "Spacer",   desc: "Vertical space" },
  { type: "footer",   label: "Footer",   desc: "Footer text" },
];

const BLOCK_DEFAULTS = {
  heading:  { text: "Welcome!", level: "h2", fontSize: 28, fontWeight: 700, color: "#111827", align: "center", padding: { top: 24, right: 24, bottom: 8, left: 24 } },
  text:     { text: "Write your email body text here. Keep it concise and engaging.", fontSize: 15, color: "#374151", align: "left", lineHeight: 1.6, padding: { top: 8, right: 24, bottom: 8, left: 24 } },
  image:    { src: "", alt: "", width: 100, borderRadius: 0, align: "center", padding: { top: 8, right: 0, bottom: 8, left: 0 } },
  button:   { label: "Click Here", url: "", bgColor: "#6366f1", textColor: "#ffffff", fontSize: 14, borderRadius: 6, align: "center" },
  columns:  { leftText: "Left column text", rightText: "Right column text", fontSize: 14, color: "#374151", padding: { top: 8, right: 24, bottom: 8, left: 24 } },
  divider:  { color: "#e5e7eb", thickness: 1, marginTop: 8, marginBottom: 8, sidePadding: 24 },
  spacer:   { height: 32 },
  footer:   { text: "© 2024 Your Company. All rights reserved.\nYou received this email because you opted in.", fontSize: 12, color: "#9ca3af", align: "center", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
};

const DEFAULT_BLOCKS = [
  { id: "b1", type: "heading", props: { ...BLOCK_DEFAULTS.heading } },
  { id: "b2", type: "text",    props: { ...BLOCK_DEFAULTS.text } },
  { id: "b3", type: "button",  props: { ...BLOCK_DEFAULTS.button } },
  { id: "b4", type: "divider", props: { ...BLOCK_DEFAULTS.divider } },
  { id: "b5", type: "footer",  props: { ...BLOCK_DEFAULTS.footer } },
];

// ─── Client-side HTML generator ───────────────────────────────────────────────
function blockToHtml(block) {
  const { type, props: p } = block;
  if (!p) return "";
  const padStr = p.padding
    ? `padding:${p.padding.top || 0}px ${p.padding.right || 0}px ${p.padding.bottom || 0}px ${p.padding.left || 0}px`
    : "padding:0";
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  switch (type) {
    case "heading": {
      const tag = p.level || "h2";
      const style = `margin:0;font-size:${p.fontSize || 28}px;font-weight:${p.fontWeight || 700};color:${p.color || "#111827"};text-align:${p.align || "center"};line-height:1.2;font-family:Arial,sans-serif`;
      return `<tr><td style="${padStr}"><${tag} style="${style}">${esc(p.text)}</${tag}></td></tr>`;
    }
    case "text": {
      const style = `margin:0;font-size:${p.fontSize || 15}px;color:${p.color || "#374151"};text-align:${p.align || "left"};line-height:${p.lineHeight || 1.6};font-family:Arial,sans-serif`;
      const content = (p.text || "").replace(/\n/g, "<br>");
      return `<tr><td style="${padStr}"><p style="${style}">${content}</p></td></tr>`;
    }
    case "image": {
      const align = p.align || "center";
      const margin = align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0";
      const imgStyle = `max-width:${p.width || 100}%;height:auto;display:block;border-radius:${p.borderRadius || 0}px;margin:${margin}`;
      if (!p.src) return `<tr><td style="${padStr};text-align:${align}"><div style="height:120px;background:#f3f4f6;text-align:center;line-height:120px;color:#9ca3af;font-family:Arial">[Image]</div></td></tr>`;
      return `<tr><td style="${padStr};text-align:${align}"><img src="${p.src}" alt="${esc(p.alt)}" style="${imgStyle}" /></td></tr>`;
    }
    case "button": {
      const btnPad = p.padding ? `${p.padding.top || 12}px ${p.padding.right || 28}px ${p.padding.bottom || 12}px ${p.padding.left || 28}px` : "12px 28px";
      const btnStyle = `display:inline-block;padding:${btnPad};background:${p.bgColor || "#6366f1"};color:${p.textColor || "#ffffff"};font-size:${p.fontSize || 14}px;font-weight:600;text-decoration:none;border-radius:${p.borderRadius || 6}px;font-family:Arial,sans-serif`;
      return `<tr><td style="padding:16px 24px;text-align:${p.align || "center"}"><a href="${p.url || "#"}" style="${btnStyle}" target="_blank">${esc(p.label || "Click Here")}</a></td></tr>`;
    }
    case "divider": {
      const hrStyle = `border:none;border-top:${p.thickness || 1}px solid ${p.color || "#e5e7eb"};margin:${p.marginTop || 0}px 0 ${p.marginBottom || 0}px 0`;
      return `<tr><td style="padding:0 ${p.sidePadding || 24}px"><hr style="${hrStyle}" /></td></tr>`;
    }
    case "spacer":
      return `<tr><td style="height:${p.height || 32}px;line-height:${p.height || 32}px;font-size:1px">&nbsp;</td></tr>`;
    case "footer": {
      const style = `margin:0;font-size:${p.fontSize || 12}px;color:${p.color || "#9ca3af"};text-align:${p.align || "center"};line-height:1.6;font-family:Arial,sans-serif`;
      const content = (p.text || "").replace(/\n/g, "<br>");
      return `<tr><td style="${padStr}"><p style="${style}">${content}</p></td></tr>`;
    }
    case "columns": {
      const cellStyle = `font-size:${p.fontSize || 14}px;color:${p.color || "#374151"};font-family:Arial,sans-serif;line-height:1.6;vertical-align:top`;
      const left = (p.leftText || "").replace(/\n/g, "<br>");
      const right = (p.rightText || "").replace(/\n/g, "<br>");
      return `<tr><td style="${padStr}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48%" style="${cellStyle};padding-right:12px">${left}</td><td width="4%" style="min-width:24px"></td><td width="48%" style="${cellStyle};padding-left:12px">${right}</td></tr></table></td></tr>`;
    }
    default: return "";
  }
}

function bodyToHtml(body) {
  const { backgroundColor = "#f4f4f4", containerBg = "#ffffff", containerWidth = 600, blocks = [] } = body || {};
  const blocksHtml = blocks.map(blockToHtml).filter(Boolean).join("\n");
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style type="text/css">body{margin:0;padding:0;background:${backgroundColor}}img{border:0;max-width:100%}table{border-collapse:collapse}</style></head>
<body style="margin:0;padding:0;background:${backgroundColor}">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:20px 10px">
<table width="${containerWidth}" cellpadding="0" cellspacing="0" border="0" bgcolor="${containerBg}" style="background:${containerBg};border-radius:8px;overflow:hidden">
${blocksHtml}
</table></td></tr></table></body></html>`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const pub = status === "published";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      color: pub ? C.green : C.amber,
      background: pub ? C.greenBg : C.amberBg,
      border: `1px solid ${pub ? C.greenBdr : C.amberBdr}`,
      display: "inline-block", whiteSpace: "nowrap",
    }}>
      {pub ? "Published" : "Draft"}
    </span>
  );
}

// ─── Mini block renderer (for card previews) ──────────────────────────────────
const EMAIL_W = 560;

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
            <div style={{ height: 80, background: C.border, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>Image</div>
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
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.leftText || ""}</div>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.rightText || ""}</div>
        </div>
      );
    default:
      return null;
  }
}

// ─── Mini email preview (scaled card thumbnail) ───────────────────────────────
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

  const blocks  = template.body?.blocks || [];
  const emailBg = template.body?.containerBg || "#ffffff";
  const pageBg  = template.body?.backgroundColor || "#f4f4f4";
  const scale   = w / EMAIL_W;

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: pageBg }}>
      {blocks.length > 0 ? (
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: EMAIL_W, background: emailBg,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          pointerEvents: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {blocks.map(b => <MiniBlock key={b.id} block={b} />)}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: C.card }}>
          <TypeIcon size={28} color={C.muted} strokeWidth={1.5} />
          <span style={{ fontSize: 12, color: C.muted }}>No content yet</span>
        </div>
      )}
    </div>
  );
}

// ─── Modal utilities ──────────────────────────────────────────────────────────
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
    primary:  { bg: C.accent,  color: "#fff",   bdr: "none" },
    ghost:    { bg: C.bg,      color: C.sub,    bdr: `1px solid ${C.border}` },
    danger:   { bg: C.red,     color: "#fff",   bdr: "none" },
    disabled: { bg: C.bg,      color: C.muted,  bdr: `1px solid ${C.border}` },
  };
  const s = V[variant] || V.primary;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 1, background: s.bg, border: s.bdr, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: s.color, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────
function DeleteModal({ template, onConfirm, onCancel, busy }) {
  return (
    <ModalBackdrop onClose={onCancel}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Delete template</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>
        Are you sure you want to delete <strong style={{ color: C.text }}>{template.name}</strong>? This cannot be undone.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <MBtn onClick={onCancel} variant="ghost" disabled={busy}>Cancel</MBtn>
        <MBtn onClick={onConfirm} variant="danger" disabled={busy}>{busy ? "Deleting…" : "Delete template"}</MBtn>
      </div>
    </ModalBackdrop>
  );
}

// ─── Rename modal ─────────────────────────────────────────────────────────────
function RenameModal({ template, onConfirm, onCancel }) {
  const [input, setInput] = useState(template.name);
  const canSave = input.trim() && input.trim() !== template.name;
  return (
    <ModalBackdrop onClose={onCancel}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Rename template</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 18 }}>Choose a new name for this template.</div>
      <input autoFocus value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && canSave) onConfirm(input.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder="Template name"
        style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <MBtn onClick={onCancel} variant="ghost">Cancel</MBtn>
        <MBtn onClick={() => canSave && onConfirm(input.trim())} disabled={!canSave} variant={canSave ? "primary" : "disabled"}>Rename</MBtn>
      </div>
    </ModalBackdrop>
  );
}

// ─── Details modal ────────────────────────────────────────────────────────────
function DetailsModal({ template, onClose, onEdit }) {
  const blocks = template.body?.blocks || [];
  const blockCounts = {};
  blocks.forEach(b => { blockCounts[b.type] = (blockCounts[b.type] || 0) + 1; });
  const blockSummary = Object.entries(blockCounts).map(([k, v]) => `${v} ${k}`).join(", ") || "None";

  const rows = [
    { label: "Subject", value: template.subject || "—" },
    { label: "Status",  value: <StatusBadge status={template.status} /> },
    { label: "Blocks",  value: `${blocks.length} (${blockSummary})` },
    { label: "Created", value: fmtDateTime(template.createdAt) },
    { label: "Updated", value: fmtDateTime(template.updatedAt) },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadowLg, width: "100%", maxWidth: 520, overflow: "hidden" }}>
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
          <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
            {rows.map(({ label, value }, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${C.borderSub}` : "none" }}>
                <div style={{ width: 72, flexShrink: 0, fontSize: 12, fontWeight: 600, color: C.muted }}>{label}</div>
                <div style={{ fontSize: 13, color: C.sub, flex: 1 }}>{value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { onEdit(); onClose(); }}
            style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Pencil size={13} /> Continue editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send test email modal ────────────────────────────────────────────────────
function SendTestModal({ template, onClose }) {
  const [email,   setEmail]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSend() {
    if (!valid || busy) return;
    setBusy(true); setError(null);
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px", boxShadow: C.shadowLg, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Send test email</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>Send <strong style={{ color: C.text }}>{template.name}</strong> to a test address.</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex", marginLeft: 12 }}>
            <X size={14} />
          </button>
        </div>
        {success ? (
          <div style={{ marginTop: 20, background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Email sent!</div>
            <div style={{ fontSize: 12, color: C.green, opacity: 0.8 }}>Test email delivered to {email.trim()}</div>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>Recipient email</label>
              <input autoFocus type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === "Enter" && valid && !busy) handleSend(); if (e.key === "Escape") onClose(); }}
                placeholder="you@example.com"
                style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1.5px solid ${error ? C.red : C.border}`, borderRadius: 9, padding: "10px 13px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit" }} />
              {error && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <MBtn onClick={onClose} variant="ghost">Cancel</MBtn>
              <button onClick={handleSend} disabled={!valid || busy}
                style={{ flex: 1, border: "none", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: valid && !busy ? C.accent : C.accentLo, color: valid && !busy ? "#fff" : "#a5b4fc", cursor: valid && !busy ? "pointer" : "not-allowed" }}>
                {busy ? <><LoaderCircle size={13} style={{ animation: "_tspin 0.8s linear infinite" }} /> Sending…</> : <><Send size={13} /> Send test</>}
              </button>
            </div>
          </>
        )}
        {success && (
          <button onClick={onClose} style={{ marginTop: 14, width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        )}
      </div>
    </div>
  );
}

// ─── Options dropdown ─────────────────────────────────────────────────────────
function OptionsDropdown({ template, onClose, onRename, onDetails, onPublish, onEdit, onDuplicate, onDeleteRequest, onSendTest }) {
  const isPub = template.status === "published";
  const items = [
    { label: "Continue editing",                   Icon: Pencil, action: () => { onEdit();          onClose(); } },
    { label: "View details",                       Icon: Info,   action: () => { onDetails();       onClose(); } },
    null,
    { label: isPub ? "Unpublish" : "Publish",      Icon: Send,   action: () => { onPublish();       onClose(); } },
    ...(isPub ? [{ label: "Send test email", Icon: Send, action: () => { onSendTest(); onClose(); } }] : []),
    { label: "Rename template",                    Icon: Pencil, action: () => { onRename();        onClose(); } },
    { label: "Duplicate template",                 Icon: Copy,   action: () => { onDuplicate();     onClose(); } },
    null,
    { label: "Delete template", Icon: Trash2, action: () => { onDeleteRequest(); onClose(); }, danger: true },
  ];

  return (
    <div data-opts style={{ position: "absolute", top: 52, right: 10, zIndex: 600, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadowLg, minWidth: 205, overflow: "hidden", padding: "4px 0" }}
      onClick={e => e.stopPropagation()}>
      {items.map((item, i) => {
        if (!item) return <div key={`sep-${i}`} style={{ height: 1, background: C.borderSub, margin: "3px 0" }} />;
        return (
          <button key={item.label} onClick={item.action}
            style={{ width: "100%", background: "transparent", border: "none", padding: "9px 14px", fontSize: 13, color: item.danger ? C.red : C.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 9 }}
            onMouseEnter={e => { e.currentTarget.style.background = item.danger ? C.redBg : C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <item.Icon size={13} style={{ flexShrink: 0, color: item.danger ? C.red : C.muted }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ template, menuOpenId, onMenuToggle, onEdit, onDuplicate, onRename, onDetails, onPublish, onDeleteRequest, onSendTest }) {
  const isOpen = menuOpenId === template.id;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "visible", boxShadow: C.shadow, cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s, border-color 0.15s" }}
      onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.borderColor = "#cbd5e1"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow;   e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ margin: "12px 12px 0", borderRadius: 10, height: 224, overflow: "visible", position: "relative", border: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 9, overflow: "hidden" }}>
          <MiniEmailPreview template={template} />
        </div>
        <button data-opts onClick={e => { e.stopPropagation(); onMenuToggle(template.id); }}
          style={{ position: "absolute", top: 10, right: 10, background: `${C.card}ee`, backdropFilter: "blur(8px)", border: `1px solid ${C.border}`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.35)" }}>
          <MoreHorizontal size={15} color={C.sub} />
        </button>
        {isOpen && (
          <OptionsDropdown template={template} onClose={() => onMenuToggle(null)} onEdit={onEdit}
            onDetails={onDetails} onPublish={onPublish} onRename={onRename}
            onDuplicate={onDuplicate} onDeleteRequest={onDeleteRequest} onSendTest={onSendTest} />
        )}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.name}</div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slugify(template.name)}</div>
          </div>
          <StatusBadge status={template.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Builder prop editor primitives ──────────────────────────────────────────
function PropLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{children}</div>;
}

function TxtInput({ value, onChange, placeholder, multiline }) {
  const style = { width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit", resize: multiline ? "vertical" : "none" };
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={style} />;
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />;
}

function NumInput({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="number" value={value} min={min} max={max} onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }} />
      {unit && <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{unit}</span>}
    </div>
  );
}

function ColInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 28, border: `1px solid ${C.border}`, borderRadius: 4, padding: 2, cursor: "pointer", flexShrink: 0, background: "none" }} />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="#000000"
        style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "monospace" }} />
    </div>
  );
}

function AlignBtns({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {["left", "center", "right"].map(a => (
        <button key={a} onClick={() => onChange(a)}
          style={{ flex: 1, background: value === a ? C.accent : C.bg, border: `1px solid ${value === a ? C.accent : C.border}`, borderRadius: 6, padding: "5px 0", cursor: "pointer", color: value === a ? "#fff" : C.sub, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {a === "left" ? <AlignLeft size={13} /> : a === "center" ? <AlignCenter size={13} /> : <AlignRight size={13} />}
        </button>
      ))}
    </div>
  );
}

function PadInput({ value = {}, onChange }) {
  const pad = { top: 0, right: 0, bottom: 0, left: 0, ...value };
  const set = (k, v) => onChange({ ...pad, [k]: v });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
      {["top", "right", "bottom", "left"].map(k => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: C.muted, width: 28, flexShrink: 0 }}>{k[0].toUpperCase()}</span>
          <input type="number" value={pad[k]} min={0} onChange={e => set(k, Number(e.target.value))}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 6px", fontSize: 11, color: C.text, outline: "none", fontFamily: "inherit" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Block property editor ────────────────────────────────────────────────────
function BlockEditor({ block, onChange }) {
  const { type, props: p } = block;
  const set = (k, v) => onChange({ ...p, [k]: v });
  const setPad = v => set("padding", v);

  switch (type) {
    case "heading":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Text</PropLabel><TxtInput value={p.text || ""} onChange={v => set("text", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 28} onChange={v => set("fontSize", v)} min={10} max={72} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#111827"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel><AlignBtns value={p.align || "center"} onChange={v => set("align", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Level</PropLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {["h1", "h2", "h3"].map(l => (
                <button key={l} onClick={() => set("level", l)}
                  style={{ flex: 1, background: (p.level || "h2") === l ? C.accent : C.bg, border: `1px solid ${(p.level || "h2") === l ? C.accent : C.border}`, borderRadius: 6, padding: "5px 0", cursor: "pointer", color: (p.level || "h2") === l ? "#fff" : C.sub, fontSize: 11, fontWeight: 600 }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "text":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Text</PropLabel><TxtInput value={p.text || ""} onChange={v => set("text", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 15} onChange={v => set("fontSize", v)} min={10} max={48} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#374151"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel><AlignBtns value={p.align || "left"} onChange={v => set("align", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "image":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Image URL</PropLabel><TxtInput value={p.src || ""} onChange={v => set("src", v)} placeholder="https://..." /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Alt Text</PropLabel><TxtInput value={p.alt || ""} onChange={v => set("alt", v)} placeholder="Image description" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Width</PropLabel><NumInput value={p.width || 100} onChange={v => set("width", v)} min={10} max={100} unit="%" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Border Radius</PropLabel><NumInput value={p.borderRadius || 0} onChange={v => set("borderRadius", v)} min={0} max={50} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel><AlignBtns value={p.align || "center"} onChange={v => set("align", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "button":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Label</PropLabel><TxtInput value={p.label || ""} onChange={v => set("label", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>URL</PropLabel><TxtInput value={p.url || ""} onChange={v => set("url", v)} placeholder="https://..." /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Button Color</PropLabel><ColInput value={p.bgColor || "#6366f1"} onChange={v => set("bgColor", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Text Color</PropLabel><ColInput value={p.textColor || "#ffffff"} onChange={v => set("textColor", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 14} onChange={v => set("fontSize", v)} min={10} max={24} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Border Radius</PropLabel><NumInput value={p.borderRadius || 6} onChange={v => set("borderRadius", v)} min={0} max={50} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel><AlignBtns value={p.align || "center"} onChange={v => set("align", v)} /></div>
        </>
      );
    case "divider":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#e5e7eb"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Thickness</PropLabel><NumInput value={p.thickness || 1} onChange={v => set("thickness", v)} min={1} max={10} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Top Spacing</PropLabel><NumInput value={p.marginTop || 8} onChange={v => set("marginTop", v)} min={0} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Bottom Spacing</PropLabel><NumInput value={p.marginBottom || 8} onChange={v => set("marginBottom", v)} min={0} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Side Padding</PropLabel><NumInput value={p.sidePadding || 24} onChange={v => set("sidePadding", v)} min={0} unit="px" /></div>
        </>
      );
    case "spacer":
      return <div style={{ marginBottom: 12 }}><PropLabel>Height</PropLabel><NumInput value={p.height || 32} onChange={v => set("height", v)} min={4} max={200} unit="px" /></div>;
    case "footer":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Text</PropLabel><TxtInput value={p.text || ""} onChange={v => set("text", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 12} onChange={v => set("fontSize", v)} min={8} max={18} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#9ca3af"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel><AlignBtns value={p.align || "center"} onChange={v => set("align", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "columns":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Left Column</PropLabel><TxtInput value={p.leftText || ""} onChange={v => set("leftText", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Right Column</PropLabel><TxtInput value={p.rightText || ""} onChange={v => set("rightText", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 14} onChange={v => set("fontSize", v)} min={10} max={24} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#374151"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    default:
      return <div style={{ fontSize: 12, color: C.muted }}>No properties available.</div>;
  }
}

// ─── Canvas block (draggable, interactive) ────────────────────────────────────
function CanvasBlock({ block, selected, isFirst, isLast, isDragOver, onSelect, onDelete, onMoveUp, onMoveDown, onDuplicate, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(); }}
      onDrop={e => { e.stopPropagation(); onDrop(); }}
      onDragEnd={onDragEnd}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        outline: selected ? `2px solid ${C.accent}` : hovered ? `1px dashed ${C.accent}60` : "none",
        outlineOffset: -1,
        cursor: "pointer",
        background: isDragOver ? `${C.accentLo}` : "transparent",
        transition: "outline 0.1s, background 0.1s",
      }}
    >
      <MiniBlock block={block} />

      {(hovered || selected) && (
        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 2, zIndex: 20, background: `${C.card}f0`, backdropFilter: "blur(4px)", borderRadius: 7, border: `1px solid ${C.border}`, padding: "3px 4px", boxShadow: C.shadow }}>
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} title="Move up"
            style={{ background: "none", border: "none", cursor: isFirst ? "not-allowed" : "pointer", padding: "2px 4px", color: isFirst ? C.muted : C.sub, display: "flex", alignItems: "center" }}>
            <ChevronUp size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} title="Move down"
            style={{ background: "none", border: "none", cursor: isLast ? "not-allowed" : "pointer", padding: "2px 4px", color: isLast ? C.muted : C.sub, display: "flex", alignItems: "center" }}>
            <ChevronDown size={12} />
          </button>
          <div style={{ width: 1, background: C.border, margin: "2px 2px" }} />
          <button onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicate"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.sub, display: "flex", alignItems: "center" }}>
            <Copy size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.red, display: "flex", alignItems: "center" }}>
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {selected && (
        <div style={{ position: "absolute", top: "50%", left: -18, transform: "translateY(-50%)", cursor: "grab", color: C.muted }}>
          <GripVertical size={14} />
        </div>
      )}
    </div>
  );
}

// ─── Email builder view ───────────────────────────────────────────────────────
function EmailBuilder({ templateId, onBack, onSaved }) {
  const [name,       setName]       = useState("Untitled Template");
  const [subject,    setSubject]    = useState("");
  const [blocks,     setBlocks]     = useState(DEFAULT_BLOCKS);
  const [settings,   setSettings]   = useState({ backgroundColor: "#f4f4f4", containerBg: "#ffffff", containerWidth: 600 });
  const [from,       setFrom]       = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [saveStatus,   setSaveStatus]   = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [tid,          setTid]          = useState(templateId || null);
  const [loading,    setLoading]    = useState(!!templateId);
  const [domains,    setDomains]    = useState([]);
  const [fromOpen,   setFromOpen]   = useState(false);
  const [dragIdx,    setDragIdx]    = useState(null);
  const [dropIdx,    setDropIdx]    = useState(null);
  const [editingName, setEditingName] = useState(false);
  const fromRef = useRef(null);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  useEffect(() => {
    if (templateId) {
      setLoading(true);
      store.getTemplateById(templateId).then(t => {
        setName(t.name || "Untitled Template");
        setSubject(t.subject || "");
        const body = t.body || {};
        setBlocks(body.blocks?.length ? body.blocks : [...DEFAULT_BLOCKS]);
        setSettings({ backgroundColor: body.backgroundColor || "#f4f4f4", containerBg: body.containerBg || "#ffffff", containerWidth: body.containerWidth || 600 });
        setFrom(body.from || "");
        setTid(templateId);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [templateId]);

  useEffect(() => {
    store.getDomains().then(d => {
      if (Array.isArray(d)) {
        const verified = d.filter(x => x.status === "verified");
        setDomains(verified);
        // Auto-select first verified domain if no from is set yet
        if (!templateId && verified.length > 0 && !from) {
          const first = verified[0];
          setFrom(first.defaultFromEmail || `noreply@${first.domainName}`);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handle(e) {
      if (fromRef.current && !fromRef.current.contains(e.target)) setFromOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function buildBody() {
    return { version: 1, ...settings, from, blocks };
  }

  async function handleSave(extra = {}) {
    setPublishError(null);

    // Block publish if no verified domain — auto-save as draft instead
    let blockedPublish = false;
    if (extra.status === "published" && domains.length === 0) {
      blockedPublish = true;
      setPublishError("No verified domain found. Go to Domains → verify a domain first.");
      extra = { ...extra, status: "draft" };
    }

    setSaving(true); setSaveStatus(null);
    const body = buildBody();
    const htmlOutput = bodyToHtml(body);
    const payload = { name, subject, body, htmlOutput, ...extra };
    try {
      if (tid) {
        await store.updateTemplate(tid, payload);
      } else {
        const created = await store.createTemplate(payload);
        setTid(created.id);
      }
      if (blockedPublish) {
        setSaveStatus("draft");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("saved");
        onSaved?.();
        setTimeout(() => setSaveStatus(null), 2500);
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function addBlock(type) {
    const nb = { id: generateId(), type, props: { ...BLOCK_DEFAULTS[type] } };
    setBlocks(p => [...p, nb]);
    setSelectedId(nb.id);
  }

  function updateBlock(id, newProps) {
    setBlocks(p => p.map(b => b.id === id ? { ...b, props: newProps } : b));
  }

  function deleteBlock(id) {
    setBlocks(p => p.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const copy = { ...blocks[idx], id: generateId() };
    setBlocks(p => { const n = [...p]; n.splice(idx + 1, 0, copy); return n; });
    setSelectedId(copy.id);
  }

  function moveBlock(id, dir) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const next = [...blocks];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  }

  function handleDrop(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDropIdx(null); return; }
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      const adj = dragIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(adj, 0, moved);
      return next;
    });
    setDragIdx(null); setDropIdx(null);
  }

  if (loading) {
    return (
      <div style={{ position: "fixed", top: 50, left: 0, right: 0, bottom: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
        <LoaderCircle size={28} color={C.accent} style={{ animation: "_tspin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", top: 50, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'Inter','DM Sans',system-ui,sans-serif", zIndex: 500, overflow: "hidden" }}>
      <style>{`@keyframes _tspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input::placeholder{color:#94a3b8!important}textarea::placeholder{color:#94a3b8!important}textarea{font-family:inherit}`}</style>

      {/* Top bar */}
      <div style={{ height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0, zIndex: 10 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.sub, fontSize: 13, padding: "5px 8px", borderRadius: 7, fontFamily: "inherit" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
          <ChevronLeft size={14} /> Templates
        </button>
        <div style={{ width: 1, height: 20, background: C.border }} />

        {/* Editable template name */}
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
            style={{ fontSize: 14, fontWeight: 700, color: C.text, background: "none", border: `1.5px solid ${C.accent}`, borderRadius: 7, padding: "3px 9px", outline: "none", fontFamily: "inherit", minWidth: 160 }} />
        ) : (
          <button onClick={() => setEditingName(true)}
            style={{ fontSize: 14, fontWeight: 700, color: C.text, background: "none", border: "none", cursor: "pointer", padding: "3px 7px", borderRadius: 7, fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
            {name}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {saveStatus === "saved" && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Saved</span>}
        {saveStatus === "draft" && <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>Saved as draft</span>}
        {saveStatus === "error" && <span style={{ fontSize: 12, color: C.red,   fontWeight: 600 }}>Save failed</span>}

        <button onClick={() => handleSave({ status: "draft" })} disabled={saving}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: C.sub, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, opacity: saving ? 0.7 : 1 }}>
          Save draft
        </button>
        <button onClick={() => handleSave({ status: "published" })} disabled={saving}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "6px 18px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(99,102,241,0.28)", opacity: saving ? 0.7 : 1 }}>
          {saving ? <><LoaderCircle size={13} style={{ animation: "_tspin 0.8s linear infinite" }} /> Saving…</> : <><Send size={13} /> Publish</>}
        </button>
      </div>

      {/* Publish-blocked banner */}
      {publishError && (
        <div style={{ background: C.amberBg, borderBottom: `1px solid ${C.amberBdr}`, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, zIndex: 9 }}>
          <span style={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>{publishError}</span>
          <button onClick={() => setPublishError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.amber, display: "flex", padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Builder body: left palette | center canvas | right settings */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Component palette */}
        <div style={{ width: 158, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px 8px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>
            Components
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
            {BLOCK_TYPES.map(({ type, label, desc }) => (
              <button key={type} onClick={() => addBlock(type)}
                style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "background 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.accentLo; e.currentTarget.style.borderColor = C.accent + "60"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ width: 26, height: 26, background: C.bg, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: C.sub, fontWeight: 700 }}>
                  {type === "heading" ? "T" : type === "text" ? "¶" : type === "image" ? "⊡" : type === "button" ? "▣" : type === "columns" ? "⊟" : type === "divider" ? "—" : type === "spacer" ? "↕" : "≡"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.3 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding: "8px 10px", fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, textAlign: "center", lineHeight: 1.4 }}>
            Click to add · Drag to reorder
          </div>
        </div>

        {/* Center: Canvas */}
        <div style={{ flex: 1, overflowY: "auto", background: "#0d0f15", display: "flex", flexDirection: "column", alignItems: "center" }}
          onClick={() => setSelectedId(null)}>
          <div style={{ width: Math.min(settings.containerWidth + 80, 800), maxWidth: "100%", padding: "24px 40px" }}>

            {/* FROM / SUBJECT row */}
            <div ref={fromRef} style={{ background: C.surface, borderRadius: "12px 12px 0 0", border: `1px solid ${C.border}`, borderBottom: "none", position: "relative" }}>
              {/* From row — clickable dropdown trigger */}
              <div
                onClick={() => domains.length > 0 && setFromOpen(p => !p)}
                style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, padding: "0 16px", minHeight: 42, cursor: domains.length > 0 ? "pointer" : "default" }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, width: 56, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>From</span>
                <span style={{ flex: 1, fontSize: 13, color: from ? C.text : C.muted, padding: "10px 0" }}>
                  {from || (domains.length === 0 ? "No verified domains" : "Select sending domain…")}
                </span>
                {domains.length > 0 && <ChevronDown size={12} color={C.muted} style={{ transform: fromOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />}
              </div>

              {/* From dropdown */}
              {fromOpen && domains.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: "0 0 10px 10px", zIndex: 300, boxShadow: C.shadowMd, overflow: "hidden" }}>
                  {domains.map(d => {
                    const email = d.defaultFromEmail || `noreply@${d.domainName}`;
                    const active = from === email;
                    return (
                      <button
                        key={d.id}
                        onClick={() => { setFrom(email); setFromOpen(false); }}
                        style={{ width: "100%", background: active ? C.accentLo : "transparent", border: "none", padding: "10px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 1, borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.border + "40"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? C.accent : C.text }}>{email}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{d.domainName}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", padding: "0 16px", minHeight: 42 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, width: 56, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>Subject</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject line…"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: C.text, padding: "10px 0", fontFamily: "inherit" }} />
                <button style={{ background: C.accentLo, border: `1px solid ${C.accent}30`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.accent, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                  <TagIcon size={10} /> Tags
                </button>
              </div>
            </div>

            {/* Email body */}
            <div style={{ background: settings.containerBg, border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", minHeight: 200, overflow: "hidden" }}>
              {blocks.length === 0 ? (
                <div style={{ padding: "60px 24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                  Click a component on the left to add it here.
                </div>
              ) : (
                blocks.map((block, i) => (
                  <CanvasBlock
                    key={block.id}
                    block={block}
                    selected={selectedId === block.id}
                    isFirst={i === 0}
                    isLast={i === blocks.length - 1}
                    isDragOver={dropIdx === i}
                    onSelect={() => setSelectedId(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, "up")}
                    onMoveDown={() => moveBlock(block.id, "down")}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={() => setDropIdx(i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                  />
                ))
              )}
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 12 }}>
              {settings.containerWidth}px container · {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Right: Settings panel */}
        <div style={{ width: 256, background: C.surface, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {selectedBlock ? (
              <>
                <span style={{ textTransform: "capitalize" }}>{selectedBlock.type} Block</span>
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2 }}>
                  <X size={13} />
                </button>
              </>
            ) : "Template Settings"}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px" }}>
            {selectedBlock ? (
              <BlockEditor block={selectedBlock} onChange={newProps => updateBlock(selectedBlock.id, newProps)} />
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Colors</div>
                  <div style={{ marginBottom: 10 }}>
                    <PropLabel>Page Background</PropLabel>
                    <ColInput value={settings.backgroundColor} onChange={v => setSettings(p => ({ ...p, backgroundColor: v }))} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <PropLabel>Email Background</PropLabel>
                    <ColInput value={settings.containerBg} onChange={v => setSettings(p => ({ ...p, containerBg: v }))} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Layout</div>
                  <div style={{ marginBottom: 10 }}>
                    <PropLabel>Container Width</PropLabel>
                    <NumInput value={settings.containerWidth} onChange={v => setSettings(p => ({ ...p, containerWidth: v }))} min={320} max={900} unit="px" />
                  </div>
                </div>
                <div style={{ background: C.greenBg, border: `1px solid ${C.greenBdr}`, borderRadius: 9, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}>{"{"+"x"+"}"} Dynamic Variables</div>
                  <div style={{ fontSize: 11, color: C.green, lineHeight: 1.6 }}>
                    Use <code style={{ background: "rgba(22,163,74,0.12)", padding: "1px 4px", borderRadius: 3 }}>{"{{firstName}}"}</code>, <code style={{ background: "rgba(22,163,74,0.12)", padding: "1px 4px", borderRadius: 3 }}>{"{{company}}"}</code>, or any <code style={{ background: "rgba(22,163,74,0.12)", padding: "1px 4px", borderRadius: 3 }}>{"{{variable}}"}</code> inside your text blocks for personalization.
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
                  Select a block on the canvas to edit its properties.
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Filter options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all",       label: "All Statuses" },
  { value: "draft",     label: "Draft" },
  { value: "published", label: "Published" },
];

// ─── Template list ────────────────────────────────────────────────────────────
function TemplateList({ onOpenBuilder }) {
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
          <button onClick={load} disabled={loading}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: C.sub, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.65 : 1 }}>
            <RefreshCw size={14} style={loading ? { animation: "_tspin 0.8s linear infinite" } : {}} />
            Refresh
          </button>
          <button onClick={() => onOpenBuilder(null)}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}>
            <Plus size={15} /> New builder
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color={C.muted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box", boxShadow: C.shadow }} />
        </div>
        <div ref={statusRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setStatusDropOpen(p => !p)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, minWidth: 148, boxShadow: C.shadow }}>
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
            <button onClick={() => onOpenBuilder(null)}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}>
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
              onEdit={() => onOpenBuilder(t.id)}
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
        <DeleteModal template={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} busy={deleting} />
      )}
      {renameTarget && (
        <RenameModal template={renameTarget} onConfirm={n => handleRename(renameTarget, n)} onCancel={() => setRenameTarget(null)} />
      )}
      {detailsTarget && (
        <DetailsModal template={detailsTarget} onClose={() => setDetailsTarget(null)} onEdit={() => { onOpenBuilder(detailsTarget.id); setDetailsTarget(null); }} />
      )}
      {sendTestTarget && (
        <SendTestModal template={sendTestTarget} onClose={() => setSendTestTarget(null)} />
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [view,      setView]      = useState("list");
  const [editingId, setEditingId] = useState(null);

  if (view === "builder") {
    return (
      <EmailBuilder
        templateId={editingId}
        onBack={() => setView("list")}
        onSaved={() => {}}
      />
    );
  }

  return (
    <TemplateList
      onOpenBuilder={id => { setEditingId(id || null); setView("builder"); }}
    />
  );
}
