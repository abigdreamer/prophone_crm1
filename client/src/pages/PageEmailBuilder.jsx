import { useState, useEffect, useRef, forwardRef } from "react";
import {
  Type, AlignLeft, Image as ImageIcon, MousePointerClick, Columns2,
  Minus, ArrowUpDown, PanelBottom, ChevronUp, ChevronDown, Copy, Plus,
  Trash2, X, ArrowLeft, Eye, Download, Send, Check, Pencil,
  Folder, AlertCircle, Mail, AlignCenter, AlignRight as AlignRightIcon,
  LayoutTemplate, Layers, Monitor, Smartphone, Tablet, TriangleAlert,
  PanelLeft, PanelRight, PanelLeftOpen, PanelRightOpen, LoaderCircle,
  Variable,
} from "lucide-react";
import * as store from "../lib/templateStore";
import { jsonToHtml } from "../lib/jsonToHtml";
import { getDomains } from "../api/domains.api";
import { MERGE_TAGS } from "../data/mergeTags";

// ─── Theme ─────────────────────────────────────────────────────────────────────
const W = {
  bg:       "#f1f5f9",
  surface:  "#ffffff",
  panel:    "#f8fafc",
  border:   "#e2e8f0",
  text:     "#0f172a",
  sub:      "#475569",
  muted:    "#94a3b8",
  accent:   "#6366f1",
  accentLo: "#eef2ff",
  green:    "#16a34a",
  red:      "#dc2626",
  redLo:    "#fee2e2",
};

// Toolbar tokens — clean white, clearly separate from the dark app nav
const TB = {
  bg:     "#ffffff",
  border: "#e2e8f0",
  text:   "#0f172a",
  sub:    "#64748b",
  muted:  "#94a3b8",
  hover:  "#f8fafc",
  input:  "#f1f5f9",
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: { bg: "#0f172a",  border: "#1e293b",  icon: Check,         color: "#4ade80" },
  error:   { bg: "#7f1d1d",  border: "#991b1b",  icon: AlertCircle,   color: "#fca5a5" },
  warning: { bg: "#78350f",  border: "#92400e",  icon: AlertCircle,   color: "#fcd34d" },
  info:    { bg: "#1e3a5f",  border: "#1e40af",  icon: Mail,          color: "#93c5fd" },
};

function Toast({ toast }) {
  if (!toast) return null;
  const s   = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  const Ico = s.icon;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 12, padding: "13px 18px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      maxWidth: 380, fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
      animation: "tbToastIn 0.2s ease",
    }}>
      <Ico size={16} color={s.color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9", lineHeight: 1.5 }}>
        {toast.msg}
      </span>
    </div>
  );
}

// ─── Responsive hook ───────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({
    width:  typeof window !== "undefined" ? window.innerWidth  : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  useEffect(() => {
    const h = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return size;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function getBgStyle(bg) {
  if (!bg || bg.type === "transparent" || !bg.type) return {};
  if (bg.type === "solid")    return { background: bg.color || "#ffffff" };
  if (bg.type === "gradient") {
    const g = bg.gradient || {};
    return { background: `linear-gradient(${g.angle ?? 135}deg, ${g.from || "#6366f1"}, ${g.to || "#818cf8"})` };
  }
  if (bg.type === "image" && bg.image?.url) {
    return {
      backgroundImage:    `url(${bg.image.url})`,
      backgroundSize:     bg.image.size     || "cover",
      backgroundPosition: bg.image.position || "center",
      backgroundRepeat:   bg.image.repeat   || "no-repeat",
    };
  }
  return {};
}

const DEFAULT_PROPS = {
  heading: {
    text: "Your Heading Here",
    level: "h1",
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    align: "center",
    padding: { top: 32, bottom: 16, left: 24, right: 24 },
    background: { type: "transparent" },
  },
  text: {
    text: "Write your email body text here. Keep it concise and engaging.",
    color: "#374151",
    fontSize: 15,
    align: "left",
    lineHeight: 1.6,
    padding: { top: 8, bottom: 16, left: 24, right: 24 },
    background: { type: "transparent" },
  },
  image: {
    src: "",
    alt: "Image",
    width: 100,
    align: "center",
    borderRadius: 0,
    padding: { top: 8, bottom: 8, left: 24, right: 24 },
    background: { type: "transparent" },
  },
  button: {
    label: "Click Here",
    url: "https://",
    bgColor: "#6366f1",
    textColor: "#ffffff",
    fontSize: 14,
    borderRadius: 6,
    align: "center",
    padding: { top: 14, bottom: 14, left: 28, right: 28 },
    background: { type: "transparent" },
  },
  divider: {
    color: "#e5e7eb",
    thickness: 1,
    marginTop: 8,
    marginBottom: 8,
    sidePadding: 24,
    background: { type: "transparent" },
  },
  spacer: {
    height: 32,
    background: { type: "transparent" },
  },
  footer: {
    text: "© 2024 Your Company. All rights reserved.\nYou received this email because you opted in.",
    color: "#9ca3af",
    fontSize: 12,
    align: "center",
    padding: { top: 24, bottom: 32, left: 24, right: 24 },
    background: { type: "transparent" },
  },
  columns: {
    leftText:  "Left column content goes here.",
    rightText: "Right column content goes here.",
    color:     "#374151",
    fontSize:  14,
    padding:   { top: 16, bottom: 16, left: 24, right: 24 },
    background: { type: "transparent" },
  },
};

function createBlock(type) {
  return { id: uid(), type, props: { ...DEFAULT_PROPS[type] } };
}

function makeDefaultJson() {
  return {
    version: 1,
    backgroundColor: "#f4f4f4",
    containerBg: "#ffffff",
    containerWidth: 600,
    from: "",
    blocks: [
      { id: uid(), type: "heading", props: { ...DEFAULT_PROPS.heading, text: "Welcome!" } },
      { id: uid(), type: "text",    props: { ...DEFAULT_PROPS.text } },
      { id: uid(), type: "button",  props: { ...DEFAULT_PROPS.button } },
      { id: uid(), type: "divider", props: { ...DEFAULT_PROPS.divider } },
      { id: uid(), type: "footer",  props: { ...DEFAULT_PROPS.footer } },
    ],
  };
}

const PALETTE = [
  { type: "heading", label: "Heading",  Icon: Type,              desc: "Title or section header" },
  { type: "text",    label: "Text",     Icon: AlignLeft,         desc: "Body paragraph" },
  { type: "image",   label: "Image",    Icon: ImageIcon,         desc: "Image block" },
  { type: "button",  label: "Button",   Icon: MousePointerClick, desc: "Call-to-action" },
  { type: "columns", label: "Columns",  Icon: Columns2,          desc: "Two-column layout" },
  { type: "divider", label: "Divider",  Icon: Minus,             desc: "Horizontal rule" },
  { type: "spacer",  label: "Spacer",   Icon: ArrowUpDown,       desc: "Vertical space" },
  { type: "footer",  label: "Footer",   Icon: PanelBottom,       desc: "Footer text" },
];

const EDITABLE_TYPES = ["heading", "text", "button", "footer", "columns"];

// ─── Canvas block renderer ─────────────────────────────────────────────────────
function BlockPreview({ block }) {
  const { type, props: p } = block;
  const padStr  = p.padding ? `${p.padding.top}px ${p.padding.right}px ${p.padding.bottom}px ${p.padding.left}px` : "0";
  const bgStyle = getBgStyle(p.background);

  switch (type) {
    case "heading": {
      const Tag = p.level || "h1";
      return (
        <div style={{ padding: padStr, ...bgStyle }}>
          <Tag style={{ margin: 0, fontSize: p.fontSize || 28, fontWeight: p.fontWeight || "700", color: p.color || "#111827", textAlign: p.align || "center", lineHeight: 1.3 }}>
            {p.text || "Heading"}
          </Tag>
        </div>
      );
    }
    case "text":
      return (
        <div style={{ padding: padStr, ...bgStyle }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 15, color: p.color || "#374151", textAlign: p.align || "left", lineHeight: p.lineHeight || 1.6, whiteSpace: "pre-wrap" }}>
            {p.text || "Text"}
          </p>
        </div>
      );
    case "image":
      return (
        <div style={{ padding: padStr, textAlign: p.align || "center", ...bgStyle }}>
          {p.src ? (
            <img
              src={p.src} alt={p.alt || ""}
              style={{ maxWidth: `${p.width || 100}%`, height: "auto", borderRadius: p.borderRadius || 0, display: "block", margin: p.align === "center" ? "0 auto" : p.align === "right" ? "0 0 0 auto" : "0" }}
            />
          ) : (
            <div style={{ height: 120, background: "#f1f5f9", border: "2px dashed #cbd5e1", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12, gap: 6 }}>
              <ImageIcon size={24} color="#94a3b8" />
              <span>Paste image URL or upload in Properties</span>
            </div>
          )}
        </div>
      );
    case "button":
      return (
        <div style={{ padding: "16px 24px", textAlign: p.align || "center", ...bgStyle }}>
          <span style={{ display: "inline-block", padding: p.padding ? `${p.padding.top}px ${p.padding.right}px ${p.padding.bottom}px ${p.padding.left}px` : "12px 28px", background: p.bgColor || "#6366f1", color: p.textColor || "#ffffff", fontSize: p.fontSize || 14, fontWeight: 600, borderRadius: p.borderRadius || 6 }}>
            {p.label || "Click Here"}
          </span>
        </div>
      );
    case "divider":
      return (
        <div style={{ padding: `${p.marginTop || 8}px ${p.sidePadding || 24}px ${p.marginBottom || 8}px`, ...bgStyle }}>
          <hr style={{ border: "none", borderTop: `${p.thickness || 1}px solid ${p.color || "#e5e7eb"}`, margin: 0 }} />
        </div>
      );
    case "spacer": {
      const hasBg = p.background && p.background.type !== "transparent";
      return (
        <div style={{ height: p.height || 32, background: hasBg ? undefined : "repeating-linear-gradient(45deg,#f8fafc,#f8fafc 4px,#fff 4px,#fff 8px)", display: "flex", alignItems: "center", justifyContent: "center", ...bgStyle }}>
          <span style={{ fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.8)", padding: "1px 6px", borderRadius: 4 }}>{p.height || 32}px</span>
        </div>
      );
    }
    case "footer":
      return (
        <div style={{ padding: padStr, ...bgStyle }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 12, color: p.color || "#9ca3af", textAlign: p.align || "center", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {p.text || "Footer"}
          </p>
        </div>
      );
    case "columns":
      return (
        <div style={{ padding: padStr, display: "flex", gap: 24, ...bgStyle }}>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.leftText || "Left column"}</div>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.rightText || "Right column"}</div>
        </div>
      );
    default:
      return <div style={{ padding: "12px 24px", color: "#94a3b8", fontSize: 12 }}>[{type}]</div>;
  }
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────
function PLabel({ ch }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: W.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ch}</div>;
}

const inputBase = {
  width: "100%", boxSizing: "border-box", padding: "6px 9px", fontSize: 12,
  border: "1px solid #e2e8f0", borderRadius: 6, color: W.text, background: "#fff",
  outline: "none", fontFamily: "inherit",
};

function TInput({ value, onChange, placeholder, mono }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputBase, fontFamily: mono ? "monospace" : "inherit" }} />;
}
function NInput({ value, onChange, min, max, step, unit }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input type="number" value={value ?? 0} onChange={e => onChange(Number(e.target.value))} min={min} max={max} step={step || 1} style={{ ...inputBase, flex: 1 }} />
      {unit && <span style={{ fontSize: 10, color: W.muted, flexShrink: 0 }}>{unit}</span>}
    </div>
  );
}
function CInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)} style={{ width: 28, height: 28, border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", padding: 2 }} />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...inputBase, fontFamily: "monospace" }} />
    </div>
  );
}
function ABtn({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[
        { align: "left",   Icon: AlignLeft },
        { align: "center", Icon: AlignCenter },
        { align: "right",  Icon: AlignRightIcon },
      ].map(({ align, Icon }) => (
        <button
          key={align}
          onClick={() => onChange(align)}
          style={{ flex: 1, padding: "5px 0", fontSize: 11, background: value === align ? W.accentLo : W.panel, border: `1px solid ${value === align ? W.accent : W.border}`, borderRadius: 5, cursor: "pointer", color: value === align ? W.accent : W.sub, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
function SelInput({ value, onChange, options }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...inputBase, cursor: "pointer" }}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function PadInputs({ value = {}, onChange }) {
  const p = { top: 0, bottom: 0, left: 0, right: 0, ...value };
  const set = (k, v) => onChange({ ...p, [k]: Number(v) });
  const cell = (k, label) => (
    <div key={k} style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: W.muted, textAlign: "center", marginBottom: 2 }}>{label}</div>
      <input type="number" value={p[k]} onChange={e => set(k, e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "5px 4px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 5, color: W.text, background: "#fff", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
    </div>
  );
  return <div style={{ display: "flex", gap: 5 }}>{cell("top","T")}{cell("right","R")}{cell("bottom","B")}{cell("left","L")}</div>;
}
function Sec({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: W.muted, letterSpacing: "0.08em", textTransform: "uppercase", margin: "16px 0 10px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
function Row({ label, children }) { return <div><PLabel ch={label} />{children}</div>; }
function Hr() { return <div style={{ borderTop: "1px solid #f1f5f9", margin: "14px 0" }} />; }
const Textarea = forwardRef(({ value, onChange, rows }, ref) => (
  <textarea ref={ref} value={value || ""} onChange={e => onChange(e.target.value)} rows={rows || 3} style={{ width: "100%", boxSizing: "border-box", padding: "6px 9px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, resize: "vertical", fontFamily: "inherit", outline: "none", color: W.text }} />
));

function MergeTagBar({ onInsert }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: W.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Merge Tags</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {MERGE_TAGS.map(tag => (
          <button
            key={tag.key}
            type="button"
            onClick={() => onInsert(`{{${tag.key}}}`)}
            title={`Insert ${tag.label}`}
            style={{
              padding: "2px 8px", fontSize: 10, borderRadius: 4, cursor: "pointer",
              background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5",
              fontFamily: "monospace", lineHeight: 1.8, whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e0e7ff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#eef2ff"; }}
          >
            {`{{${tag.key}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Background editor ─────────────────────────────────────────────────────────
function BgEditor({ value = {}, onChange }) {
  const fileRef = useRef(null);
  const bg = {
    type: "transparent", color: "#ffffff",
    ...(value || {}),
    gradient: { angle: 135, from: "#6366f1", to: "#818cf8", ...(value?.gradient || {}) },
    image:    { url: "", size: "cover", position: "center", repeat: "no-repeat", ...(value?.image || {}) },
  };

  function handleBgImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5 MB)."); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange({ ...bg, image: { ...bg.image, url: ev.target.result } });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const previewStyle = (() => {
    if (bg.type === "solid")    return { background: bg.color };
    if (bg.type === "gradient") return { background: `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.from}, ${bg.gradient.to})` };
    if (bg.type === "image" && bg.image.url) return { backgroundImage: `url(${bg.image.url})`, backgroundSize: "cover", backgroundPosition: "center" };
    return null;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Row label="Type">
        <SelInput value={bg.type} onChange={v => onChange({ ...bg, type: v })}
          options={[
            { value: "transparent", label: "Transparent" },
            { value: "solid",       label: "Solid Color" },
            { value: "gradient",    label: "Gradient" },
            { value: "image",       label: "Image" },
          ]}
        />
      </Row>
      {previewStyle && <div style={{ height: 32, borderRadius: 6, border: "1px solid " + W.border, ...previewStyle }} />}
      {bg.type === "solid" && <Row label="Color"><CInput value={bg.color} onChange={v => onChange({ ...bg, color: v })} /></Row>}
      {bg.type === "gradient" && (<>
        <Row label="Start Color"><CInput value={bg.gradient.from} onChange={v => onChange({ ...bg, gradient: { ...bg.gradient, from: v } })} /></Row>
        <Row label="End Color"><CInput value={bg.gradient.to} onChange={v => onChange({ ...bg, gradient: { ...bg.gradient, to: v } })} /></Row>
        <Row label="Angle"><NInput value={bg.gradient.angle} onChange={v => onChange({ ...bg, gradient: { ...bg.gradient, angle: v } })} min={0} max={360} unit="°" /></Row>
      </>)}
      {bg.type === "image" && (<>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleBgImageUpload} style={{ display: "none" }} />
        {bg.image.url ? (
          <button onClick={() => onChange({ ...bg, image: { ...bg.image, url: "" } })} style={{ width: "100%", padding: "5px 8px", fontSize: 10, background: "#fff", color: W.red, border: "1px solid #fca5a5", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <X size={10} /> Remove Image
          </button>
        ) : (<>
          <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "7px 10px", fontSize: 11, fontWeight: 600, background: W.accentLo, color: W.accent, border: "1px dashed " + W.accent, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Folder size={13} /> Upload Image
          </button>
          <Row label="Or paste URL"><TInput value={bg.image.url} onChange={v => onChange({ ...bg, image: { ...bg.image, url: v } })} placeholder="https://..." /></Row>
        </>)}
        <Row label="Size">
          <SelInput value={bg.image.size} onChange={v => onChange({ ...bg, image: { ...bg.image, size: v } })}
            options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "auto", label: "Auto" }, { value: "100% 100%", label: "Stretch" }]}
          />
        </Row>
        <Row label="Position">
          <SelInput value={bg.image.position} onChange={v => onChange({ ...bg, image: { ...bg.image, position: v } })}
            options={[{ value: "center", label: "Center" }, { value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }]}
          />
        </Row>
      </>)}
    </div>
  );
}

// ─── Inline editing ────────────────────────────────────────────────────────────
function InlineEdit({ block, onUpdate, onDone }) {
  const { type, props: p } = block;
  const padStr = p.padding ? `${p.padding.top}px ${p.padding.right}px ${p.padding.bottom}px ${p.padding.left}px` : "0";
  const bgStyle = getBgStyle(p.background);

  const taBase = {
    background: "transparent", border: "none", outline: "none", resize: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box", display: "block",
  };

  const wrap = (children, extra = {}) => (
    <div style={{ padding: padStr, background: "rgba(99,102,241,0.04)", ...bgStyle, ...extra }}>{children}</div>
  );

  const onKey = e => { if (e.key === "Escape") { e.preventDefault(); onDone(); } };

  switch (type) {
    case "heading":
      return wrap(
        <textarea autoFocus value={p.text || ""} onChange={e => onUpdate("text", e.target.value)} onKeyDown={onKey} onBlur={onDone} rows={2}
          style={{ ...taBase, fontSize: p.fontSize || 28, fontWeight: p.fontWeight || "700", color: p.color || "#111827", textAlign: p.align || "center", lineHeight: 1.3 }} />
      );
    case "text":
      return wrap(
        <textarea autoFocus value={p.text || ""} onChange={e => onUpdate("text", e.target.value)} onKeyDown={onKey} onBlur={onDone} rows={5}
          style={{ ...taBase, fontSize: p.fontSize || 15, color: p.color || "#374151", textAlign: p.align || "left", lineHeight: p.lineHeight || 1.6 }} />
      );
    case "button":
      return (
        <div style={{ padding: "16px 24px", textAlign: p.align || "center", background: "rgba(99,102,241,0.04)", ...bgStyle }}>
          <input autoFocus type="text" value={p.label || ""} onChange={e => onUpdate("label", e.target.value)}
            onKeyDown={e => { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); onDone(); } }}
            onBlur={onDone}
            style={{ display: "inline-block", textAlign: "center", padding: p.padding ? `${p.padding.top}px ${p.padding.right}px ${p.padding.bottom}px ${p.padding.left}px` : "14px 28px", background: p.bgColor || "#6366f1", color: p.textColor || "#ffffff", fontSize: p.fontSize || 14, fontWeight: 600, borderRadius: p.borderRadius || 6, border: "2px solid rgba(255,255,255,0.5)", outline: "none", fontFamily: "inherit", minWidth: 80 }}
          />
        </div>
      );
    case "footer":
      return wrap(
        <textarea autoFocus value={p.text || ""} onChange={e => onUpdate("text", e.target.value)} onKeyDown={onKey} onBlur={onDone} rows={3}
          style={{ ...taBase, fontSize: p.fontSize || 12, color: p.color || "#9ca3af", textAlign: p.align || "center", lineHeight: 1.6 }} />
      );
    case "columns":
      return (
        <div style={{ padding: padStr, display: "flex", gap: 24, background: "rgba(99,102,241,0.04)", ...bgStyle }}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) onDone(); }}>
          <textarea autoFocus value={p.leftText || ""} onChange={e => onUpdate("leftText", e.target.value)} onKeyDown={onKey} rows={4}
            style={{ ...taBase, flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.6 }} />
          <div style={{ width: 1, background: "#e2e8f0", flexShrink: 0 }} />
          <textarea value={p.rightText || ""} onChange={e => onUpdate("rightText", e.target.value)} onKeyDown={onKey} rows={4}
            style={{ ...taBase, flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.6 }} />
        </div>
      );
    default:
      return <BlockPreview block={block} />;
  }
}

// ─── Image upload ──────────────────────────────────────────────────────────────
function ImageUploadBtn({ onUpload }) {
  const ref = useRef(null);
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image is too large (max 5 MB)."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button onClick={() => ref.current?.click()} style={{ width: "100%", padding: "7px 10px", fontSize: 11, fontWeight: 600, background: W.accentLo, color: W.accent, border: "1px dashed " + W.accent, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <Folder size={13} /> Upload from Computer
      </button>
    </>
  );
}

function BgColorPicker({ value, onChange }) {
  const isSolid = value?.type === "solid";
  const color   = isSolid ? (value.color || "#ffffff") : "#ffffff";
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="color" value={color} onChange={e => onChange({ ...(value || {}), type: "solid", color: e.target.value })}
        style={{ width: 28, height: 28, border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", padding: 2, flexShrink: 0 }} />
      <input type="text" value={isSolid ? color : ""} placeholder="None (transparent)"
        onChange={e => { const v = e.target.value.trim(); onChange(v ? { ...(value || {}), type: "solid", color: v } : { type: "transparent" }); }}
        style={{ flex: 1, padding: "5px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 5, fontFamily: "monospace", outline: "none", color: "#0f172a", background: "#fff" }}
      />
      {isSolid && (
        <button onClick={() => onChange({ type: "transparent" })} title="Remove background"
          style={{ background: "#fee2e2", border: "none", borderRadius: 5, color: "#dc2626", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <X size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Properties panel ──────────────────────────────────────────────────────────
function PropsPanel({ json, setJson, block, onProp, onDelete, onDuplicate }) {
  const activeTextareaRef = useRef(null);
  if (!block) {
    return (
      <div style={{ padding: "0 16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: W.text, padding: "16px 0 4px" }}>Template Settings</div>
        <Sec title="Colors">
          <Row label="Page Background"><CInput value={json.backgroundColor} onChange={v => setJson(p => ({ ...p, backgroundColor: v }))} /></Row>
          <Row label="Email Background"><CInput value={json.containerBg} onChange={v => setJson(p => ({ ...p, containerBg: v }))} /></Row>
        </Sec>
        <Sec title="Layout">
          <Row label="Container Width"><NInput value={json.containerWidth} onChange={v => setJson(p => ({ ...p, containerWidth: v }))} min={320} max={900} unit="px" /></Row>
        </Sec>
        <Hr />
        {/* Variable hints */}
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Variable size={12} color="#16a34a" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Dynamic Variables</span>
          </div>
          <div style={{ fontSize: 11, color: "#166534", lineHeight: 1.6 }}>
            Use <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>{"{{firstName}}"}</code>,{" "}
            <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>{"{{company}}"}</code>, or any{" "}
            <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>{"{{variable}}"}</code>{" "}
            inside your text blocks for personalization.
          </div>
        </div>
        <Hr />
        <div style={{ fontSize: 11, color: W.muted, lineHeight: 1.6 }}>Select a block on the canvas to edit its properties.</div>
      </div>
    );
  }

  const p = block.props;
  const label = block.type.charAt(0).toUpperCase() + block.type.slice(1);

  function insertMergeTag(tag) {
    const el = activeTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const before = el.value.slice(0, start);
    const after  = el.value.slice(end);
    const next   = before + tag + after;
    const key    = el.dataset.propkey;
    if (key) onProp(key, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  const TEXT_BLOCK_TYPES = ["heading", "text", "footer", "columns"];

  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 10px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>{label} Block</div>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={onDuplicate} title="Duplicate" style={ctrlBtn("#f1f5f9", W.sub)}><Copy size={12} /></button>
          <button onClick={onDelete}    title="Delete"    style={ctrlBtn(W.redLo, W.red)}><Trash2 size={12} /></button>
        </div>
      </div>

      {TEXT_BLOCK_TYPES.includes(block.type) && (
        <div style={{ paddingTop: 12 }}>
          <MergeTagBar onInsert={insertMergeTag} />
        </div>
      )}

      {block.type === "heading" && (<>
        <Sec title="Content">
          <Row label="Text"><Textarea ref={el => { if (el) { el.dataset.propkey = "text"; activeTextareaRef.current = el; } }} value={p.text} onChange={v => onProp("text", v)} rows={2} /></Row>
          <Row label="Level"><SelInput value={p.level} onChange={v => { onProp("level", v); onProp("fontSize", v === "h1" ? 32 : v === "h2" ? 24 : 18); }} options={[{ value: "h1", label: "H1 — Large (32px)" }, { value: "h2", label: "H2 — Medium (24px)" }, { value: "h3", label: "H3 — Small (18px)" }]} /></Row>
        </Sec>
        <Sec title="Style">
          <Row label="Text Color"><CInput value={p.color} onChange={v => onProp("color", v)} /></Row>
          <Row label="Block Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Font Size"><NInput value={p.fontSize} onChange={v => onProp("fontSize", v)} min={10} max={80} unit="px" /></Row>
          <Row label="Font Weight"><SelInput value={p.fontWeight} onChange={v => onProp("fontWeight", v)} options={[{ value: "400", label: "Regular" }, { value: "600", label: "SemiBold" }, { value: "700", label: "Bold" }, { value: "800", label: "ExtraBold" }]} /></Row>
          <Row label="Alignment"><ABtn value={p.align} onChange={v => onProp("align", v)} /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      {block.type === "text" && (<>
        <Sec title="Content"><Row label="Text"><Textarea ref={el => { if (el) { el.dataset.propkey = "text"; activeTextareaRef.current = el; } }} value={p.text} onChange={v => onProp("text", v)} rows={5} /></Row></Sec>
        <Sec title="Style">
          <Row label="Text Color"><CInput value={p.color} onChange={v => onProp("color", v)} /></Row>
          <Row label="Block Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Font Size"><NInput value={p.fontSize} onChange={v => onProp("fontSize", v)} min={8} max={48} unit="px" /></Row>
          <Row label="Line Height"><NInput value={p.lineHeight} onChange={v => onProp("lineHeight", v)} min={1} max={3} step={0.1} /></Row>
          <Row label="Alignment"><ABtn value={p.align} onChange={v => onProp("align", v)} /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      {block.type === "image" && (<>
        <Sec title="Content">
          {p.src && (
            <div style={{ background: "#f8fafc", border: "1px solid " + W.border, borderRadius: 6, padding: 8, textAlign: "center" }}>
              <img src={p.src} alt="" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain", display: "block", margin: "0 auto", borderRadius: 4 }} onError={e => { e.currentTarget.style.display = "none"; }} />
              {p.src.startsWith("data:") && <div style={{ fontSize: 9, color: W.muted, marginTop: 5 }}>Base64 · {Math.round(p.src.length / 1024)} KB</div>}
            </div>
          )}
          {!p.src?.startsWith("data:") && <Row label="Image URL"><TInput value={p.src || ""} onChange={v => onProp("src", v)} placeholder="https://example.com/photo.jpg" /></Row>}
          {!p.src?.startsWith("data:") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: W.border }} />
              <span style={{ fontSize: 10, color: W.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: W.border }} />
            </div>
          )}
          <ImageUploadBtn onUpload={v => onProp("src", v)} />
          {p.src && (
            <button onClick={() => onProp("src", "")} style={{ width: "100%", padding: "5px 8px", fontSize: 10, background: "#fff", color: W.red, border: "1px solid #fca5a5", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <X size={10} /> Remove Image
            </button>
          )}
          <Row label="Alt Text"><TInput value={p.alt} onChange={v => onProp("alt", v)} placeholder="Describe the image" /></Row>
        </Sec>
        <Sec title="Style">
          <Row label="Block Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Width"><NInput value={p.width} onChange={v => onProp("width", v)} min={10} max={100} unit="%" /></Row>
          <Row label="Border Radius"><NInput value={p.borderRadius} onChange={v => onProp("borderRadius", v)} min={0} max={50} unit="px" /></Row>
          <Row label="Alignment"><ABtn value={p.align} onChange={v => onProp("align", v)} /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      {block.type === "button" && (<>
        <Sec title="Content">
          <Row label="Label"><TInput value={p.label} onChange={v => onProp("label", v)} /></Row>
          <Row label="URL"><TInput value={p.url} onChange={v => onProp("url", v)} placeholder="https://" mono /></Row>
        </Sec>
        <Sec title="Style">
          <Row label="Button Color"><CInput value={p.bgColor} onChange={v => onProp("bgColor", v)} /></Row>
          <Row label="Text Color"><CInput value={p.textColor} onChange={v => onProp("textColor", v)} /></Row>
          <Row label="Section Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Font Size"><NInput value={p.fontSize} onChange={v => onProp("fontSize", v)} min={10} max={24} unit="px" /></Row>
          <Row label="Border Radius"><NInput value={p.borderRadius} onChange={v => onProp("borderRadius", v)} min={0} max={50} unit="px" /></Row>
          <Row label="Alignment"><ABtn value={p.align} onChange={v => onProp("align", v)} /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Button Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      {block.type === "divider" && (
        <Sec title="Style">
          <Row label="Line Color"><CInput value={p.color} onChange={v => onProp("color", v)} /></Row>
          <Row label="Section Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Thickness"><NInput value={p.thickness} onChange={v => onProp("thickness", v)} min={1} max={10} unit="px" /></Row>
          <Row label="Side Padding"><NInput value={p.sidePadding} onChange={v => onProp("sidePadding", v)} min={0} max={120} unit="px" /></Row>
          <Row label="Top Margin"><NInput value={p.marginTop} onChange={v => onProp("marginTop", v)} min={0} max={100} unit="px" /></Row>
          <Row label="Bottom Margin"><NInput value={p.marginBottom} onChange={v => onProp("marginBottom", v)} min={0} max={100} unit="px" /></Row>
        </Sec>
      )}

      {block.type === "spacer" && (
        <Sec title="Layout">
          <Row label="Height"><NInput value={p.height} onChange={v => onProp("height", v)} min={4} max={200} unit="px" /></Row>
          <Row label="Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
        </Sec>
      )}

      {block.type === "footer" && (<>
        <Sec title="Content"><Row label="Text"><Textarea ref={el => { if (el) { el.dataset.propkey = "text"; activeTextareaRef.current = el; } }} value={p.text} onChange={v => onProp("text", v)} rows={4} /></Row></Sec>
        <Sec title="Style">
          <Row label="Text Color"><CInput value={p.color} onChange={v => onProp("color", v)} /></Row>
          <Row label="Block Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Font Size"><NInput value={p.fontSize} onChange={v => onProp("fontSize", v)} min={8} max={18} unit="px" /></Row>
          <Row label="Alignment"><ABtn value={p.align} onChange={v => onProp("align", v)} /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      {block.type === "columns" && (<>
        <Sec title="Content">
          <Row label="Left Column"><Textarea ref={el => { if (el) { el.dataset.propkey = "leftText"; activeTextareaRef.current = el; } }} value={p.leftText} onChange={v => onProp("leftText", v)} rows={4} /></Row>
          <Row label="Right Column"><Textarea ref={el => { if (el) { el.dataset.propkey = "rightText"; activeTextareaRef.current = el; } }} value={p.rightText} onChange={v => onProp("rightText", v)} rows={4} /></Row>
        </Sec>
        <Sec title="Style">
          <Row label="Text Color"><CInput value={p.color} onChange={v => onProp("color", v)} /></Row>
          <Row label="Block Background"><BgColorPicker value={p.background} onChange={v => onProp("background", v)} /></Row>
          <Row label="Font Size"><NInput value={p.fontSize} onChange={v => onProp("fontSize", v)} min={10} max={24} unit="px" /></Row>
        </Sec>
        <Sec title="Spacing"><Row label="Padding"><PadInputs value={p.padding} onChange={v => onProp("padding", v)} /></Row></Sec>
      </>)}

      <Hr />
      <Sec title="Advanced Background">
        <BgEditor value={p.background} onChange={v => onProp("background", v)} />
      </Sec>
    </div>
  );
}

function ctrlBtn(bg, color) {
  return { background: bg, border: "none", borderRadius: 5, padding: "4px 7px", fontSize: 11, cursor: "pointer", color, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" };
}

// ─── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ html, from, subject, templateName, onClose }) {
  const [mode, setMode] = useState("desktop");
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) { doc.open(); doc.write(html); doc.close(); }
  }, [html, mode]);

  const displayDate   = new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const senderName    = from ? from.split("@")[0].replace(/[._-]/g, " ") : null;
  const senderInitial = from ? from[0].toUpperCase() : "?";
  const maxW          = mode === "mobile" ? 420 : mode === "tablet" ? 680 : 860;

  const MODES = [
    { id: "desktop", Icon: Monitor,    label: "Desktop" },
    { id: "tablet",  Icon: Tablet,     label: "Tablet"  },
    { id: "mobile",  Icon: Smartphone, label: "Mobile"  },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.78)", display: "flex", flexDirection: "column", alignItems: "center", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* ── Top control bar ── */}
      <div style={{ width: "100%", background: "#1a3560", borderBottom: "1px solid rgba(255,255,255,0.09)", padding: "0 20px", height: 54, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={14} color="#818cf8" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
              {templateName || "Preview"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Email preview</div>
          </div>
        </div>

        {/* Viewport toggles — centered */}
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: 3, marginLeft: "auto", marginRight: "auto" }}>
          {MODES.map(({ id, Icon, label }) => (
            <button key={id} onClick={() => setMode(id)}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: mode === id ? "#6366f1" : "transparent", color: mode === id ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Close */}
        <button onClick={onClose}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "6px 14px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <X size={13} /> Close
        </button>
      </div>

      {/* ── Scrollable content area ── */}
      <div style={{ flex: 1, overflow: "auto", width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "28px 16px 40px", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: maxW, borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.55)", fontFamily: "'Inter','DM Sans',system-ui,sans-serif", transition: "max-width 0.2s ease" }}>

          {/* ── Fake mail-client chrome ── */}
          <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0", height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Email preview — {mode}</span>
            </div>
          </div>

          {/* ── Email client header ── */}
          <div style={{ background: "#ffffff", padding: "24px 28px 20px", borderBottom: "1px solid #e8edf3" }}>

            {/* Subject line */}
            <div style={{ fontSize: mode === "mobile" ? 17 : 22, fontWeight: 800, color: subject ? "#0f172a" : "#94a3b8", lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: 16, fontStyle: subject ? "normal" : "italic" }}>
              {subject || "No subject line"}
            </div>

            {/* Sender row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}>
                {senderInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    {senderName && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginRight: 6, textTransform: "capitalize" }}>{senderName}</span>
                    )}
                    <span style={{ fontSize: 12, color: from ? "#64748b" : "#94a3b8", fontStyle: from ? "normal" : "italic" }}>
                      {from ? `<${from}>` : "No sender selected"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{displayDate}</span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  to <span style={{ color: "#475569" }}>your recipients</span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {(!from || !subject) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                {!from && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, color: "#9a3412", fontWeight: 600 }}>
                    <TriangleAlert size={11} color="#f97316" /> No sender domain
                  </span>
                )}
                {!subject && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, color: "#9a3412", fontWeight: 600 }}>
                    <TriangleAlert size={11} color="#f97316" /> No subject line
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Email HTML body ── */}
          <iframe
            ref={iframeRef}
            style={{ width: "100%", minHeight: 480, border: "none", background: "#f4f4f4", display: "block" }}
            title="Email body"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PageEmailBuilder({ templateId: initId, onBack }) {
  const [json,        setJson]        = useState(makeDefaultJson);
  const [name,        setName]        = useState("Untitled Template");
  const [subject,     setSubject]     = useState("");
  const [from,        setFrom]        = useState("");
  const [tid,         setTid]         = useState(initId || null);
  const [selectedId,  setSelectedId]  = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(!!initId);
  const [dragSrc,     setDragSrc]     = useState(null);
  const [dragOver,    setDragOver]    = useState(null);
  const [editingId,   setEditingId]   = useState(null);
  const [mobileTab,   setMobileTab]   = useState("canvas");
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [propsOpen,   setPropsOpen]   = useState(true);
  const [verifiedDomains, setVerifiedDomains] = useState([]);
  const [fromOpen,       setFromOpen]       = useState(false);
  const [subjectTagOpen, setSubjectTagOpen] = useState(false);
  const [toast,    setToast]    = useState(null);
  const toastTimer   = useRef(null);
  const fromRef      = useRef(null);
  const subjectRef   = useRef(null);
  const subjectTagRef = useRef(null);

  function showToast(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  const isDirtyRef         = useRef(false);
  const saveStateRef       = useRef({});
  const lastSavedTidRef    = useRef(null);   // sync capture after save to avoid race with setTid
  const lastSavedStatusRef = useRef(null);   // tracks explicitly saved status (prevents draft downgrade)
  const initializedRef     = useRef(false);  // true once initial load/render is settled

  const { width: winWidth } = useWindowSize();
  const isMobile = winWidth < 640;
  const isTablet = winWidth >= 640 && winWidth < 1024;
  const leftW  = isTablet ? 160 : 196;
  const rightW = isTablet ? 210 : 252;

  // Fetch verified domains for the From dropdown
  useEffect(() => {
    getDomains()
      .then(all => setVerifiedDomains((all || []).filter(d => d.status === "verified")))
      .catch(() => {});
  }, []);

  // Close From / subject-tag dropdowns on outside click
  useEffect(() => {
    function handle(e) {
      if (fromRef.current && !fromRef.current.contains(e.target)) setFromOpen(false);
      if (subjectTagRef.current && !subjectTagRef.current.contains(e.target)) setSubjectTagOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Keep a ref of the latest state values for the unmount cleanup
  useEffect(() => {
    saveStateRef.current = { json, name, subject, from, tid };
  }, [json, name, subject, from, tid]);

  // Load template
  useEffect(() => {
    if (!initId) return;
    setLoading(true);
    store.getTemplate(initId)
      .then(t => {
        if (t) {
          setName(t.name || "Untitled");
          setSubject(t.subject || "");
          setFrom(t.json_structure?.from || "");
          setJson(t.json_structure || makeDefaultJson());
          setTid(t.id);
          lastSavedTidRef.current    = t.id;
          lastSavedStatusRef.current = t.status || "draft";
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initId]);

  // Mark dirty only after initial setup settles (skip the first qualifying fire so
  // opening a new blank builder and immediately going back never creates a template)
  useEffect(() => {
    if (!initializedRef.current) {
      // For new templates loading=false from the start; for existing, loading
      // becomes false once the load batch completes. Either way, the first time
      // we reach here with loading=false we just mark initialized and skip.
      if (!loading) initializedRef.current = true;
      return;
    }
    isDirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, name, subject, from]);

  // Auto-save as draft on unmount (handles route navigation, browser back, etc.)
  useEffect(() => {
    return () => {
      if (!isDirtyRef.current) return;
      if (lastSavedStatusRef.current === "published") return;
      const { json: j, name: n, subject: s, from: f } = saveStateRef.current;
      const id = lastSavedTidRef.current || saveStateRef.current.tid;
      // Never auto-create an empty nameless template (guards against React StrictMode
      // double-invoke and the case where the user opens the builder and immediately leaves)
      const hasContent = (j?.blocks?.length > 0) || (n && n.trim() && n.trim() !== "Untitled");
      if (!id && !hasContent) return;
      const jsonWithMeta = { ...j, from: f };
      const html = jsonToHtml(jsonWithMeta);
      const payload = { name: n || "Untitled", subject: s, json_structure: jsonWithMeta, html_output: html, status: "draft" };
      if (id) {
        store.updateTemplate(id, payload).catch(() => {});
      } else {
        store.createTemplate(payload).catch(() => {});
      }
    };
  }, []); // intentionally empty — runs only on unmount

  const selectedBlock = json.blocks.find(b => b.id === selectedId) || null;

  function addBlock(type) {
    const b = createBlock(type);
    setJson(p => {
      const blocks = [...p.blocks];
      const selIdx = selectedId ? blocks.findIndex(bl => bl.id === selectedId) : -1;
      if (selIdx !== -1) blocks.splice(selIdx + 1, 0, b);
      else blocks.push(b);
      return { ...p, blocks };
    });
    setSelectedId(b.id);
    if (isMobile) setMobileTab("canvas");
  }

  function updateBlockById(id, key, val) {
    setJson(p => ({ ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, props: { ...b.props, [key]: val } } : b) }));
  }

  function updateProp(key, val) {
    if (selectedId) updateBlockById(selectedId, key, val);
  }

  function delBlock(id) {
    setJson(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function dupBlock(id) {
    const idx = json.blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = { ...json.blocks[idx], id: uid() };
    const arr = [...json.blocks];
    arr.splice(idx + 1, 0, copy);
    setJson(p => ({ ...p, blocks: arr }));
    setSelectedId(copy.id);
  }

  function moveBlock(from, to) {
    if (from === to) return;
    const arr = [...json.blocks];
    const [el] = arr.splice(from, 1);
    arr.splice(to, 0, el);
    setJson(p => ({ ...p, blocks: arr }));
  }

  async function save(status = "draft") {
    setSaving(true);
    try {
      const jsonWithMeta = { ...json, from };
      const html = jsonToHtml(jsonWithMeta);
      const payload = { name: name || "Untitled", subject, json_structure: jsonWithMeta, html_output: html, status };
      let result;
      if (tid) {
        result = await store.updateTemplate(tid, payload);
      } else {
        result = await store.createTemplate(payload);
        setTid(result.id);
      }
      lastSavedTidRef.current    = result.id;
      lastSavedStatusRef.current = status;
      isDirtyRef.current = false;
      if (status === "published") {
        showToast("Template published successfully!", "success");
      } else {
        showToast("Draft saved.", "success");
      }
    } catch (err) {
      showToast(err?.message || "Couldn't save — check your connection.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const isVerified = verifiedDomains.some(d => (d.from_email || `noreply@${d.domain}`) === from);
    if (!isVerified) {
      showToast(
        verifiedDomains.length === 0
          ? "No verified domain found. Go to Domains → verify a domain first."
          : "Select a verified sending domain from the From field before publishing.",
        "warning"
      );
      return;
    }
    await save("published");
    onBack();
  }

  async function handleBack() {
    const hasContent = (json.blocks?.length > 0) || (name && name.trim() && name.trim() !== "Untitled");
    if (isDirtyRef.current && lastSavedStatusRef.current !== "published" && (tid || hasContent)) {
      await save("draft");
    }
    onBack();
  }

  function exportHtml() {
    const html = jsonToHtml({ ...json, from });
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = (name || "template").replace(/[^\w]/g, "_").toLowerCase() + ".html";
    a.click();
    URL.revokeObjectURL(url);
  }

  const onDragStart = (e, i) => { setDragSrc(i); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = (e, i) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(i); };
  const onDrop      = (e, i) => { e.preventDefault(); if (dragSrc !== null) moveBlock(dragSrc, i); setDragSrc(null); setDragOver(null); };
  const onDragEnd   = ()     => { setDragSrc(null); setDragOver(null); };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: W.panel, gap: 14 }}>
        <style>{`@keyframes _spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <LoaderCircle size={32} color={W.accent} style={{ animation: "_spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: W.muted, fontWeight: 500 }}>Loading template…</span>
      </div>
    );
  }

  // ── Palette panel ────────────────────────────────────────────────────────────
  const tabletPaletteCollapsed = isTablet && !paletteOpen;
  const palettePanel = (
    <div style={{
      width: isMobile ? "100%" : tabletPaletteCollapsed ? 36 : leftW,
      display: isMobile && mobileTab !== "components" ? "none" : "flex",
      flexShrink: isMobile ? 1 : 0,
      flex: isMobile ? "1" : undefined,
      flexDirection: "column",
      background: W.surface,
      borderRight: !isMobile ? "1px solid " + W.border : "none",
      overflow: "hidden",
      transition: isTablet ? "width 0.2s ease" : undefined,
    }}>
      {tabletPaletteCollapsed ? (
        <button onClick={() => setPaletteOpen(true)} title="Show components"
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: W.muted, padding: "12px 0", fontFamily: "inherit" }}>
          <PanelLeftOpen size={16} />
          <span style={{ fontSize: 8, writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.1em", fontWeight: 800, textTransform: "uppercase", color: W.muted }}>Components</span>
        </button>
      ) : (<>
        <div style={{ padding: "12px 14px 8px", fontSize: 10, fontWeight: 800, color: W.muted, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Components</span>
          {isTablet && (
            <button onClick={() => setPaletteOpen(false)} title="Collapse" style={{ background: "none", border: "none", cursor: "pointer", color: W.muted, padding: 0, display: "flex", lineHeight: 1 }}>
              <PanelLeft size={14} />
            </button>
          )}
        </div>
        {selectedId && !isMobile && (
          <div style={{ padding: "6px 10px", background: W.accentLo, borderBottom: "1px solid " + W.border, fontSize: 9, color: W.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Plus size={9} /> Inserts after selected block
          </div>
        )}
        <div style={{ overflow: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {PALETTE.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", background: W.panel, border: "1px solid " + W.border, borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.background = W.accentLo; e.currentTarget.style.borderColor = W.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = W.panel; e.currentTarget.style.borderColor = W.border; }}
            >
              <div style={{ width: 28, height: 28, background: W.surface, border: "1px solid " + W.border, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: W.sub, flexShrink: 0 }}>
                <bt.Icon size={14} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: W.text }}>{bt.label}</div>
                <div style={{ fontSize: 9, color: W.muted, marginTop: 1 }}>{bt.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {!isMobile && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", fontSize: 10, color: W.muted, lineHeight: 1.5, flexShrink: 0 }}>
            Click to add · Drag to reorder
          </div>
        )}
      </>)}
    </div>
  );

  // ── Canvas ───────────────────────────────────────────────────────────────────
  const canvasPanel = (
    <div
      style={{ flex: 1, display: isMobile && mobileTab !== "canvas" ? "none" : undefined, overflowY: "auto", minHeight: 0, background: W.bg, padding: isMobile ? "16px 12px" : "32px 20px", boxSizing: "border-box" }}
      onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
    >
      <div
        style={{ width: Math.min(json.containerWidth || 600, isMobile ? winWidth - 24 : 700), maxWidth: "100%", margin: "0 auto", background: json.containerBg || "#fff", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden", minHeight: 200 }}
        onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
      >
        {json.blocks.length === 0 && (
          <div style={{ padding: "64px 32px", textAlign: "center", color: W.muted, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Mail size={36} color={W.muted} /></div>
            <div style={{ fontWeight: 600, color: W.sub, marginBottom: 6 }}>Canvas is empty</div>
            <div>{isMobile ? "Tap Components to add a block." : "Click a component on the left to add it here."}</div>
          </div>
        )}

        {json.blocks.map((block, idx) => {
          const sel          = block.id === selectedId;
          const isEditing    = block.id === editingId;
          const canEdit      = EDITABLE_TYPES.includes(block.type);
          const dropHere     = dragOver === idx && dragSrc !== null && dragSrc !== idx;
          const beingDragged = dragSrc === idx;

          return (
            <div
              key={block.id}
              draggable={!isEditing}
              onDragStart={!isEditing ? e => onDragStart(e, idx) : undefined}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              onClick={e => { e.stopPropagation(); if (editingId && editingId !== block.id) setEditingId(null); setSelectedId(block.id); if (isMobile) setMobileTab("style"); }}
              onDoubleClick={e => { e.stopPropagation(); if (canEdit) { setSelectedId(block.id); setEditingId(block.id); } }}
              style={{ position: "relative", outline: isEditing ? "2px solid #6366f1" : sel ? "2px solid #6366f180" : dropHere ? "2px solid #a5b4fc" : "2px solid transparent", outlineOffset: -2, borderTop: dropHere ? "3px solid #6366f1" : "3px solid transparent", opacity: beingDragged ? 0.35 : 1, cursor: isEditing ? "text" : "pointer", transition: "opacity 0.1s" }}
            >
              {sel && !isEditing && canEdit && (
                <div style={{ position: "absolute", top: 4, left: 4, zIndex: 5, fontSize: 9, color: W.accent, background: W.accentLo, padding: "2px 6px", borderRadius: 4, pointerEvents: "none", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                  <Pencil size={9} /> Double-click to edit
                </div>
              )}
              {sel && !isEditing && (
                <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3, zIndex: 10 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => idx > 0 && moveBlock(idx, idx - 1)} disabled={idx === 0} title="Move up" style={cc("#f8fafc", W.sub)}><ChevronUp size={12} /></button>
                  <button onClick={() => idx < json.blocks.length - 1 && moveBlock(idx, idx + 1)} disabled={idx === json.blocks.length - 1} title="Move down" style={cc("#f8fafc", W.sub)}><ChevronDown size={12} /></button>
                  <button onClick={() => dupBlock(block.id)} title="Duplicate" style={cc("#f8fafc", W.sub)}><Copy size={12} /></button>
                  <button onClick={() => delBlock(block.id)} title="Delete" style={cc(W.redLo, W.red)}><Trash2 size={12} /></button>
                </div>
              )}
              {isEditing && (
                <div style={{ position: "absolute", top: 4, right: 4, zIndex: 10 }} onClick={e => e.stopPropagation()}>
                  <button onMouseDown={e => { e.preventDefault(); setEditingId(null); }} style={{ ...cc(W.accentLo, W.accent), fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={11} /> Done
                  </button>
                </div>
              )}
              {isEditing
                ? <InlineEdit block={block} onUpdate={(key, val) => updateBlockById(block.id, key, val)} onDone={() => setEditingId(null)} />
                : <BlockPreview block={block} />
              }
            </div>
          );
        })}
      </div>
      {!isMobile && (
        <div style={{ marginTop: 16, fontSize: 10, color: W.muted, textAlign: "center" }}>
          {json.containerWidth || 600}px container · {json.blocks.length} block{json.blocks.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );

  // ── Properties panel ─────────────────────────────────────────────────────────
  const tabletPropsCollapsed = isTablet && !propsOpen;
  const propsPanel = (
    <div style={{
      width: isMobile ? "100%" : tabletPropsCollapsed ? 36 : rightW,
      display: isMobile && mobileTab !== "style" ? "none" : "flex",
      flexDirection: "column",
      flex: isMobile ? "1" : undefined,
      flexShrink: isMobile ? 1 : 0,
      background: W.surface,
      borderLeft: !isMobile ? "1px solid " + W.border : "none",
      overflow: "hidden",
      transition: isTablet ? "width 0.2s ease" : undefined,
    }}>
      {tabletPropsCollapsed ? (
        <button onClick={() => setPropsOpen(true)} title="Show properties"
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: W.muted, padding: "12px 0", fontFamily: "inherit" }}>
          <PanelRightOpen size={16} />
          <span style={{ fontSize: 8, writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.1em", fontWeight: 800, textTransform: "uppercase", color: W.muted }}>Properties</span>
        </button>
      ) : (<>
        {isTablet && (
          <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 800, color: W.muted, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Properties</span>
            <button onClick={() => setPropsOpen(false)} title="Collapse" style={{ background: "none", border: "none", cursor: "pointer", color: W.muted, padding: 0, display: "flex", lineHeight: 1 }}>
              <PanelRight size={14} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <PropsPanel
            json={json} setJson={setJson}
            block={selectedBlock}
            onProp={updateProp}
            onDelete={() => selectedBlock && delBlock(selectedBlock.id)}
            onDuplicate={() => selectedBlock && dupBlock(selectedBlock.id)}
          />
        </div>
      </>)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: W.panel, fontFamily: "'Inter','DM Sans',system-ui,sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{
        height: 54, flexShrink: 0,
        background: TB.bg,
        borderBottom: `1px solid ${TB.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center",
        padding: "0 14px", gap: 6,
        zIndex: 200, overflow: "visible",
      }}>
        {/* Back */}
        <button
          onClick={handleBack}
          disabled={saving}
          style={{ background: TB.hover, border: `1px solid ${TB.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", color: TB.sub, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, opacity: saving ? 0.6 : 1, transition: "all 0.12s" }}
          onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = TB.text; } }}
          onMouseLeave={e => { e.currentTarget.style.background = TB.hover; e.currentTarget.style.color = TB.sub; }}
        >
          <ArrowLeft size={13} />
          {!isMobile && "Templates"}
        </button>

        <div style={{ width: 1, height: 22, background: TB.border, flexShrink: 0, margin: "0 4px" }} />

        {/* Template name */}
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template name"
          style={{ border: "1px solid transparent", borderRadius: 8, padding: "5px 9px", fontSize: 13, fontWeight: 700, color: TB.text, background: "transparent", outline: "none", fontFamily: "inherit", minWidth: isMobile ? 100 : 150, maxWidth: isMobile ? 140 : 200, transition: "all 0.12s" }}
          onFocus={e => { e.currentTarget.style.background = TB.input; e.currentTarget.style.borderColor = TB.border; }}
          onBlur={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        />

        {!isMobile && <>
          <div style={{ width: 1, height: 22, background: TB.border, flexShrink: 0, margin: "0 4px" }} />

          {/* Subject + merge tag picker */}
          <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 80, maxWidth: 260, position: "relative" }}>
            <input
              ref={subjectRef}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject…"
              style={{ flex: 1, border: "1px solid transparent", borderRadius: 8, padding: "5px 30px 5px 9px", fontSize: 12, color: TB.sub, background: "transparent", outline: "none", fontFamily: "inherit", transition: "all 0.12s", width: "100%" }}
              onFocus={e => { e.currentTarget.style.background = TB.input; e.currentTarget.style.borderColor = TB.border; e.currentTarget.style.color = TB.text; }}
              onBlur={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = TB.sub; }}
            />
            <div ref={subjectTagRef} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}>
              <button
                title="Insert merge tag"
                onClick={() => setSubjectTagOpen(o => !o)}
                style={{ padding: "2px 5px", fontSize: 10, borderRadius: 4, border: "1px solid #c7d2fe", background: subjectTagOpen ? "#e0e7ff" : "#eef2ff", color: "#4f46e5", cursor: "pointer", fontFamily: "monospace", lineHeight: 1.6 }}
              >{"{}"}</button>
              {subjectTagOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", zIndex: 300, padding: "8px", minWidth: 220 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Merge Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {MERGE_TAGS.map(tag => (
                      <button
                        key={tag.key}
                        onClick={() => {
                          const el = subjectRef.current;
                          if (!el) return;
                          const s = el.selectionStart ?? subject.length;
                          const e2 = el.selectionEnd ?? subject.length;
                          const next = subject.slice(0, s) + `{{${tag.key}}}` + subject.slice(e2);
                          setSubject(next);
                          setSubjectTagOpen(false);
                          requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + tag.key.length + 4, s + tag.key.length + 4); });
                        }}
                        style={{ padding: "2px 8px", fontSize: 10, borderRadius: 4, cursor: "pointer", background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5", fontFamily: "monospace", lineHeight: 1.8 }}
                      >{`{{${tag.key}}}`}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ width: 1, height: 22, background: TB.border, flexShrink: 0, margin: "0 4px" }} />

          {/* From — verified domain picker */}
          {(() => {
            const isVerified = verifiedDomains.some(d => (d.from_email || `noreply@${d.domain}`) === from);
            const hasFrom    = !!from;
            const showWarn   = !isVerified;

            return (
              <div ref={fromRef} style={{ position: "relative", flexShrink: 0, minWidth: 180, maxWidth: 240 }}>
                <button
                  onClick={() => setFromOpen(o => !o)}
                  style={{
                    width: "100%", background: fromOpen ? TB.input : "transparent",
                    border: `1px solid ${fromOpen ? TB.border : "transparent"}`,
                    borderRadius: 8, padding: "5px 9px 5px 8px", fontSize: 12,
                    color: hasFrom ? TB.text : TB.muted,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { if (!fromOpen) { e.currentTarget.style.background = TB.input; e.currentTarget.style.borderColor = TB.border; } }}
                  onMouseLeave={e => { if (!fromOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
                >
                  {/* Status dot / warning flag */}
                  {hasFrom && isVerified && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  )}
                  {showWarn && (
                    <TriangleAlert size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {from || "From: select domain"}
                  </span>
                  <ChevronDown size={11} color={TB.muted} style={{ flexShrink: 0, transform: fromOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>

                {/* Unverified warning tag */}
                {hasFrom && !isVerified && (
                  <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, fontSize: 10, fontWeight: 600, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap", zIndex: 999 }}>
                    Domain not verified — Publish blocked
                  </div>
                )}

                {fromOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 260, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", padding: "4px 0", overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{ padding: "8px 12px 7px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", letterSpacing: "0.01em" }}>Sending domain</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>Only verified domains</div>
                    </div>

                    {verifiedDomains.length === 0 ? (
                      <div style={{ padding: "14px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <TriangleAlert size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 3 }}>No verified domains</div>
                          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>Go to <strong>Domains</strong> in the navbar to add and verify a domain.</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "4px 0" }}>
                        {verifiedDomains.map(d => {
                          const email  = d.from_email || `noreply@${d.domain}`;
                          const active = from === email;
                          return (
                            <button
                              key={d.id}
                              onClick={() => { setFrom(email); setFromOpen(false); }}
                              style={{ width: "100%", background: active ? "#eef2ff" : "transparent", border: "none", padding: "8px 12px", fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#4f46e5" : "#0f172a", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 0.1s", boxSizing: "border-box" }}
                              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0, boxShadow: "0 0 4px rgba(34,197,94,0.5)" }} />
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                              {active && <Check size={12} color="#4f46e5" style={{ flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </>}

        {/* Spacer */}
        <div style={{ marginLeft: "auto" }} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {!isMobile && (
            <button
              onClick={() => { setPreviewHtml({ html: jsonToHtml({ ...json, from }), from, subject, name }); }}
              style={{ background: TB.hover, border: `1px solid ${TB.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TB.sub, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = TB.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = TB.hover; e.currentTarget.style.color = TB.sub; }}
            >
              <Eye size={13} /> Preview
            </button>
          )}
          {!isMobile && (
            <button
              onClick={exportHtml}
              style={{ background: TB.hover, border: `1px solid ${TB.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: TB.sub, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = TB.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = TB.hover; e.currentTarget.style.color = TB.sub; }}
            >
              <Download size={13} /> Export
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={saving}
            style={{ background: saving ? "#a5b4fc" : "#6366f1", border: "none", borderRadius: 8, padding: "6px 18px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, boxShadow: saving ? "none" : "0 2px 8px rgba(99,102,241,0.35)", transition: "all 0.12s" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#4f46e5"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#6366f1"; }}
          >
            {saving
              ? <><LoaderCircle size={13} style={{ animation: "_spin 0.8s linear infinite" }} /> Saving…</>
              : <><Send size={13} /> Publish</>
            }
          </button>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <Toast toast={toast} />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <style>{`@keyframes _spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes tbToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {palettePanel}
        {canvasPanel}
        {propsPanel}
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────────────────────── */}
      {isMobile && (
        <div style={{ height: 56, flexShrink: 0, background: TB.bg, borderTop: `1px solid ${TB.border}`, display: "flex", zIndex: 100 }}>
          {[
            { id: "components", label: "Components", Icon: Layers },
            { id: "canvas",     label: "Canvas",     Icon: LayoutTemplate },
            { id: "style",      label: "Style",      Icon: Pencil },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)}
              style={{ flex: 1, background: mobileTab === tab.id ? "rgba(99,102,241,0.15)" : "transparent", border: "none", borderTop: "2px solid " + (mobileTab === tab.id ? W.accent : "transparent"), color: mobileTab === tab.id ? W.accent : TB.sub, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>
              <tab.Icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {previewHtml && <PreviewModal html={previewHtml.html} from={previewHtml.from} subject={previewHtml.subject} templateName={previewHtml.name} onClose={() => setPreviewHtml(null)} />}
    </div>
  );
}

function cc(bg, color) {
  return { background: bg, border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer", color, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" };
}
