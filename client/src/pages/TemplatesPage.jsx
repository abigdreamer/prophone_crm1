import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, ChevronDown, LoaderCircle,
  MoreHorizontal, Pencil, Send, Copy, Trash2, X,
  Type as TypeIcon, RefreshCw, ChevronLeft, ChevronUp,
  GripVertical, Info, AlignLeft, AlignCenter, AlignRight,
  Tag as TagIcon, Eye, Download, Upload, Code2,
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
  { type: "heading",   label: "Heading",    desc: "Title or section header" },
  { type: "text",      label: "Text",       desc: "Body paragraph" },
  { type: "image",     label: "Image",      desc: "Image block" },
  { type: "button",    label: "Button",     desc: "Call-to-action" },
  { type: "columns",   label: "Columns",    desc: "Two-column layout" },
  { type: "divider",   label: "Divider",    desc: "Horizontal rule" },
  { type: "spacer",    label: "Spacer",     desc: "Vertical space" },
  { type: "footer",    label: "Footer",     desc: "Footer text" },
  { type: "link",      label: "Link",       desc: "Hyperlink / anchor" },
  { type: "slider",    label: "Slider",     desc: "Interactive rating slider" },
  { type: "quiz",      label: "Quiz",       desc: "Multiple choice question" },
  { type: "spin_wheel", label: "Spin Wheel", desc: "Spin-to-win game" },
  { type: "scratch",   label: "Scratch",    desc: "Scratch card reveal" },
  { type: "html_raw",  label: "Raw HTML",   desc: "Custom HTML block" },
];

const BLOCK_ICON = {
  heading: "T", text: "¶", image: "⊡", button: "▣", columns: "⊟",
  divider: "—", spacer: "↕", footer: "≡",
  link: "⇗", slider: "≋", quiz: "?", spin_wheel: "◎", scratch: "✦", html_raw: "<>",
};

const BLOCK_DEFAULTS = {
  heading:    { text: "Welcome!", level: "h2", fontSize: 28, fontWeight: 700, color: "#111827", align: "center", padding: { top: 24, right: 24, bottom: 8, left: 24 } },
  text:       { text: "Write your email body text here. Keep it concise and engaging.", fontSize: 15, color: "#374151", align: "left", lineHeight: 1.6, padding: { top: 8, right: 24, bottom: 8, left: 24 } },
  image:      { src: "", alt: "", width: 100, borderRadius: 0, align: "center", padding: { top: 8, right: 0, bottom: 8, left: 0 } },
  button:     { label: "Click Here", url: "", bgColor: "#6366f1", textColor: "#ffffff", fontSize: 14, borderRadius: 6, align: "center" },
  columns:    { leftText: "Left column text", rightText: "Right column text", fontSize: 14, color: "#374151", padding: { top: 8, right: 24, bottom: 8, left: 24 } },
  divider:    { color: "#e5e7eb", thickness: 1, marginTop: 8, marginBottom: 8, sidePadding: 24 },
  spacer:     { height: 32 },
  footer:     { text: "© 2024 Your Company. All rights reserved.\nYou received this email because you opted in.", fontSize: 12, color: "#9ca3af", align: "center", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
  link:       { text: "Click here to learn more", url: "", color: "#6366f1", fontSize: 14, align: "center", underline: true, padding: { top: 8, right: 24, bottom: 8, left: 24 } },
  slider:     { title: "How interested are you?", min: 1, max: 10, step: 1, labels: { min: "Not interested", max: "Very interested" }, buttonText: "Submit", buttonUrl: "", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
  quiz:       { question: "Which service are you most interested in?", options: ["Option A", "Option B", "Option C"], buttonText: "Submit Answer", buttonUrl: "", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
  spin_wheel: { title: "Spin to Win!", prizes: ["10% Off", "Free Consult", "Gift Card", "20% Off", "Try Again", "30% Off"], buttonText: "Spin Now!", buttonUrl: "", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
  scratch:    { title: "Scratch to Reveal Your Offer", prize: "50% OFF", hint: "Use your mouse or finger to scratch!", buttonUrl: "", padding: { top: 16, right: 24, bottom: 16, left: 24 } },
  html_raw:   { html: "", padding: { top: 0, right: 0, bottom: 0, left: 0 } },
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
    case "link": {
      const linkStyle = `color:${p.color||"#6366f1"};font-size:${p.fontSize||14}px;text-decoration:${p.underline!==false?"underline":"none"};font-family:Arial,sans-serif;font-weight:600`;
      return `<tr><td style="${padStr};text-align:${p.align||"center"}"><a href="${p.url||"#"}" style="${linkStyle}" target="_blank">${esc(p.text||"Click here")}</a></td></tr>`;
    }
    case "slider": {
      const href = p.buttonUrl || `{{INTERACT_URL_${block.id}}}`;
      const titleStyle = `margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;text-align:center;font-family:Arial,sans-serif`;
      const btnStyle = `display:inline-block;padding:12px 28px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif`;
      return `<tr><td style="${padStr}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><p style="${titleStyle}">${esc(p.title || "Rate your experience")}</p></td></tr><tr><td align="center"><a href="${href}" style="${btnStyle}">${esc(p.buttonText || "Rate Now")} →</a></td></tr></table></td></tr>`;
    }
    case "quiz": {
      const href = p.buttonUrl || `{{INTERACT_URL_${block.id}}}`;
      const titleStyle = `margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;text-align:center;font-family:Arial,sans-serif`;
      const btnStyle = `display:inline-block;padding:12px 28px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif`;
      return `<tr><td style="${padStr}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><p style="${titleStyle}">${esc(p.question || "Quick question for you")}</p></td></tr><tr><td align="center"><a href="${href}" style="${btnStyle}">${esc(p.buttonText || "Answer Now")} →</a></td></tr></table></td></tr>`;
    }
    case "spin_wheel": {
      const href = p.buttonUrl || `{{INTERACT_URL_${block.id}}}`;
      const titleStyle = `margin:0 0 12px;font-size:18px;font-weight:800;color:#1e293b;text-align:center;font-family:Arial,sans-serif`;
      const btnStyle = `display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif`;
      return `<tr><td style="${padStr}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><p style="${titleStyle}">🎡 ${esc(p.title || "Spin to Win!")}</p></td></tr><tr><td align="center"><a href="${href}" style="${btnStyle}">${esc(p.buttonText || "Spin Now!")} →</a></td></tr></table></td></tr>`;
    }
    case "scratch": {
      const href = p.buttonUrl || `{{INTERACT_URL_${block.id}}}`;
      const titleStyle = `margin:0 0 12px;font-size:18px;font-weight:800;color:#1e293b;text-align:center;font-family:Arial,sans-serif`;
      const btnStyle = `display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif`;
      return `<tr><td style="${padStr}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><p style="${titleStyle}">✦ ${esc(p.title || "Scratch to Reveal!")}</p></td></tr><tr><td align="center"><a href="${href}" style="${btnStyle}">${esc(p.hint || "Scratch Now")} →</a></td></tr></table></td></tr>`;
    }
    case "html_raw":
      return `<tr><td>${p.html || ""}</td></tr>`;
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
    case "link":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, textAlign: p.align || "center" }}>
          <a href={p.url || "#"} style={{ color: p.color || "#6366f1", fontSize: p.fontSize || 14, textDecoration: p.underline !== false ? "underline" : "none", fontWeight: 600 }}
            onClick={e => e.preventDefault()}>
            {p.text || "Click here"}
          </a>
        </div>
      );
    case "slider":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
            {p.title || "Rate your experience"}
          </p>
          <div style={{ background: "#f8fafc", border: "1.5px dashed #c7d2fe", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
              <span>{p.labels?.min || (p.min ?? 1)}</span>
              <span style={{ fontWeight: 700, color: "#6366f1", fontSize: 16 }}>{p.min ?? 1}</span>
              <span>{p.labels?.max || (p.max ?? 10)}</span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ width: "30%", height: "100%", background: "#6366f1", borderRadius: 99 }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 12, background: "#6366f1", color: "#fff", padding: "5px 16px", borderRadius: 8, fontWeight: 700 }}>
                {p.buttonText || "Submit"}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 6 }}>⚡ Interactive — personalized per contact</div>
        </div>
      );
    case "quiz":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
            {p.question || "Which best describes you?"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {(p.options || ["Option A", "Option B"]).slice(0, 3).map((opt, i) => (
              <div key={i} style={{ padding: "6px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, border: "2px solid #94a3b8", borderRadius: "50%", flexShrink: 0 }} />
                {opt}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#94a3b8" }}>⚡ Interactive — personalized per contact</div>
        </div>
      );
    case "spin_wheel":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
            🎡 {p.title || "Spin to Win!"}
          </p>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "conic-gradient(#6366f1 0deg 60deg,#ec4899 60deg 120deg,#f59e0b 120deg 180deg,#22c55e 180deg 240deg,#ef4444 240deg 300deg,#3b82f6 300deg 360deg)", margin: "0 auto 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }} />
          <span style={{ fontSize: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", padding: "5px 14px", borderRadius: 8, fontWeight: 700 }}>
            {p.buttonText || "Spin Now!"}
          </span>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8 }}>⚡ Interactive — personalized per contact</div>
        </div>
      );
    case "scratch":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
            ✦ {p.title || "Scratch to Reveal!"}
          </p>
          <div style={{ width: 110, height: 56, borderRadius: 10, background: "repeating-linear-gradient(45deg,#94a3b8,#94a3b8 4px,#cbd5e1 4px,#cbd5e1 8px)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Scratch here ✦</span>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>⚡ Interactive — personalized per contact</div>
        </div>
      );
    case "html_raw":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          {p.html ? <HtmlRawPreview html={p.html} /> : (
            <div style={{ background: "#f8fafc", border: "1.5px dashed #94a3b8", borderRadius: 8, padding: "14px 16px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>〈/〉</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Custom HTML Block — empty</div>
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

// Renders imported HTML inline via auto-sizing iframe (no JS, read-only)
function HtmlRawPreview({ html }) {
  const ref = useRef(null);
  const [h, setH] = useState(120);
  function onLoad() {
    try {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const height = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0);
      if (height > 20) setH(height);
    } catch (_) {}
  }
  return (
    <iframe
      ref={ref}
      srcDoc={html}
      onLoad={onLoad}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{ width: "100%", height: h, border: "none", display: "block", pointerEvents: "none" }}
    />
  );
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
      await store.sendTestEmail(template.id, email.trim());
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
    case "link":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Link Text</PropLabel><TxtInput value={p.text || ""} onChange={v => set("text", v)} placeholder="Click here to learn more" /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>URL</PropLabel>
            <input
              value={p.url || ""}
              onChange={e => set("url", e.target.value)}
              placeholder="https://example.com"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Color</PropLabel><ColInput value={p.color || "#6366f1"} onChange={v => set("color", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Font Size</PropLabel><NumInput value={p.fontSize || 14} onChange={v => set("fontSize", v)} min={10} max={36} unit="px" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Align</PropLabel>
            <div style={{ display: "flex", gap: 4 }}>
              {["left","center","right"].map(a => (
                <button key={a} onClick={() => set("align", a)}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `1px solid ${p.align===a ? C.accent : C.border}`, background: p.align===a ? C.accentLo : C.surface, color: p.align===a ? C.accent : C.sub, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={p.underline !== false} onChange={e => set("underline", e.target.checked)}
                style={{ accentColor: C.accent, width: 14, height: 14 }} />
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Underline</span>
            </label>
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "slider":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Title</PropLabel><TxtInput value={p.title || ""} onChange={v => set("title", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Min Value</PropLabel><NumInput value={p.min ?? 1} onChange={v => set("min", v)} min={0} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Max Value</PropLabel><NumInput value={p.max ?? 10} onChange={v => set("max", v)} max={100} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Step</PropLabel><NumInput value={p.step ?? 1} onChange={v => set("step", v)} min={1} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Min Label</PropLabel><TxtInput value={p.labels?.min || ""} onChange={v => set("labels", { ...(p.labels || {}), min: v })} placeholder="e.g. Not interested" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Max Label</PropLabel><TxtInput value={p.labels?.max || ""} onChange={v => set("labels", { ...(p.labels || {}), max: v })} placeholder="e.g. Very interested" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Button Text</PropLabel><TxtInput value={p.buttonText || "Submit"} onChange={v => set("buttonText", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Button Link (URL)</PropLabel>
            <input value={p.buttonUrl || ""} onChange={e => set("buttonUrl", e.target.value)} placeholder="https://… (leave blank for interactive page)"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }} />
            {p.buttonUrl && <div style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Custom URL set — interactive session tracking bypassed</div>}
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "quiz":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Question</PropLabel><TxtInput value={p.question || ""} onChange={v => set("question", v)} multiline /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Options (one per line)</PropLabel>
            <TxtInput value={(p.options || []).join("\n")} onChange={v => set("options", v.split("\n"))} multiline />
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Button Text</PropLabel><TxtInput value={p.buttonText || "Submit Answer"} onChange={v => set("buttonText", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Button Link (URL)</PropLabel>
            <input value={p.buttonUrl || ""} onChange={e => set("buttonUrl", e.target.value)} placeholder="https://… (leave blank for interactive page)"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }} />
            {p.buttonUrl && <div style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Custom URL set — interactive session tracking bypassed</div>}
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "spin_wheel":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Title</PropLabel><TxtInput value={p.title || ""} onChange={v => set("title", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Prizes (one per line)</PropLabel>
            <TxtInput value={(p.prizes || []).join("\n")} onChange={v => set("prizes", v.split("\n").filter(Boolean))} multiline />
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Button Text</PropLabel><TxtInput value={p.buttonText || "Spin Now!"} onChange={v => set("buttonText", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Button Link (URL)</PropLabel>
            <input value={p.buttonUrl || ""} onChange={e => set("buttonUrl", e.target.value)} placeholder="https://… (leave blank for interactive page)"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }} />
            {p.buttonUrl && <div style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Custom URL set — interactive session tracking bypassed</div>}
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "scratch":
      return (
        <>
          <div style={{ marginBottom: 12 }}><PropLabel>Title</PropLabel><TxtInput value={p.title || ""} onChange={v => set("title", v)} /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Prize Text</PropLabel><TxtInput value={p.prize || ""} onChange={v => set("prize", v)} placeholder="e.g. 50% OFF" /></div>
          <div style={{ marginBottom: 12 }}><PropLabel>Hint Text</PropLabel><TxtInput value={p.hint || ""} onChange={v => set("hint", v)} /></div>
          <div style={{ marginBottom: 12 }}>
            <PropLabel>Button Link (URL)</PropLabel>
            <input value={p.buttonUrl || ""} onChange={e => set("buttonUrl", e.target.value)} placeholder="https://… (leave blank for interactive page)"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit" }} />
            {p.buttonUrl && <div style={{ fontSize: 10, color: C.amber, marginTop: 4 }}>⚠ Custom URL set — interactive session tracking bypassed</div>}
          </div>
          <div style={{ marginBottom: 12 }}><PropLabel>Padding</PropLabel><PadInput value={p.padding} onChange={setPad} /></div>
        </>
      );
    case "html_raw":
      return (
        <>
          <div style={{ marginBottom: 8 }}>
            <PropLabel>HTML Content</PropLabel>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
              Paste valid email HTML. Inserted as-is into the email.
            </div>
            <textarea
              value={p.html || ""}
              onChange={e => set("html", e.target.value)}
              placeholder="<div>Your HTML here…</div>"
              rows={8}
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, color: C.text, outline: "none", fontFamily: "monospace", resize: "vertical" }}
            />
          </div>
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

// ─── Inline preview — per-block interactive HTML generators ───────────────────
function sliderPreviewHtml(p) {
  const min = p.min ?? 1, max = p.max ?? 10, step = p.step ?? 1;
  const mid = Math.round((min + max) / 2);
  const esc = s => String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:#fff;padding:20px 24px}h2{font-size:16px;font-weight:800;color:#1e293b;text-align:center;margin-bottom:16px}.labels{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:6px}.val{font-size:30px;font-weight:800;color:#6366f1;text-align:center;margin-bottom:10px}input[type=range]{width:100%;accent-color:#6366f1;cursor:pointer;margin-bottom:16px}button{background:#6366f1;color:#fff;border:none;padding:11px 0;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%}.badge{font-size:10px;color:#94a3b8;margin-top:10px;text-align:center;background:#f8fafc;padding:5px;border-radius:6px}</style></head><body><h2>${esc(p.title||"Rate your experience")}</h2><div class="labels"><span>${esc(p.labels?.min||String(min))}</span><span>${esc(p.labels?.max||String(max))}</span></div><div class="val" id="v">${mid}</div><input type="range" id="s" min="${min}" max="${max}" step="${step}" value="${mid}"><button onclick="go()">${esc(p.buttonText||"Submit")}</button><div class="badge">⚡ Preview — interactions are simulated</div><script>var s=document.getElementById('s'),v=document.getElementById('v');s.oninput=function(){v.textContent=s.value};function go(){alert('Preview: You selected '+s.value+'. In the real email this updates lead score.')}</script></body></html>`;
}

function quizPreviewHtml(p) {
  const opts = Array.isArray(p.options) ? p.options : ["Option A","Option B","Option C"];
  const esc = s => String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const optHtml = opts.map((o,i)=>`<label class="opt"><input type="radio" name="q" value="${i}"><span>${esc(o)}</span></label>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:#fff;padding:20px 24px}h2{font-size:16px;font-weight:800;color:#1e293b;text-align:center;margin-bottom:16px}.opt{display:flex;align-items:center;gap:10px;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;margin-bottom:8px;font-size:13px;color:#374151}.opt:has(input:checked){border-color:#6366f1;background:#f0f0ff}input[type=radio]{accent-color:#6366f1;width:15px;height:15px;flex-shrink:0}button{background:#6366f1;color:#fff;border:none;padding:11px 0;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%;margin-top:4px}.badge{font-size:10px;color:#94a3b8;margin-top:10px;text-align:center;background:#f8fafc;padding:5px;border-radius:6px}</style></head><body><h2>${esc(p.question||"Which best describes you?")}</h2>${optHtml}<button onclick="go()">${esc(p.buttonText||"Submit Answer")}</button><div class="badge">⚡ Preview — interactions are simulated</div><script>var opts=${JSON.stringify(opts)};function go(){var sel=document.querySelector('input[name=q]:checked');if(!sel){alert('Please select an option.');return}alert('Preview: You answered "'+opts[parseInt(sel.value)]+'". In the real email this is recorded.')}</script></body></html>`;
}

function spinWheelPreviewHtml(p) {
  const prizes = Array.isArray(p.prizes) ? p.prizes : ["10% Off","Free Consult","Gift Card","20% Off","Try Again","30% Off"];
  const colors = ["#6366f1","#ec4899","#f59e0b","#22c55e","#ef4444","#3b82f6","#8b5cf6","#06b6d4"];
  const esc = s => String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:#fff;padding:20px 24px;text-align:center}h2{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:16px}.wrap{position:relative;width:220px;height:220px;margin:0 auto 16px}.ptr{position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid #1e293b;z-index:10}canvas{border-radius:50%;box-shadow:0 4px 20px rgba(0,0,0,0.18)}button{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer}button:disabled{opacity:0.6;cursor:not-allowed}.badge{font-size:10px;color:#94a3b8;margin-top:12px;background:#f8fafc;padding:5px;border-radius:6px}</style></head><body><h2>🎡 ${esc(p.title||"Spin to Win!")}</h2><div class="wrap"><div class="ptr"></div><canvas id="c" width="220" height="220"></canvas></div><button id="btn" onclick="spin()">${esc(p.buttonText||"Spin Now!")}</button><div class="badge">⚡ Preview — interactions are simulated</div><script>var P=${JSON.stringify(prizes)},COL=${JSON.stringify(colors)},n=P.length,arc=2*Math.PI/n,rot=0,spinning=false;var cv=document.getElementById('c'),ctx=cv.getContext('2d');function draw(r){ctx.clearRect(0,0,220,220);for(var i=0;i<n;i++){ctx.beginPath();ctx.moveTo(110,110);ctx.arc(110,110,106,r+i*arc,r+(i+1)*arc);ctx.fillStyle=COL[i%COL.length];ctx.fill();ctx.save();ctx.translate(110,110);ctx.rotate(r+(i+0.5)*arc);ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.fillText(P[i].slice(0,12),98,4);ctx.restore()}ctx.beginPath();ctx.arc(110,110,13,0,2*Math.PI);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=2;ctx.stroke()}draw(0);function spin(){if(spinning)return;spinning=true;document.getElementById('btn').disabled=true;var total=(Math.PI*2*5)+(Math.random()*Math.PI*2),dur=4000,start=Date.now(),from=rot;function frame(){var t=Date.now()-start,prog=t/dur;if(prog>=1){prog=1;spinning=false;document.getElementById('btn').disabled=false;var idx=Math.floor(((from+total)%(Math.PI*2))/arc);var won=P[(n-1-idx%n+n)%n];setTimeout(function(){alert('Preview: You won "'+won+'"! In the real email this is recorded.')},200)}var ease=1-Math.pow(1-prog,3);rot=from+total*ease;draw(rot);if(prog<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}</script></body></html>`;
}

function scratchPreviewHtml(p) {
  const esc = s => String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:#fff;padding:20px 24px;text-align:center}h2{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:6px}p{font-size:12px;color:#64748b;margin-bottom:16px}.card{position:relative;width:200px;height:90px;margin:0 auto 14px;border-radius:12px;overflow:hidden}.prize{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#6366f1;background:linear-gradient(135deg,#ede9fe,#ddd6fe)}canvas{position:absolute;inset:0;cursor:crosshair;touch-action:none}.done{display:none;font-size:14px;font-weight:700;color:#22c55e;margin-top:8px}.badge{font-size:10px;color:#94a3b8;margin-top:10px;background:#f8fafc;padding:5px;border-radius:6px}</style></head><body><h2>✦ ${esc(p.title||"Scratch to Reveal!")}</h2><p>${esc(p.hint||"Use your mouse or finger to scratch!")}</p><div class="card"><div class="prize">${esc(p.prize||"🎁 OFFER")}</div><canvas id="c" width="200" height="90"></canvas></div><div class="done" id="done">🎉 Revealed! In the real email this is recorded.</div><div class="badge">⚡ Preview — interactions are simulated</div><script>var cv=document.getElementById('c'),ctx=cv.getContext('2d'),cnt=0,done=false;ctx.fillStyle='#94a3b8';ctx.fillRect(0,0,200,90);for(var i=0;i<200;i+=10)for(var j=0;j<90;j+=10){ctx.fillStyle=i%20===0?'#7c8d9e':'#8fa0b0';ctx.fillRect(i,j,8,8)}ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillText('Scratch here ✦',100,50);function sc(x,y){if(done)return;ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(x,y,16,0,2*Math.PI);ctx.fill();cnt++;if(cnt>20){done=true;document.getElementById('done').style.display='block'}}function pos(e,el){var r=el.getBoundingClientRect();if(e.touches)return{x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};return{x:e.clientX-r.left,y:e.clientY-r.top}}var drag=false;cv.addEventListener('mousedown',function(e){drag=true;var p=pos(e,cv);sc(p.x,p.y)});cv.addEventListener('mousemove',function(e){if(!drag)return;var p=pos(e,cv);sc(p.x,p.y)});cv.addEventListener('mouseup',function(){drag=false});cv.addEventListener('touchstart',function(e){e.preventDefault();var p=pos(e,cv);sc(p.x,p.y)},{passive:false});cv.addEventListener('touchmove',function(e){e.preventDefault();var p=pos(e,cv);sc(p.x,p.y)},{passive:false});</script></body></html>`;
}

// Renders one block in preview — interactive blocks get real iframe UI
function PreviewBlock({ block }) {
  const isInteractive = ["slider","quiz","spin_wheel","scratch"].includes(block.type);
  const iframeRef = useRef(null);
  const [iframeH, setIframeH] = useState(220);

  if (!isInteractive) return <MiniBlock block={block} />;

  const generators = { slider: sliderPreviewHtml, quiz: quizPreviewHtml, spin_wheel: spinWheelPreviewHtml, scratch: scratchPreviewHtml };
  const html = generators[block.type]?.(block.props || {}) || "";

  function handleLoad() {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const h = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0);
      if (h > 40) setIframeH(h + 8);
    } catch (_) {}
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      onLoad={handleLoad}
      sandbox="allow-scripts allow-same-origin allow-modals"
      style={{ width: "100%", height: iframeH, border: "none", display: "block" }}
    />
  );
}

// Inline preview — overlays the builder body (no separate page/modal)
function InlinePreview({ body, name, onClose }) {
  const [mode, setMode] = useState("desktop");
  const { blocks = [], backgroundColor = "#f4f4f4", containerBg = "#ffffff", containerWidth = 600 } = body || {};
  const previewW = mode === "mobile" ? 390 : containerWidth;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "#0d0f15", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ height: 46, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
        <Eye size={14} color={C.accent} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Preview</span>
        {name && <span style={{ fontSize: 11, color: C.muted }}>— {name}</span>}
        <div style={{ flex: 1 }} />

        {/* Device toggle */}
        <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, gap: 2 }}>
          {[["desktop","🖥 Desktop"],["mobile","📱 Mobile"]].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: "4px 13px", borderRadius: 6, border: "none", cursor: "pointer", background: mode === m ? C.accent : "transparent", color: mode === m ? "#fff" : C.muted, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 11, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px" }}>
          {mode === "desktop" ? `${containerWidth}px` : "390px · mobile"}
        </span>

        <button onClick={onClose}
          style={{ background: C.accentLo, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: C.accent, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
          <X size={12} /> Back to Edit
        </button>
      </div>

      {/* Scrollable canvas */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", justifyContent: "center", alignItems: "flex-start", background: backgroundColor }}>
        <div style={{ width: previewW, maxWidth: "100%", background: containerBg, borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.4)", flexShrink: 0 }}>
          {blocks.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No content to preview.</div>
          ) : (
            blocks.map(block => <PreviewBlock key={block.id} block={block} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HTML Import modal ────────────────────────────────────────────────────────
function HtmlImportModal({ onImport, onClose }) {
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState("paste");

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setHtml(ev.target.result || "");
    reader.readAsText(file);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px", boxShadow: C.shadowLg, width: "100%", maxWidth: 580 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Import HTML Template</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Paste or upload an existing email HTML file. It will be added as an editable Raw HTML block.</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: C.sub, display: "flex", marginLeft: 12, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["paste", "Paste HTML"], ["file", "Upload File"]].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, background: mode === m ? C.accent : C.bg, color: mode === m ? "#fff" : C.sub, border: `1px solid ${mode === m ? C.accent : C.border}`, borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>

        {mode === "paste" ? (
          <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder="Paste your HTML email code here…"
            style={{ width: "100%", boxSizing: "border-box", height: 220, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 11, color: C.text, outline: "none", fontFamily: "monospace", resize: "vertical" }} />
        ) : (
          <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "36px 20px", textAlign: "center", background: C.bg }}>
            <Upload size={26} color={C.muted} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>Drop a .html file or click to browse</div>
            <input type="file" accept=".html,.htm" onChange={handleFileChange}
              style={{ display: "block", margin: "0 auto", fontSize: 12, color: C.sub }} />
            {html && <div style={{ marginTop: 12, fontSize: 12, color: C.green, fontWeight: 600 }}>✓ File loaded ({html.length.toLocaleString()} chars)</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <MBtn onClick={onClose} variant="ghost">Cancel</MBtn>
          <MBtn onClick={() => html.trim() && onImport(html.trim())} disabled={!html.trim()} variant={html.trim() ? "primary" : "disabled"}>
            <Upload size={12} style={{ marginRight: 5 }} />Import HTML
          </MBtn>
        </div>
      </div>
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
  const [showImport,   setShowImport]   = useState(false);
  const [previewMode,  setPreviewMode]  = useState(false);
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

  function handleHtmlImport(html) {
    const nb = { id: generateId(), type: "html_raw", props: { html, padding: { top: 0, right: 0, bottom: 0, left: 0 } } };
    setBlocks([nb]);
    setSelectedId(nb.id);
    setShowImport(false);
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

        <button onClick={() => setPreviewMode(p => !p)}
          style={{ background: previewMode ? C.accentLo : C.surface, border: `1px solid ${previewMode ? C.accent : C.border}`, borderRadius: 9, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: previewMode ? C.accent : C.sub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
          <Eye size={13} /> {previewMode ? "Editing…" : "Preview"}
        </button>
        <button onClick={() => setShowImport(true)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: C.sub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
          <Upload size={13} /> Import HTML
        </button>
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
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Inline preview overlay — covers entire builder body */}
        {previewMode && (
          <InlinePreview
            body={buildBody()}
            name={name}
            onClose={() => setPreviewMode(false)}
          />
        )}

        {/* Left: Component palette */}
        <div style={{ width: 158, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px 8px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>
            Components
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
            {BLOCK_TYPES.map(({ type, label, desc }, idx) => (
              <div key={type}>
                {idx === 8 && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 2px 4px", borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                    ⚡ Interactive
                  </div>
                )}
                <button onClick={() => addBlock(type)}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${idx >= 8 ? C.accent + "40" : C.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "background 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.accentLo; e.currentTarget.style.borderColor = C.accent + "60"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = idx >= 8 ? C.accent + "40" : C.border; }}>
                  <div style={{ width: 26, height: 26, background: idx >= 8 ? C.accentLo : C.bg, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: idx >= 8 ? C.accent : C.sub, fontWeight: 700 }}>
                    {BLOCK_ICON[type] || "≡"}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</div>
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.3 }}>{desc}</div>
                  </div>
                </button>
              </div>
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

      {showImport && <HtmlImportModal onImport={handleHtmlImport} onClose={() => setShowImport(false)} />}
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
