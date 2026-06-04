import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Mail, FlaskConical, CheckCircle2,
  Loader2, Check, Search, MoreVertical, Megaphone, ChevronRight, Ban, RotateCcw, Copy,
  Send, Eye, MousePointerClick, Share2, Pencil,
} from "lucide-react";
import ShareLinkModal from "../components/ui/ShareLinkModal";
import { SkeletonRow, SkeletonBlock } from "../components/ui/Loader";
import RefreshBtn from "../components/ui/RefreshBtn";
import { useTheme } from "../context/ThemeContext";
import { usePool } from "../context/PoolContext";
import { analytics } from "../services/analytics";
import {
  getCampaigns, createCampaign, cancelCampaign, restoreCampaign,
  duplicateCampaign, getPublishedTemplates, getActivePool, getClients, updateCampaign,
} from "../services/api";

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  const diff = (Date.now() - d) / 1000;
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function thisWeekCount(list) {
  const cutoff = Date.now() - 7 * 86400 * 1000;
  return list.filter(c => new Date(c.createdAt) > cutoff).length;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getDisplayStatus(campaign) {
  if (campaign.isCanceled || campaign.status === "paused" || campaign.status === "canceled") return "inactive";
  if (campaign.status === "sending" || campaign.status === "sent") return "active";
  return "pending"; // draft
}

function StatusBadge({ status, isCanceled }) {
  const T = useTheme();
  const display = isCanceled ? "inactive" :
    (status === "sending" || status === "sent") ? "active" :
    (status === "paused" || status === "canceled") ? "inactive" : "pending";
  const map = {
    pending:  { label: "Pending",  color: T.muted  },
    active:   { label: "Active",   color: status === "sending" ? T.amber : T.green },
    inactive: { label: "Inactive", color: T.red    },
  };
  const { label, color } = map[display] ?? { label: display, color: T.muted };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", color,
      background: color + "18", border: "1px solid " + color + "40",
      borderRadius: 6, padding: "3px 9px",
    }}>{label}</span>
  );
}

// ── Campaign list row ─────────────────────────────────────────────────────────

const GRID_COLS = "minmax(0,1.8fr) minmax(0,1.4fr) 120px 90px 90px 90px 40px";

function StatCell({ icon: Icon, value, color, T }) {
  if (value === null || value === undefined) {
    return <div style={{ fontSize: 12, color: T.border, fontWeight: 600 }}>—</div>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={11} color={color} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function CampaignRow({ campaign, isLast, onOpen, onEdit, onCancel, onRestore, onDuplicate, onShare }) {
  const T = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos,  setMenuPos]  = useState({ top: 0, right: 0 });
  const [hovered,  setHovered]  = useState(false);
  const menuRef = useRef(null);
  const btnRef  = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setMenuOpen(o => !o);
  };

  const isSent          = !campaign.isCanceled && (campaign.status === "sent" || campaign.status === "sending" || campaign.sentCount > 0);
  const isSending       = !campaign.isCanceled && campaign.status === "sending";
  const displayStatus   = getDisplayStatus(campaign);

  const statusBorder = {
    active:   campaign.status === "sending" ? T.amber : T.green,
    pending:  T.border,
    inactive: T.red,
  }[displayStatus] ?? T.border;

  return (
    <div
      onClick={() => onOpen(campaign)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: GRID_COLS,
        padding: "13px 18px 13px 0",
        borderBottom: isLast ? "none" : "1px solid " + T.border + "55",
        alignItems: "center", cursor: "pointer",
        background: hovered ? T.surface : "transparent",
        borderLeft: "3px solid " + (hovered ? statusBorder : "transparent"),
        transition: "background 0.12s, border-left-color 0.12s",
        paddingLeft: 15,
      }}
    >
      {/* TITLE col */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: campaign.type === "ab_test" ? T.purple + "20" : T.accent + "20",
          border: "1px solid " + (campaign.type === "ab_test" ? T.purple + "35" : T.accent + "35"),
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          {campaign.type === "ab_test"
            ? <FlaskConical size={16} color={T.purple} />
            : <Mail size={16} color={T.accent} />}
          {isSending && (
            <span style={{
              position: "absolute", bottom: -2, right: -2,
              width: 8, height: 8, borderRadius: "50%",
              background: T.amber,
              boxShadow: "0 0 0 2px " + T.card,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span title={campaign.name} style={{
              fontSize: 13, fontWeight: 700, color: T.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {campaign.name}
            </span>
            {campaign.type === "ab_test" && (
              <span style={{ fontSize: 9, fontWeight: 800, flexShrink: 0, color: T.purple, background: T.purple + "18", border: "1px solid " + T.purple + "30", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em" }}>A/B</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {campaign.fromName ? campaign.fromName : "—"}
            {campaign.template?.name ? <span style={{ color: T.border }}> · </span> : ""}
            {campaign.template?.name && <span style={{ color: T.dim }}>{campaign.template.name}</span>}
          </div>
        </div>
      </div>

      {/* SUBJECT col */}
      <div style={{ minWidth: 0, paddingRight: 10 }}>
        <div title={campaign.subject || ""} style={{
          fontSize: 13, color: campaign.subject ? T.dim : T.muted,
          fontStyle: campaign.subject ? "normal" : "italic",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {campaign.subject || "No subject"}
        </div>
        {campaign.type === "ab_test" && campaign.subjectB && (
          <div title={campaign.subjectB} style={{
            fontSize: 11, color: T.muted, marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            B: {campaign.subjectB}
          </div>
        )}
      </div>

      {/* STATUS col */}
      <div>
        <StatusBadge status={campaign.status} isCanceled={campaign.isCanceled} />
      </div>

      {/* SENT col */}
      <StatCell icon={Send} value={isSent ? campaign.sentCount : null} color="#60a5fa" T={T} />

      {/* OPEN col */}
      <StatCell icon={Eye} value={isSent ? campaign.openedCount : null} color="#34d399" T={T} />

      {/* CLICK col */}
      <StatCell icon={MousePointerClick} value={isSent ? campaign.clickedCount : null} color="#a78bfa" T={T} />

      {/* ACTIONS col */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
        <button
          ref={btnRef}
          onClick={openMenu}
          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: menuOpen ? T.surface : "transparent", border: "1px solid " + (menuOpen ? T.border : "transparent"), borderRadius: 7, color: T.muted, cursor: "pointer", transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; }}
          onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div ref={menuRef} style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999, background: T.card, border: "1px solid " + T.border, borderRadius: 10, minWidth: 188, boxShadow: "0 12px 40px rgba(0,0,0,0.7)", padding: "4px 0" }}>
            {[
              { label: "Edit Campaign",      icon: <Pencil size={13} />,    onClick: () => { setMenuOpen(false); onEdit(campaign); } },
              campaign.isCanceled
                ? { label: "Restore Campaign", icon: <RotateCcw size={13} />, onClick: () => { setMenuOpen(false); onRestore(campaign); } }
                : { label: "Cancel Campaign",  icon: <Ban size={13} />,       onClick: () => { setMenuOpen(false); onCancel(campaign); } },
              { label: "Duplicate Campaign", icon: <Copy size={13} />,      onClick: () => { setMenuOpen(false); onDuplicate(campaign); } },
              { label: "Share Link",         icon: <Share2 size={13} />,    onClick: () => { setMenuOpen(false); onShare(campaign); } },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: "none", border: "none", color: T.text, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Wizard shared ─────────────────────────────────────────────────────────────

function StepDot({ n, active, done, label }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: active ? T.accent : done ? T.green : T.border,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color: "#fff",
      }}>
        {done ? <Check size={12} /> : n}
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? T.text : T.muted }}>{label}</span>
    </div>
  );
}

function StepIndicator({ step }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid " + T.border }}>
      <StepDot n={1} label="Campaign info"      active={step === 1} done={step > 1} />
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <StepDot n={2} label="Template & content" active={step === 2} done={step > 2} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required, onKeyDown, autoFocus }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 5, letterSpacing: "0.03em" }}>
        {label}{required && <span style={{ color: T.accent, marginLeft: 2 }}>*</span>}
      </div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 7, boxSizing: "border-box",
          background: T.surface, border: "1px solid " + T.border,
          color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}


function TemplatePickerList({ tpls, selected, onSelect, accent, maxHeight = 220 }) {
  const T = useTheme();
  if (!tpls.length) return (
    <div style={{ padding: "24px 0", textAlign: "center" }}>
      <Mail size={24} color={T.muted} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 12, color: T.muted }}>No published templates.</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Publish one in Templates first.</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight, overflowY: "auto" }}>
      {tpls.map(t => {
        const sel = selected === t.id;
        return (
          <div key={t.id} onClick={() => onSelect(t.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 7, cursor: "pointer",
            border: "1px solid " + (sel ? accent : T.border), background: sel ? accent + "10" : T.card,
            transition: "border-color 0.1s, background 0.1s",
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, flexShrink: 0, background: (sel ? accent : T.muted) + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={12} color={sel ? accent : T.muted} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
              <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject || "No subject"}</div>
            </div>
            {sel && <CheckCircle2 size={13} color={accent} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Template preview (mini scaled render) ─────────────────────────────────────

const PREV_W = 560;

function PreviewBlock({ block }) {
  const { type, props: p } = block;
  if (!p) return null;
  const pt = p.padding?.top    ?? 0;
  const pb = p.padding?.bottom ?? 0;
  const pl = p.padding?.left   ?? 24;
  const pr = p.padding?.right  ?? 24;
  switch (type) {
    case "heading":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <div style={{ margin: 0, fontSize: p.fontSize || 28, fontWeight: p.fontWeight || 700, color: p.color || "#111827", textAlign: p.align || "center", lineHeight: 1.2 }}>{p.text || ""}</div>
        </div>
      );
    case "text":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 15, color: p.color || "#374151", textAlign: p.align || "left", lineHeight: p.lineHeight || 1.6, whiteSpace: "pre-wrap" }}>{p.text || ""}</p>
        </div>
      );
    case "button":
      return (
        <div style={{ padding: "16px 24px", textAlign: p.align || "center" }}>
          <span style={{ display: "inline-block", padding: "12px 28px", background: p.bgColor || "#6366f1", color: p.textColor || "#fff", fontSize: p.fontSize || 14, fontWeight: 600, borderRadius: p.borderRadius || 6 }}>{p.label || "Click Here"}</span>
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
          {p.src
            ? <img src={p.src} alt="" style={{ maxWidth: `${p.width || 100}%`, borderRadius: p.borderRadius || 0, display: "block", margin: "0 auto" }} onError={e => { e.currentTarget.style.display = "none"; }} />
            : <div style={{ height: 80, background: "#e5e7eb", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12 }}>Image</div>
          }
        </div>
      );
    case "footer":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px` }}>
          <p style={{ margin: 0, fontSize: p.fontSize || 12, color: p.color || "#9ca3af", textAlign: p.align || "center", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.text || ""}</p>
        </div>
      );
    case "columns":
      return (
        <div style={{ padding: `${pt}px ${pr}px ${pb}px ${pl}px`, display: "flex", gap: 16 }}>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.leftText || ""}</div>
          <div style={{ flex: 1, fontSize: p.fontSize || 14, color: p.color || "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.rightText || ""}</div>
        </div>
      );
    default: return null;
  }
}

function TemplatePreviewPane({ template }) {
  const T = useTheme();
  const wrapRef = useRef(null);
  const [paneW, setPaneW] = useState(240);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPaneW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale   = paneW / PREV_W;
  const blocks  = template?.body?.blocks || [];
  const emailBg = template?.body?.containerBg || "#ffffff";
  const pageBg  = template?.body?.backgroundColor || "#f4f4f4";
  const isHtml  = template?.body?.editorMode === "html";
  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: template ? pageBg : T.bg }}>
      {!template ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Mail size={22} color={T.muted} strokeWidth={1.5} />
          <div style={{ fontSize: 11, color: T.muted }}>Select a template</div>
        </div>
      ) : isHtml && template.htmlOutput ? (
        <div style={{ position: "absolute", top: 0, left: 0, width: PREV_W, transformOrigin: "top left", transform: `scale(${scale})`, pointerEvents: "none" }}
          dangerouslySetInnerHTML={{ __html: template.htmlOutput }} />
      ) : blocks.length > 0 ? (
        <div style={{ position: "absolute", top: 0, left: 0, width: PREV_W, background: emailBg, transformOrigin: "top left", transform: `scale(${scale})`, pointerEvents: "none", fontFamily: "'Inter', system-ui, sans-serif" }}>
          {blocks.map(b => <PreviewBlock key={b.id} block={b} />)}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Mail size={20} color={T.muted} strokeWidth={1.5} />
          <div style={{ fontSize: 11, color: T.muted }}>No content yet</div>
        </div>
      )}
    </div>
  );
}

// ── Wizard Step 1 ─────────────────────────────────────────────────────────────

function WizardStep1({ form, setForm, onNext, onClose }) {
  const T = useTheme();
  const nameOk = form.name.trim().length > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={1} />
      <div style={{ padding: "22px 24px 0" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 8, letterSpacing: "0.04em" }}>CAMPAIGN TYPE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
            {[
              { id: "regular", label: "Regular",  icon: Mail,         desc: "One email to all" },
              { id: "ab_test", label: "A/B Test",  icon: FlaskConical, desc: "Split 50 / 50" },
            ].map(({ id, label, icon: Icon, desc }, i) => {
              const active = form.type === id;
              return (
                <button key={id} onClick={() => setForm(f => ({ ...f, type: id }))} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  padding: "16px 12px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: active ? T.accent + "15" : T.surface, color: active ? T.accent : T.muted,
                  borderRight: i === 0 ? "1px solid " + T.border : "none",
                  transition: "background 0.1s, color 0.1s",
                }}>
                  <Icon size={18} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 400 }}>{label}</span>
                  <span style={{ fontSize: 10, color: active ? T.accent + "cc" : T.muted, textAlign: "center" }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <Field label="Campaign name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
            placeholder="e.g. Q2 Towing Outreach" onKeyDown={e => e.key === "Enter" && nameOk && onNext()} autoFocus />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid " + T.border }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={onNext} disabled={!nameOk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 7, border: "none", background: nameOk ? T.accent : T.border, color: nameOk ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, cursor: nameOk ? "pointer" : "default", fontFamily: "inherit" }}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Wizard Step 2 ─────────────────────────────────────────────────────────────

function WizardStep2({ form, setForm, templates, saving, onBack, onCreate, clientName }) {
  const T = useTheme();
  const [tpls, setTpls] = useState(templates);
  const [loading, setLoading] = useState(!templates.length);

  useEffect(() => {
    if (templates.length) { setTpls(templates); return; }
    setLoading(true);
    getPublishedTemplates().then(setTpls).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Pre-fill fromName with client name on mount (only if still blank)
  useEffect(() => {
    if (clientName) {
      setForm(f => ({ ...f, fromName: f.fromName || clientName }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName]);

  const selectedTpl = tpls.find(t => t.id === form.templateId) || null;

  // When a template is picked, always override subject + fromEmail from template
  const handleSelectTemplate = (id) => {
    const tpl = tpls.find(t => t.id === id);
    const tplFromEmail = tpl?.fromEmail || tpl?.body?.from || '';
    setForm(f => ({
      ...f,
      templateId: id,
      subject:   tpl?.subject   || f.subject,
      fromName:  f.fromName     || clientName || '',
      fromEmail: tplFromEmail   || f.fromEmail,
    }));
  };

  const handleSelectTemplateB = (id) => {
    const tpl = tpls.find(t => t.id === id);
    setForm(f => ({
      ...f,
      templateIdB: id,
      subjectB: tpl?.subject || f.subjectB,
    }));
  };

  const isAB = form.type === "ab_test";
  const canCreate = form.templateId && !saving;

  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid " + T.border, marginTop: 4 }}>
      <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
      <button onClick={onCreate} disabled={!canCreate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 7, border: "none", background: canCreate ? T.accent : T.border, color: canCreate ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, cursor: canCreate ? "pointer" : "default", fontFamily: "inherit" }}>
        {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : <><Plus size={13} /> Create Campaign</>}
      </button>
    </div>
  );

  const fromRow = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="From Name"  value={form.fromName}  onChange={v => setForm(f => ({ ...f, fromName: v }))}  placeholder={clientName || "Company name"} />
      <Field label="From Email" type="email" value={form.fromEmail} onChange={v => setForm(f => ({ ...f, fromEmail: v }))} placeholder="sales@yourdomain.com" />
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={2} />
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} h={52} radius={8} />
        ))}
      </div>
      {footer}
    </div>
  );

  if (isAB) {
    const sameTemplate = form.templateIdB === null;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <StepIndicator step={2} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, border: "1px solid " + T.blue + "50", borderRadius: 10, padding: 14, background: T.blue + "04" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.blue, marginBottom: 10, letterSpacing: "0.08em" }}>VARIANT A</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6 }}>Template</div>
              <TemplatePickerList tpls={tpls} selected={form.templateId} onSelect={handleSelectTemplate} accent={T.blue} maxHeight={160} />
              <div style={{ marginTop: 12 }}>
                <Field label="Subject A" required value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Subject for Variant A" />
              </div>
            </div>
            <div style={{ flex: 1, border: "1px solid " + T.orange + "50", borderRadius: 10, padding: 14, background: T.orange + "04" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.orange, marginBottom: 10, letterSpacing: "0.08em" }}>VARIANT B</div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={sameTemplate} onChange={e => setForm(f => ({ ...f, templateIdB: e.target.checked ? null : (tpls.find(t => t.id !== f.templateId)?.id ?? tpls[0]?.id ?? null) }))} style={{ accentColor: T.orange }} />
                <span style={{ fontSize: 11, color: T.muted }}>Same template as A</span>
              </label>
              {!sameTemplate && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6 }}>Template B</div>
                  <TemplatePickerList tpls={tpls} selected={form.templateIdB} onSelect={handleSelectTemplateB} accent={T.orange} maxHeight={120} />
                </>
              )}
              <div style={{ marginTop: 12 }}>
                <Field label="Subject B" required value={form.subjectB} onChange={v => setForm(f => ({ ...f, subjectB: v }))} placeholder="Subject for Variant B" />
              </div>
            </div>
          </div>
          {fromRow}
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <StepIndicator step={2} />
      <div style={{ display: "flex", minHeight: 360 }}>
        {/* Template list */}
        <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid " + T.border, padding: "18px 14px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 10, letterSpacing: "0.04em" }}>SELECT TEMPLATE</div>
          <TemplatePickerList tpls={tpls} selected={form.templateId} onSelect={handleSelectTemplate} accent={T.accent} maxHeight={290} />
        </div>
        {/* Live preview */}
        <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid " + T.border, overflowY: "hidden" }}>
          <TemplatePreviewPane template={selectedTpl} />
        </div>
        {/* Form fields */}
        <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <Field label="Subject Line" required value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Your compelling subject line…" />
          {fromRow}
        </div>
      </div>
      {footer}
    </div>
  );
}

// ── New Campaign Modal ────────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onCreated }) {
  const T = useTheme();
  const { clientId: poolClientId } = getActivePool();
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [templates, setTemplates] = useState([]);
  const [clientName, setClientName] = useState("");
  const [form, setForm] = useState({
    type: "regular", name: "",
    templateId: null, templateIdB: null,
    subject: "", subjectB: "", fromName: "", fromEmail: "",
  });

  // Fetch client name for auto-fill
  useEffect(() => {
    if (!poolClientId) return;
    getClients().then(clients => {
      const match = clients.find(c => c.id === poolClientId);
      if (match?.name) setClientName(match.name);
    }).catch(() => {});
  }, [poolClientId]);

  const goStep2 = useCallback(() => {
    setStep(2);
    getPublishedTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      const campaign = await createCampaign({
        name: form.name.trim(), type: form.type, clientId: poolClientId || null,
        templateId: form.templateId, templateIdB: form.templateIdB || null,
        subject: form.subject.trim(), subjectB: form.type === "ab_test" ? form.subjectB.trim() : "",
        fromName: form.fromName.trim(), fromEmail: form.fromEmail.trim(),
      });
      analytics.campaignCreated({ clientId: poolClientId || null });
      onCreated(campaign);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }, [form, poolClientId, onCreated]);

  const modalWidth = step === 1 ? 520 : form.type === "ab_test" ? 830 : 800;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 14, width: modalWidth, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 28px 80px rgba(0,0,0,0.8)", transition: "width 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Create an email campaign</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 4 }}>✕</button>
        </div>
        {step === 1
          ? <WizardStep1 form={form} setForm={setForm} onNext={goStep2} onClose={onClose} />
          : <WizardStep2 form={form} setForm={setForm} templates={templates} saving={saving} onBack={() => setStep(1)} onCreate={handleCreate} clientName={clientName} />
        }
      </div>
    </div>
  );
}

// ── Edit Campaign Modal ────────────────────────────────────────────────────────

function EditCampaignModal({ campaign, onClose, onSaved }) {
  const T = useTheme();
  const [form, setForm] = useState({
    name:        campaign.name        || "",
    subject:     campaign.subject     || "",
    subjectB:    campaign.subjectB    || "",
    fromName:    campaign.fromName    || "",
    fromEmail:   campaign.fromEmail   || "",
    templateId:  campaign.templateId  || null,
    templateIdB: campaign.templateIdB || null,
  });
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const isAB = campaign.type === "ab_test";

  useEffect(() => {
    getPublishedTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateCampaign(campaign.id, {
        name:        form.name.trim(),
        subject:     form.subject.trim(),
        subjectB:    form.subjectB.trim(),
        fromName:    form.fromName.trim(),
        fromEmail:   form.fromEmail.trim(),
        templateId:  form.templateId  || null,
        templateIdB: form.templateIdB || null,
      });
      onSaved(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const TemplatePicker = ({ selected, onSelect, accent, label }) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid " + T.border, borderRadius: 8, padding: 8 }}>
        {templates.length === 0
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} h={44} radius={6} style={{ marginBottom: 6 }} />)
          : templates.map(t => {
              const sel = selected === t.id;
              return (
                <div key={t.id} onClick={() => onSelect(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6,
                  cursor: "pointer", marginBottom: 4,
                  border: "1px solid " + (sel ? accent + "80" : T.border),
                  background: sel ? accent + "10" : "transparent",
                }}>
                  <Mail size={12} color={sel ? accent : T.muted} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{t.subject || "No subject"}</div>
                  </div>
                  {sel && <CheckCircle2 size={12} color={accent} />}
                </div>
              );
            })
        }
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, border: "1px solid " + T.border, borderRadius: 12,
        width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid " + T.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={15} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Edit Campaign</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{campaign.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Campaign Name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Campaign name" />

          <TemplatePicker
            label={isAB ? "Template A" : "Template"}
            selected={form.templateId}
            onSelect={id => {
              const tpl = templates.find(t => t.id === id);
              setForm(f => ({ ...f, templateId: id, subject: f.subject || tpl?.subject || "" }));
            }}
            accent={T.accent}
          />

          <Field label={isAB ? "Subject A" : "Subject Line"} value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="Your email subject…" />

          {isAB && (
            <>
              <TemplatePicker
                label="Template B"
                selected={form.templateIdB}
                onSelect={id => {
                  const tpl = templates.find(t => t.id === id);
                  setForm(f => ({ ...f, templateIdB: id, subjectB: f.subjectB || tpl?.subject || "" }));
                }}
                accent={T.orange}
              />
              <Field label="Subject B" value={form.subjectB} onChange={v => setForm(f => ({ ...f, subjectB: v }))} placeholder="Subject for variant B…" />
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="From Name"  value={form.fromName}  onChange={v => setForm(f => ({ ...f, fromName: v }))}  placeholder="Company name" />
            <Field label="From Email" type="email" value={form.fromEmail} onChange={v => setForm(f => ({ ...f, fromEmail: v }))} placeholder="sales@yourdomain.com" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 22px", borderTop: "1px solid " + T.border }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: form.name.trim() ? T.accent : T.border,
              color: form.name.trim() ? "#fff" : T.muted,
              fontSize: 13, fontWeight: 600,
              cursor: saving || !form.name.trim() ? "default" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel / Restore Modals ────────────────────────────────────────────────────

function CancelCampaignModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  const [reason, setReason] = useState("");
  const canConfirm = reason.trim().length > 0 && !loading;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.red + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ban size={16} color={T.red} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Cancel campaign?</div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, lineHeight: 1.6 }}>
          "<strong style={{ color: T.text }}>{campaign.name}</strong>" will be marked as canceled. You can restore it at any time.
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.03em" }}>
            CANCELLATION REASON <span style={{ color: T.red }}>*</span>
          </div>
          <textarea
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this campaign is being canceled…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 7,
              background: T.surface, border: "1px solid " + (reason.trim() ? T.border : T.red + "60"),
              color: T.text, fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical",
            }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = reason.trim() ? T.border : T.red + "60"}
          />
          {!reason.trim() && <div style={{ fontSize: 10, color: T.red, marginTop: 4 }}>Required before canceling.</div>}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Keep</button>
          <button onClick={() => onConfirm(reason.trim())} disabled={!canConfirm} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 7, border: "none", background: canConfirm ? T.red : T.border, color: canConfirm ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, cursor: canConfirm ? "pointer" : "default", fontFamily: "inherit" }}>
            {loading ? "Canceling…" : <><Ban size={12} /> Cancel Campaign</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreCampaignModal({ campaign, onClose, onConfirm, loading }) {
  const T = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.green + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RotateCcw size={16} color={T.green} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Restore campaign?</div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.6 }}>
          "<strong style={{ color: T.text }}>{campaign.name}</strong>" will be restored to its previous status.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          <button onClick={onConfirm} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 7, border: "none", background: T.green, color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Restoring…" : <><RotateCcw size={12} /> Restore</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const T = useTheme();
  const navigate = useNavigate();
  const { clientId } = usePool();
  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showNew,      setShowNew]      = useState(false);
  const [toEdit,       setToEdit]       = useState(null);
  const [toCancel,     setToCancel]     = useState(null);
  const [toRestore,    setToRestore]    = useState(null);
  const [acting,       setActing]       = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shareTarget,  setShareTarget]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCampaigns();
      setCampaigns(Array.isArray(c) ? c : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = useCallback(campaign => {
    setShowNew(false);
    navigate("/campaigns/" + campaign.id);
  }, [navigate]);

  const handleCancel = useCallback(async (reason) => {
    if (!toCancel) return;
    setActing(true);
    try {
      const updated = await cancelCampaign(toCancel.id, reason);
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      setToCancel(null);
    } catch (err) { console.error(err); }
    finally { setActing(false); }
  }, [toCancel]);

  const handleRestore = useCallback(async () => {
    if (!toRestore) return;
    setActing(true);
    try {
      const updated = await restoreCampaign(toRestore.id);
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      setToRestore(null);
    } catch (err) { console.error(err); }
    finally { setActing(false); }
  }, [toRestore]);

  const handleDuplicate = useCallback(async (campaign) => {
    try {
      const copy = await duplicateCampaign(campaign.id);
      navigate("/campaigns/" + copy.id);
    } catch (err) { console.error(err); }
  }, [navigate]);

  const filtered = campaigns.filter(c => {
    const displayStatus = getDisplayStatus(c);
    const matchStatus = statusFilter === "all" || displayStatus === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.template?.name || "").toLowerCase().includes(q)
      || (c.fromName || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const total    = campaigns.length;
  const pending  = campaigns.filter(c => getDisplayStatus(c) === "pending").length;
  const active   = campaigns.filter(c => getDisplayStatus(c) === "active").length;
  const inactive = campaigns.filter(c => getDisplayStatus(c) === "inactive").length;
  const newThisWeek = thisWeekCount(campaigns);

  return (
    <div style={{ width: "100%", padding: "20px 20px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.35); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.accent}30, ${T.accent}10)`,
            border: "1px solid " + T.accent + "35",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Megaphone size={20} color={T.accent} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
              Email Campaigns
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {total > 0
                ? `${total} campaign${total !== 1 ? "s" : ""}${newThisWeek > 0 ? ` · +${newThisWeek} this week` : ""}`
                : "Create and manage your email campaigns"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <RefreshBtn onClick={load} loading={loading} style={{ borderRadius: 8 }} />
          <button
            onClick={() => setShowNew(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px " + T.accent + "40" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total",    value: total,    sub: "all campaigns",     color: T.accent,  icon: Megaphone    },
          { label: "Pending",  value: pending,  sub: "not yet sent",      color: T.muted,   icon: Mail         },
          { label: "Active",   value: active,   sub: "sent or sending",   color: T.green,   icon: CheckCircle2 },
          { label: "Inactive", value: inactive, sub: "stopped or paused", color: T.red,     icon: Ban          },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} style={{
            padding: "16px 18px",
            background: T.card,
            border: "1px solid " + T.border,
            borderTop: "2px solid " + color,
            borderRadius: 12,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={11} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: T.card, border: "1px solid " + T.border,
        borderRadius: 11, padding: "10px 14px",
      }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            placeholder="Search campaigns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 7, border: "1px solid " + T.border, background: T.surface, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
        <div style={{ width: 1, height: 24, background: T.border }} />
        {["all", "pending", "active", "inactive"].map(s => {
          const isActive = statusFilter === s;
          const labelMap = { all: "All", pending: "Pending", active: "Active", inactive: "Inactive" };
          const colorMap  = { all: T.accent, pending: T.muted, active: T.green, inactive: T.red };
          const c = colorMap[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "5px 12px", borderRadius: 7, border: "1px solid " + (isActive ? c + "60" : "transparent"),
              background: isActive ? c + "15" : "transparent",
              color: isActive ? c : T.muted, fontSize: 12, fontWeight: isActive ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            }}>
              {labelMap[s]}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}</tbody>
          </table>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 20px", background: T.card, border: "1px solid " + T.border, borderRadius: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: T.accent + "12", border: "1px solid " + T.accent + "25", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Megaphone size={30} color={T.accent} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 22, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            Create your first email campaign to start reaching out to your contacts.
          </div>
          <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px " + T.accent + "40" }}>
            <Plus size={14} /> Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 14, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: GRID_COLS,
            padding: "9px 18px 9px 18px",
            borderBottom: "1px solid " + T.border,
            background: T.surface,
          }}>
            {[
              { label: "Campaign", },
              { label: "Subject", },
              { label: "Status", },
              { label: "Sent",  color: "#60a5fa" },
              { label: "Opens", color: "#34d399" },
              { label: "Clicks",color: "#a78bfa" },
              { label: "" },
            ].map(({ label, color }, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: color || T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
              No campaigns match your filter.
            </div>
          ) : (
            filtered.map((c, idx) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                isLast={idx === filtered.length - 1}
                onOpen={() => navigate("/campaigns/" + c.id)}
                onEdit={setToEdit}
                onCancel={setToCancel}
                onRestore={setToRestore}
                onDuplicate={handleDuplicate}
                onShare={setShareTarget}
              />
            ))
          )}
        </div>
      )}

      {showNew  && <NewCampaignModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      {toEdit   && (
        <EditCampaignModal
          campaign={toEdit}
          onClose={() => setToEdit(null)}
          onSaved={updated => {
            setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
            setToEdit(null);
          }}
        />
      )}
      {toCancel  && <CancelCampaignModal  campaign={toCancel}  onClose={() => setToCancel(null)}  onConfirm={handleCancel}  loading={acting} />}
      {toRestore && <RestoreCampaignModal campaign={toRestore} onClose={() => setToRestore(null)} onConfirm={handleRestore} loading={acting} />}
      {shareTarget && (
        <ShareLinkModal
          title={`Share "${shareTarget.name}"`}
          url={`${window.location.origin}/campaigns/${shareTarget.id}`}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
