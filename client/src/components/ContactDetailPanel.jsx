import { useState, useEffect, useRef, forwardRef, useCallback, createContext, useContext } from "react";
import Btn from "./ui/Btn";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";
import { Spinner } from "./ui/Loader";

const ACTION_CFG = {
  CREATE: { label: "Created", color: "#22c55e", icon: "✦" },
  UPDATE: { label: "Updated", color: "#6366f1", icon: "✎" },
  CANCEL: { label: "Canceled", color: "#ef4444", icon: "✕" },
  RESTORE: { label: "Restored", color: "#22c55e", icon: "↩" },
};

const SOCIAL_FIELDS = [
  { key: "facebook",  label: "Facebook",    color: "#1877f2", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram",   color: "#e1306c", placeholder: "https://instagram.com/yourhandle" },
  { key: "linkedin",  label: "LinkedIn",    color: "#0a66c2", placeholder: "https://linkedin.com/in/profile" },
  { key: "twitter",   label: "Twitter / X", color: "#1da1f2", placeholder: "https://twitter.com/handle" },
  { key: "youtube",   label: "YouTube",     color: "#ff0000", placeholder: "https://youtube.com/@channel" },
  { key: "yelp",      label: "Yelp",        color: "#d32323", placeholder: "https://yelp.com/biz/name" },
  { key: "pinterest", label: "Pinterest",   color: "#e60023", placeholder: "https://pinterest.com/profile" },
  { key: "tiktok",    label: "TikTok",      color: "#010101", placeholder: "https://tiktok.com/@handle" },
];

// Module-level drag state — avoids DataTransfer.types unreliability
let _secDragIdx = null;   // index into visibleContainers being dragged
let _fieldDrag  = null;   // { field, fromContainerId }

const FIELD_DEFS = {
  firstName:     { key: "firstName",     label: "First Name" },
  lastName:      { key: "lastName",      label: "Last Name" },
  title:         { key: "title",         label: "Job Title" },
  email:         { key: "email",         label: "Email",         type: "email",  colorKey: "accent" },
  phone:         { key: "phone",         label: "Phone",         type: "tel",    phoneKey: true },
  website:       { key: "website",       label: "Website",                       colorKey: "blue", autoHttps: true },
  address:       { key: "address",       label: "Address" },
  company:       { key: "company",       label: "Company" },
  accountSize:   { key: "accountSize",   label: "Account Size" },
  source:        { key: "source",        label: "Source" },
  campaign:      { key: "campaign",      label: "Campaign" },
  trucks:        { key: "trucks",        label: "# of Trucks",  type: "number", numKey: true },
  contractValue: { key: "contractValue", label: "Contract ($)", type: "number", numKey: true },
};

const DEFAULT_CONTAINERS = [
  { id: "pipeline",  title: "Pipeline Management",   type: "pipeline", width: "full", fieldColumns: 2, collapsible: false, collapsed: false, visible: true,  fields: [] },
  { id: "name_role", title: "Name & Role",           type: "fields",   width: "full", fieldColumns: 3, collapsible: false, collapsed: false, visible: true,  fields: ["firstName", "lastName", "title"] },
  { id: "contact",   title: "Contact Info",          type: "fields",   width: "half", fieldColumns: 1, collapsible: false, collapsed: false, visible: true,  fields: ["email", "phone", "website", "address"] },
  { id: "company",   title: "Company & Acquisition", type: "fields",   width: "half", fieldColumns: 1, collapsible: false, collapsed: false, visible: true,  fields: ["company", "accountSize", "source", "campaign", "trucks", "contractValue"] },
  { id: "notes",     title: "Notes",                 type: "notes",    width: "full", fieldColumns: 1, collapsible: true,  collapsed: false, visible: true,  fields: [] },
  { id: "social",    title: "Social Media",          type: "social",   width: "full", fieldColumns: 2, collapsible: true,  collapsed: false, visible: true,  fields: [] },
  { id: "tags",      title: "Tags",                  type: "tags",     width: "full", fieldColumns: 1, collapsible: true,  collapsed: false, visible: true,  fields: [] },
];

const SectionDragCtx = createContext(null);

const DEFAULT_FIELD_SETTINGS = {
  email: true, phone: true, website: true, address: true, city: true,
  company: true, title: true, accountSize: true, source: true, campaign: true,
  notes: true, tags: true, trucks: true, contractValue: true, leadScore: true,
  social_facebook: true, social_instagram: true, social_linkedin: true,
  social_twitter: true, social_youtube: true, social_yelp: true,
  social_pinterest: true, social_tiktok: true,
};

const LEAD_STATE_OPTS = [
  { value: "prospect",   label: "Prospect" },
  { value: "lead",       label: "Lead" },
  { value: "warm",       label: "Warm Lead" },
  { value: "hot",        label: "Hot Lead" },
  { value: "customer",   label: "Customer" },
  { value: "backburner", label: "Backburner" },
  { value: "lost",       label: "Lost" },
];

function groupContainers(visible) {
  const rows = [];
  let i = 0;
  while (i < visible.length) {
    if (visible[i].width === "full") {
      rows.push([visible[i]]);
      i++;
    } else {
      const group = [visible[i]];
      i++;
      while (i < visible.length && visible[i].width !== "full") {
        group.push(visible[i]);
        i++;
      }
      rows.push(group);
    }
  }
  return rows;
}

function mergeContainers(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_CONTAINERS;
  const defaults = Object.fromEntries(DEFAULT_CONTAINERS.map(c => [c.id, c]));
  const savedIds = new Set(saved.map(c => c.id));
  const merged = saved.map(s => ({ ...(defaults[s.id] || {}), ...s }));
  DEFAULT_CONTAINERS.forEach(def => {
    if (!savedIds.has(def.id)) merged.push(def);
  });
  return merged;
}

function contactToForm(c) {
  return {
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    company: c.company || "",
    title: c.title || "",
    email: c.email || "",
    phone: c.phone || "",
    website: c.website || "",
    address: c.address || "",
    socialLinks: c.socialLinks || {},
    trucks: c.trucks != null ? String(c.trucks) : "",
    lifecycleStage: c.lifecycleStage || "new",
    leadState: c.leadState || "prospect",
    source: c.source || "",
    campaign: c.campaign || "",
    tags: Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || ""),
    notes: c.notes || "",
    contractValue: c.contractValue != null ? String(c.contractValue) : "",
    accountSize: c.accountSize || "",
    ownedBy: c.ownedBy || "",
  };
}

function emptyForm(currentUser) {
  return {
    firstName: "", lastName: "", company: "", title: "",
    email: "", phone: "", website: "", address: "",
    socialLinks: {},
    trucks: "", lifecycleStage: "new", leadState: "prospect",
    source: "", campaign: "",
    tags: "", notes: "", contractValue: "", accountSize: "",
    ownedBy: currentUser?.name || "",
  };
}

export default function ContactDetailPanel({
  contact, onSave, onAction, currentUser, pool, clientId,
  onFormChange, onDirtyChange,
}) {
  const T = useTheme();
  const toast = useAppToast();
  const isNew = !contact;

  const [form, setForm]               = useState(() => isNew ? emptyForm(currentUser) : contactToForm(contact));
  const [saveStatus, setSaveStatus]   = useState(null);
  const [auditLog, setAuditLog]       = useState([]);
  const [fieldVis, setFieldVis]       = useState(DEFAULT_FIELD_SETTINGS);
  const [noteClicked, setNoteClicked] = useState(false);
  const [editMode, setEditMode]       = useState(true);
  const [containers, setContainers]   = useState(DEFAULT_CONTAINERS);
  const [layoutMode, setLayoutMode]   = useState(false);
  const [secOver, setSecOver]         = useState(null);
  const [addingContainer, setAddingContainer] = useState(false);
  const [newContTitle, setNewContTitle]       = useState("");
  const [newContType, setNewContType]         = useState("fields");
  const secDragging = useRef(null);

  const firstNameRef    = useRef(null);
  const panelRef        = useRef(null);
  const statusTimerRef  = useRef(null);
  const formRef         = useRef(form);
  const dirtyRef        = useRef(false);
  const editModeRef     = useRef(editMode);
  const layoutModeRef   = useRef(layoutMode);
  formRef.current      = form;
  editModeRef.current  = editMode;
  layoutModeRef.current = layoutMode;

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const doSaveRef = useRef(null);
  doSaveRef.current = async () => {
    if (isNew || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveStatus("saving");
    onDirtyChange?.(true);
    try {
      await onSave(buildPayload(formRef.current));
      setSaveStatus("saved");
      onDirtyChange?.(false);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      dirtyRef.current = true;
      setSaveStatus(null);
      toast.error(err?.message || "Auto-save failed");
    }
  };

  useEffect(() => () => { clearTimeout(statusTimerRef.current); }, []);

  // ── Reset on contact change ────────────────────────────────────────────────
  useEffect(() => {
    dirtyRef.current = false;
    const next = contact ? contactToForm(contact) : emptyForm(currentUser);
    formRef.current = next;
    setForm(next);
    setSaveStatus(null);
    setAuditLog([]);
    setEditMode(true);
    onDirtyChange?.(false);
    onFormChange?.(next);
  }, [contact?.id]); // eslint-disable-line

  useEffect(() => {
    if (contact) return; // existing contacts: search bar keeps focus; user presses Enter to focus form
    const t = setTimeout(() => firstNameRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [contact?.id]); // eslint-disable-line

  useEffect(() => {
    if (!contact?.id) return;
    db.getContactClientActivities(contact.id).then(setAuditLog).catch(() => {});
  }, [contact?.id]);

  // ── Field visibility ──────────────────────────────────────────────────────
  useEffect(() => {
    db.getSettings(contact?.clientId || null, "contact_fields")
      .then(res => {
        if (res?.config && Object.keys(res.config).length > 0)
          setFieldVis({ ...DEFAULT_FIELD_SETTINGS, ...res.config });
      })
      .catch(() => {});
  }, [contact?.clientId]);

  // ── Layout: load from backend ─────────────────────────────────────────────
  useEffect(() => {
    db.getSettings(clientId || null, "contact_layout")
      .then(res => {
        if (!Array.isArray(res?.config)) return;
        setContainers(mergeContainers(res.config));
      })
      .catch(() => {});
  }, [clientId]); // eslint-disable-line

  const saveLayout = useCallback(async (conts) => {
    try { await db.saveSettings(clientId || null, "contact_layout", conts); } catch {}
  }, [clientId]);

  const updateContainer = useCallback((id, patch) => {
    setContainers(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch } : c);
      saveLayout(next);
      return next;
    });
  }, [saveLayout]);

  const handleSecDrop = useCallback((srcVisIdx, dstVisIdx) => {
    setContainers(prev => {
      const visible = prev.filter(c => c.visible);
      const srcId = visible[srcVisIdx]?.id;
      const dstId = visible[dstVisIdx]?.id;
      if (!srcId || !dstId || srcId === dstId) return prev;
      const next = [...prev];
      const srcAbs = next.findIndex(c => c.id === srcId);
      const [moved] = next.splice(srcAbs, 1);
      const dstAbs = next.findIndex(c => c.id === dstId);
      next.splice(dstAbs, 0, moved);
      saveLayout(next);
      return next;
    });
  }, [saveLayout]);

  const addContainer = useCallback(() => {
    const title = newContTitle.trim();
    if (!title) return;
    const id = "custom_" + Date.now();
    const newCont = { id, title, type: newContType, width: "full", fieldColumns: 1, collapsible: false, collapsed: false, visible: true, fields: [] };
    setContainers(prev => { const next = [...prev, newCont]; saveLayout(next); return next; });
    setAddingContainer(false);
    setNewContTitle("");
  }, [newContTitle, newContType, saveLayout]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && !isNew) {
        const isInsidePanel = panelRef.current?.contains(document.activeElement);
        if (isInsidePanel) return;
        e.preventDefault();
        if (!editModeRef.current) setEditMode(true);
        setTimeout(() => firstNameRef.current?.focus(), 60);
        return;
      }
      if (e.key !== "Escape") return;
      if (isNew) {
        e.stopImmediatePropagation();
        handleAddNew();
      } else if (layoutModeRef.current) {
        e.stopImmediatePropagation();
        setLayoutMode(false);
      } else if (editModeRef.current) {
        e.stopImmediatePropagation();
        if (dirtyRef.current) doSaveRef.current?.();
        setEditMode(false);
      }
      document.activeElement?.blur?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isNew]); // eslint-disable-line

  const set = (k, v) => {
    const next = { ...formRef.current, [k]: v };
    formRef.current = next;
    dirtyRef.current = true;
    setForm(next);
    onFormChange?.(next);
    onDirtyChange?.(true);
  };

  const setSocial = (k, v) => {
    const next = { ...formRef.current, socialLinks: { ...formRef.current.socialLinks, [k]: v } };
    formRef.current = next;
    dirtyRef.current = true;
    setForm(next);
    onFormChange?.(next);
    onDirtyChange?.(true);
  };

  function buildPayload(f) {
    const fd = f || formRef.current;
    const tagsArr = fd.tags ? fd.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    return {
      ...(contact || {}), ...fd,
      id: contact?.id || ((pool === "prospect" ? "p" : "c") + Date.now()),
      pool: contact?.pool || pool,
      clientId: contact?.clientId || clientId,
      tags: tagsArr,
      trucks: parseInt(fd.trucks) || 0,
      contractValue: parseInt(fd.contractValue) || 0,
      leadScore: contact?.leadScore || 10,
      emailsSent: contact?.emailsSent || 0,
      emailsOpened: contact?.emailsOpened || 0,
      emailsClicked: contact?.emailsClicked || 0,
      callsMade: contact?.callsMade || 0,
      callsAnswered: contact?.callsAnswered || 0,
      lastActivityAt: new Date().toISOString(),
      addedBy: contact?.addedBy || currentUser?.name || "Unknown",
      createdAt: contact?.createdAt || new Date().toISOString(),
    };
  }

  async function handleAddNew() {
    setSaveStatus("saving");
    try {
      await onSave(buildPayload());
      setSaveStatus("saved");
      onDirtyChange?.(false);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus(null);
      toast.error(err?.message || "Failed to add contact");
    }
  }

  // ── Derived display values ────────────────────────────────────────────────
  const personName    = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const heroName      = personName || form.company || form.email || (isNew ? "New Contact" : "Unknown Contact");
  const avatarLetter  = personName
    ? ((form.firstName?.[0] || "") + (form.lastName?.[0] || "")).toUpperCase()
    : (form.company?.[0] || form.email?.[0] || (isNew ? "+" : "?")).toUpperCase();
  const d             = STAGE_DEF[form.lifecycleStage] || STAGE_DEF.new;
  const avatarColor   = (d.color === T.muted || d.color === T.dim) ? T.accent : d.color;
  const show          = (key) => fieldVis[key] !== false;
  const enabledSocials = SOCIAL_FIELDS.filter(({ key }) => fieldVis[`social_${key}`] !== false);
  const parsedTags    = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  const numKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^[\d()]$/.test(e.key)) e.preventDefault();
  };
  const phoneKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^[\d()\-+ ]$/.test(e.key)) e.preventDefault();
  };

  const visibleContainers = containers.filter(c => c.visible);
  const hiddenContainers  = containers.filter(c => !c.visible);
  const rows              = groupContainers(visibleContainers);

  return (
    <div ref={panelRef} style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>

      {/* ── Profile card ─────────────────────────────────────────────── */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>

        {/* Banner */}
        <div style={{ height: 88, position: "relative", background: `linear-gradient(135deg, ${avatarColor}35 0%, ${avatarColor}12 50%, transparent 100%)` }}>
          <div style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 8 }}>
            {saveStatus === "saving" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted }}>
                <Spinner size={10} color={T.muted} /> Saving…
              </span>
            )}
            {saveStatus === "saved" && <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>✓ Saved</span>}
            {isNew && saveStatus === null && <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>Press Esc to save</span>}
            {!isNew && !layoutMode && !editMode && saveStatus === null && <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>Press Enter to edit</span>}
            {!isNew && !layoutMode && editMode && saveStatus === null && <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>Press Esc to save</span>}
            {!isNew && layoutMode && <span style={{ fontSize: 10, color: T.accent, fontStyle: "italic", fontWeight: 600 }}>Press Esc to exit layout</span>}
            {!isNew && (
              <button
                onClick={() => setLayoutMode(lm => !lm)}
                title={layoutMode ? "Exit layout mode" : "Customize layout"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: 6,
                  border: "1px solid " + (layoutMode ? T.accent + "60" : T.border + "80"),
                  background: layoutMode ? T.accent + "20" : T.card + "cc",
                  color: layoutMode ? T.accent : T.muted,
                  cursor: "pointer", flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Profile body */}
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -40, marginBottom: 16 }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${avatarColor}30, ${avatarColor}18)`,
              border: "3px solid " + T.card,
              boxShadow: `0 0 0 2px ${avatarColor}60, 0 6px 20px ${avatarColor}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: avatarColor, letterSpacing: "-0.02em",
            }}>
              {avatarLetter}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 5 }}>
              {heroName}
            </div>
            {(form.title || (form.company && heroName !== form.company)) && (
              <div style={{ fontSize: 13, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[form.title, form.company && heroName !== form.company ? form.company : null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {!isNew && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: contact?.isCanceled ? T.red : T.green,
                background: (contact?.isCanceled ? T.red : T.green) + "15",
                border: "1.5px solid " + (contact?.isCanceled ? T.red : T.green) + "45",
                borderRadius: 6, padding: "3px 10px",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                {contact?.isCanceled ? "Canceled" : "Active"}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: avatarColor, background: avatarColor + "18",
                border: "1.5px solid " + avatarColor + "40",
                borderRadius: 6, padding: "3px 10px",
              }}>
                {d.label}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {form.email && heroName !== form.email && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.accent, background: T.accent + "0d", border: "1px solid " + T.accent + "25", borderRadius: 20, padding: "5px 13px", maxWidth: 240, overflow: "hidden" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.email}</span>
              </span>
            )}
            {form.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.dim, background: T.surface, border: "1px solid " + T.border, borderRadius: 20, padding: "5px 13px", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6.16 6.16l1.63-1.63a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                <span>{form.phone.split(/[|,]/)[0].trim()}</span>
                {form.phone.split(/[|,]/).length > 1 && <span style={{ color: T.muted, fontSize: 10, marginLeft: 2 }}>+{form.phone.split(/[|,]/).length - 1}</span>}
              </span>
            )}
            {form.website && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.blue, background: T.blue + "0d", border: "1px solid " + T.blue + "25", borderRadius: 20, padding: "5px 13px", maxWidth: 200, overflow: "hidden", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.website.replace(/^https?:\/\//, "")}</span>
              </span>
            )}
          </div>
        </div>
      </div>


      {/* ── Layout mode: hidden containers panel ─────────────────────── */}
      {layoutMode && hiddenContainers.length > 0 && (
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Hidden Containers
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {hiddenContainers.map(c => (
              <button
                key={c.id}
                onClick={() => updateContainer(c.id, { visible: true })}
                style={{
                  padding: "5px 14px", borderRadius: 20, border: "1px solid " + T.border,
                  background: T.surface, color: T.dim, cursor: "pointer",
                  fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Container rows ────────────────────────────────────────────── */}
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{ display: "grid", gridTemplateColumns: row.map(() => "1fr").join(" "), gap: 12, marginBottom: 12 }}
        >
          {row.map(container => {
            const visIdx = visibleContainers.indexOf(container);
            return (
              <DraggableBlock
                key={container.id}
                index={visIdx}
                secDragging={secDragging}
                secOver={secOver}
                setSecOver={setSecOver}
                onDrop={handleSecDrop}
              >
                <ContainerBlock
                  container={container}
                  layoutMode={layoutMode}
                  editMode={editMode}
                  form={form}
                  set={set}
                  setSocial={setSocial}
                  show={show}
                  numKey={numKey}
                  phoneKey={phoneKey}
                  enabledSocials={enabledSocials}
                  noteClicked={noteClicked}
                  setNoteClicked={setNoteClicked}
                  parsedTags={parsedTags}
                  firstNameRef={firstNameRef}
                  onUpdate={(patch) => updateContainer(container.id, patch)}
                  onHide={() => updateContainer(container.id, { visible: false })}
                  onFieldReorder={(next, crossMeta) => {
                    setContainers(prev => {
                      const updated = prev.map(c => {
                        if (c.id === container.id) return { ...c, fields: next.map(f => f.key) };
                        if (crossMeta && c.id === crossMeta.fromContainerId)
                          return { ...c, fields: c.fields.filter(k => k !== crossMeta.removedKey) };
                        return c;
                      });
                      saveLayout(updated);
                      return updated;
                    });
                  }}
                />
              </DraggableBlock>
            );
          })}
        </div>
      ))}

      {/* ── Layout mode: add container ────────────────────────────────── */}
      {layoutMode && (
        <div style={{ marginBottom: 12 }}>
          {!addingContainer ? (
            <button
              onClick={() => setAddingContainer(true)}
              style={{
                width: "100%", padding: "10px 16px", border: "2px dashed " + T.border,
                borderRadius: 8, background: "transparent", color: T.muted,
                cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}
            >
              + Add Container
            </button>
          ) : (
            <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>New Container</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  value={newContTitle}
                  onChange={e => setNewContTitle(e.target.value)}
                  placeholder="Container title..."
                  onKeyDown={e => {
                    if (e.key === "Enter") addContainer();
                    if (e.key === "Escape") { setAddingContainer(false); setNewContTitle(""); }
                  }}
                  style={{ flex: 1, background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "7px 11px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
                />
                <select
                  value={newContType}
                  onChange={e => setNewContType(e.target.value)}
                  style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 6, padding: "7px 11px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
                >
                  <option value="fields">Fields</option>
                  <option value="notes">Notes</option>
                  <option value="custom">Custom</option>
                </select>
                <button onClick={addContainer} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>Add</button>
                <button onClick={() => { setAddingContainer(false); setNewContTitle(""); }} style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid " + T.border, background: T.surface, color: T.dim, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CRM metadata ─────────────────────────────────────────────── */}
      {!isNew && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, background: T.card, border: "1px solid " + T.border, borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
          {[
            ["Owner", contact.ownedBy || "—"],
            ["Added By", contact.addedBy || "—"],
            ["Created", fmt.date(contact.createdAt)],
            ["Last Activity", fmt.ago(contact.lastActivityAt)],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ padding: "12px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.border : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cancellation info ─────────────────────────────────────────── */}
      {contact?.isCanceled && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, background: T.red + "08", border: "1px solid " + T.red + "30", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
          {[
            ["Canceled By", contact.canceledBy || "—"],
            ["Canceled At", fmt.date(contact.canceledAt)],
            ["Reason", contact.cancelReason || "—"],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ padding: "10px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.red + "25" : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.red + "aa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ContainerBlock — polymorphic container renderer + layout controls
// ══════════════════════════════════════════════════════════════════════════════

function ContainerBlock({
  container, layoutMode, editMode,
  form, set, setSocial, show, numKey, phoneKey,
  enabledSocials, noteClicked, setNoteClicked, parsedTags,
  firstNameRef, onUpdate, onHide, onFieldReorder,
}) {
  const T = useTheme();
  const dragCtx = useContext(SectionDragCtx);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal]         = useState(container.title);

  useEffect(() => { setTitleVal(container.title); }, [container.title]);

  const isCollapsed = container.collapsible && container.collapsed;

  const taStyle = {
    width: "100%", marginTop: 4,
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const header = (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "8px 16px",
      borderBottom: isCollapsed ? "none" : "1px solid " + T.border,
      minHeight: 37,
    }}>
      {/* Drag grip */}
      {dragCtx && (
        <span
          draggable
          onDragStart={dragCtx.onDragStart}
          onDragEnd={dragCtx.onDragEnd}
          style={{
            fontSize: 15, color: T.muted, cursor: "grab",
            userSelect: "none", flexShrink: 0, lineHeight: 1, touchAction: "none",
            opacity: layoutMode ? 0.8 : 0.35,
          }}
        >⠿</span>
      )}

      {/* Title — inline editable in layout mode */}
      {layoutMode && editingTitle ? (
        <input
          autoFocus
          value={titleVal}
          onChange={e => setTitleVal(e.target.value)}
          onBlur={() => {
            setEditingTitle(false);
            const t = titleVal.trim();
            if (t && t !== container.title) onUpdate({ title: t });
            else setTitleVal(container.title);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") { setTitleVal(container.title); setEditingTitle(false); }
          }}
          style={{
            flex: 1, background: T.surface, border: "1px solid " + T.accent + "60",
            borderRadius: 4, padding: "2px 7px", color: T.text, fontSize: 10,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
            outline: "none", fontFamily: "inherit",
          }}
        />
      ) : (
        <span
          onDoubleClick={layoutMode ? () => setEditingTitle(true) : undefined}
          title={layoutMode ? "Double-click to rename" : undefined}
          style={{
            fontSize: 10, fontWeight: 700, color: T.muted,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: layoutMode ? "text" : "default", flex: 1,
          }}
        >
          {container.title}
        </span>
      )}

      {/* Collapse toggle (always visible if collapsible) */}
      {container.collapsible && (
        <button
          onClick={() => onUpdate({ collapsed: !container.collapsed })}
          style={{
            padding: "0 4px", background: "none", border: "none", color: T.muted,
            cursor: "pointer", fontSize: 11, lineHeight: 1,
            transform: container.collapsed ? "rotate(-90deg)" : "none",
            transition: "transform 0.15s", flexShrink: 0,
          }}
        >▾</button>
      )}

      {/* Layout mode controls */}
      {layoutMode && !editingTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          {/* Column count — fields type only */}
          {container.type === "fields" && (
            <div style={{ display: "flex", gap: 0, background: T.surface, borderRadius: 4, border: "1px solid " + T.border, overflow: "hidden" }}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => onUpdate({ fieldColumns: n })}
                  title={`${n} column${n > 1 ? "s" : ""}`}
                  style={{
                    padding: "2px 7px", border: "none",
                    background: container.fieldColumns === n ? T.accent : "transparent",
                    color: container.fieldColumns === n ? "#fff" : T.muted,
                    cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 600,
                    borderRight: n < 3 ? "1px solid " + T.border : "none",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {/* Width toggle */}
          <button
            onClick={() => onUpdate({ width: container.width === "full" ? "half" : "full" })}
            title={container.width === "full" ? "Switch to half-width" : "Switch to full-width"}
            style={{
              padding: "2px 7px", borderRadius: 4, border: "1px solid " + T.border,
              background: T.surface, color: T.dim, cursor: "pointer", fontSize: 10, fontFamily: "inherit",
            }}
          >
            {container.width === "full" ? "⟺ Full" : "⟩ Half"}
          </button>
          {/* Collapsible toggle */}
          <button
            onClick={() => onUpdate({ collapsible: !container.collapsible })}
            title={container.collapsible ? "Remove collapse" : "Make collapsible"}
            style={{
              padding: "2px 7px", borderRadius: 4,
              border: "1px solid " + (container.collapsible ? T.accent + "50" : T.border),
              background: container.collapsible ? T.accent + "15" : T.surface,
              color: container.collapsible ? T.accent : T.muted,
              cursor: "pointer", fontSize: 10, fontFamily: "inherit",
            }}
          >↕</button>
          {/* Hide */}
          <button
            onClick={onHide}
            title="Hide container"
            style={{
              padding: "2px 7px", borderRadius: 4, border: "1px solid " + T.border,
              background: T.surface, color: T.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            }}
          >✕</button>
        </div>
      )}
    </div>
  );

  // ── Body ──────────────────────────────────────────────────────────────────
  let body = null;
  if (!isCollapsed) {
    switch (container.type) {

      case "pipeline":
        body = (
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {editMode ? (
              <>
                <LeadStateSelect value={form.leadState} onChange={v => set("leadState", v)} />
                <InlineStageSelect label="Lead Stage" value={form.lifecycleStage} onChange={v => set("lifecycleStage", v)} />
              </>
            ) : (
              <>
                <ViewRow label="Lead State" value={LEAD_STATE_OPTS.find(o => o.value === (form.leadState || "prospect"))?.label || "Prospect"} />
                <ViewRow label="Lead Stage" value={(STAGE_DEF[form.lifecycleStage] || STAGE_DEF.new).label} color={(STAGE_DEF[form.lifecycleStage] || STAGE_DEF.new).color} />
              </>
            )}
          </div>
        );
        break;

      case "fields": {
        const fieldObjs = (container.fields || []).map(k => FIELD_DEFS[k]).filter(Boolean);
        body = (
          <div style={{ padding: "12px 16px" }}>
            <DraggableFieldList
              containerId={container.id}
              fields={fieldObjs}
              columns={container.fieldColumns || 1}
              editMode={editMode}
              form={form}
              set={set}
              show={show}
              numKey={numKey}
              phoneKey={phoneKey}
              firstFieldRef={container.id === "name_role" ? firstNameRef : undefined}
              onReorder={onFieldReorder}
            />
          </div>
        );
        break;
      }

      case "notes":
        body = show("notes") ? (
          <div style={{ padding: "12px 16px" }}>
            {editMode ? (
              <div onContextMenu={e => { e.preventDefault(); setNoteClicked(v => !v); }} style={{ position: "relative" }}>
                {noteClicked && (
                  <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, marginBottom: 5, letterSpacing: "0.03em" }}>
                    {(() => {
                      const now = new Date();
                      const mm = String(now.getMonth() + 1).padStart(2, "0");
                      const dd = String(now.getDate()).padStart(2, "0");
                      const yy = String(now.getFullYear()).slice(2);
                      const day = now.toLocaleDateString("en-US", { weekday: "short" });
                      const h = String(now.getHours()).padStart(2, "0");
                      const m = String(now.getMinutes()).padStart(2, "0");
                      return `${mm}/${dd}/${yy} ${day} ${h}:${m}`;
                    })()}
                  </div>
                )}
                <textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder="Add notes about this contact…"
                  style={{ ...taStyle, minHeight: 80 }}
                />
              </div>
            ) : (
              form.notes
                ? <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{form.notes}</div>
                : <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No notes</div>
            )}
          </div>
        ) : null;
        break;

      case "social":
        body = enabledSocials.length > 0 ? (
          <div style={{ padding: "12px 16px" }}>
            {editMode ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                {enabledSocials.map(({ key, label, color, placeholder }) => (
                  <InlineInput key={key} label={label} value={form.socialLinks?.[key] || ""} onChange={v => setSocial(key, v)} placeholder={placeholder} color={color} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                {enabledSocials.map(({ key, label, color }) =>
                  form.socialLinks?.[key] ? <ViewRow key={key} label={label} value={form.socialLinks[key]} color={color} /> : null
                )}
              </div>
            )}
          </div>
        ) : null;
        break;

      case "tags":
        body = show("tags") ? (
          <div style={{ padding: "12px 16px" }}>
            {editMode ? (
              <>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => set("tags", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                  placeholder="tag1, tag2, tag3  (comma-separated)"
                  style={{
                    width: "100%", background: T.surface, border: "1px solid " + T.border,
                    borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 12,
                    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                {parsedTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                    {parsedTags.map(tag => (
                      <span key={tag} style={{ padding: "4px 11px", borderRadius: 12, fontSize: 11, background: T.accent + "15", color: T.accent, border: "1px solid " + T.accent + "30", fontWeight: 500 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              parsedTags.length > 0
                ? <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {parsedTags.map(tag => (
                    <span key={tag} style={{ padding: "4px 11px", borderRadius: 12, fontSize: 11, background: T.accent + "15", color: T.accent, border: "1px solid " + T.accent + "30", fontWeight: 500 }}>{tag}</span>
                  ))}
                </div>
                : <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>No tags</div>
            )}
          </div>
        ) : null;
        break;

      case "custom":
        body = (
          <div style={{ padding: "12px 16px" }}>
            {editMode ? (
              <textarea
                value={form[container.id] || ""}
                onChange={e => set(container.id, e.target.value)}
                onFocus={ev => (ev.target.style.borderColor = T.accent)}
                onBlur={ev => (ev.target.style.borderColor = T.border)}
                onKeyDown={e => e.stopPropagation()}
                placeholder={`Enter ${container.title}…`}
                style={{ ...taStyle, minHeight: 60 }}
              />
            ) : (
              form[container.id]
                ? <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{form[container.id]}</div>
                : <div style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Empty</div>
            )}
          </div>
        );
        break;

      default: break;
    }
  }

  return (
    <div style={{
      background: T.card,
      border: "1px solid " + (layoutMode ? T.accent + "45" : T.border),
      borderRadius: 8, overflow: "hidden",
      boxShadow: layoutMode ? "0 0 0 1px " + T.accent + "12" : "none",
    }}>
      {header}
      {body}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DraggableFieldList
// ══════════════════════════════════════════════════════════════════════════════

function DraggableFieldList({ containerId, fields, columns = 1, editMode, form, set, show, numKey, phoneKey, onReorder, firstFieldRef }) {
  const T = useTheme();
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const visible = fields.filter(f => show(f.key));

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: columns > 1 ? "0 16px" : "0" }}>
      {visible.map((field, i) => {
        const color   = field.colorKey ? T[field.colorKey] : (field.color || undefined);
        const isAbove = dragOver === i && dragIdx.current !== null && dragIdx.current > i;
        const isBelow = dragOver === i && dragIdx.current !== null && dragIdx.current < i;

        return (
          <div
            key={field.key}
            draggable={editMode}
            onDragStart={e => {
              if (_secDragIdx !== null) return;
              dragIdx.current = i;
              _fieldDrag = { field, fromContainerId: containerId };
              e.dataTransfer.effectAllowed = "move";
              e.stopPropagation();
            }}
            onDragOver={e => {
              if (_secDragIdx !== null) return;
              e.preventDefault(); e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              if (dragOver !== i) setDragOver(i);
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
            }}
            onDrop={e => {
              if (_secDragIdx !== null) return;
              e.preventDefault(); e.stopPropagation();
              setDragOver(null);

              // Cross-container drop
              if (_fieldDrag && _fieldDrag.fromContainerId !== containerId) {
                const dropped = _fieldDrag.field;
                const fromId  = _fieldDrag.fromContainerId;
                _fieldDrag = null; dragIdx.current = null;
                const next = [...visible];
                next.splice(i, 0, dropped);
                const hidden = fields.filter(f => !visible.some(v => v.key === f.key));
                onReorder([...next, ...hidden], { fromContainerId: fromId, removedKey: dropped.key });
                return;
              }

              // Same-container reorder
              const src = dragIdx.current;
              if (src !== null && src !== i) {
                const next = [...visible];
                const [moved] = next.splice(src, 1);
                next.splice(i, 0, moved);
                const hidden = fields.filter(f => !visible.some(v => v.key === f.key));
                onReorder([...next, ...hidden]);
              }
              dragIdx.current = null; _fieldDrag = null;
            }}
            onDragEnd={() => { setDragOver(null); dragIdx.current = null; _fieldDrag = null; }}
            style={{
              display: "flex", alignItems: "flex-start", gap: editMode ? 6 : 0,
              borderTop:    isAbove ? `2px solid ${T.accent}` : "2px solid transparent",
              borderBottom: isBelow ? `2px solid ${T.accent}` : "2px solid transparent",
              transition: "border-color 0.08s",
            }}
          >
            {editMode && (
              <div style={{ flexShrink: 0, paddingTop: 14, cursor: "grab", color: T.muted, fontSize: 13, userSelect: "none", lineHeight: 1, opacity: 0.5 }}>
                ⠿
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <InlineInput
                  inputRef={i === 0 && firstFieldRef ? firstFieldRef : undefined}
                  label={field.label}
                  type={field.type}
                  value={form[field.key]}
                  onChange={v => set(field.key, v)}
                  color={color}
                  onKeyDown={field.numKey ? numKey : field.phoneKey ? phoneKey : undefined}
                  onBlur={field.autoHttps ? () => {
                    const v = (form[field.key] || "").trim();
                    if (v && !/^https?:\/\//i.test(v)) set(field.key, "https://" + v);
                  } : undefined}
                />
              ) : (
                <ViewRow label={field.label} value={form[field.key]} color={color} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DraggableBlock — wraps a container with section-level DnD
// ══════════════════════════════════════════════════════════════════════════════

function DraggableBlock({ index, secDragging, secOver, setSecOver, onDrop, children }) {
  const T = useTheme();
  const isAbove = secOver === index && secDragging.current !== null && secDragging.current > index;
  const isBelow = secOver === index && secDragging.current !== null && secDragging.current < index;

  const gripCtx = {
    onDragStart: e => {
      _secDragIdx = index;
      secDragging.current = index;
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => {
      _secDragIdx = null;
      secDragging.current = null;
      setSecOver(null);
    },
  };

  return (
    <SectionDragCtx.Provider value={gripCtx}>
      <div
        onDragOver={e => {
          if (_secDragIdx === null || _secDragIdx === index) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (secOver !== index) setSecOver(index);
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setSecOver(null);
        }}
        onDrop={e => {
          if (_secDragIdx === null || _secDragIdx === index) return;
          e.preventDefault();
          const src = _secDragIdx;
          _secDragIdx = null;
          secDragging.current = null;
          onDrop(src, index);
          setSecOver(null);
        }}
        style={{
          borderTop:    isAbove ? `3px solid ${T.accent}` : "3px solid transparent",
          borderBottom: isBelow ? `3px solid ${T.accent}` : "3px solid transparent",
          transition: "border-color 0.1s",
        }}
      >
        {children}
      </div>
    </SectionDragCtx.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Primitive sub-components
// ══════════════════════════════════════════════════════════════════════════════

function LeadStateSelect({ value, onChange }) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3, transition: "color 0.15s" }}>Lead State</label>
      <select
        value={value || "prospect"}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: focused ? T.surface : "transparent",
          border: "1px solid " + (focused ? T.accent + "80" : "transparent"),
          borderRadius: 5, padding: focused ? "5px 9px" : "3px 0",
          color: T.text, fontSize: 12, fontFamily: "inherit",
          outline: "none", cursor: "pointer", fontWeight: 500,
          transition: "all 0.15s ease",
          boxShadow: focused ? "0 0 0 2px " + T.accent + "18" : "none",
        }}
      >
        {LEAD_STATE_OPTS.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: "#1a1a2e", color: "#e2e8f0" }}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function InlineStageSelect({ label = "Stage", value, onChange }) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  const d = STAGE_DEF[value] || STAGE_DEF.new;
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3, transition: "color 0.15s" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: focused ? T.surface : "transparent",
          border: "1px solid " + (focused ? T.accent + "80" : "transparent"),
          borderRadius: 5, padding: focused ? "5px 9px" : "3px 0",
          color: d.color, fontSize: 12, fontFamily: "inherit",
          outline: "none", cursor: "pointer", fontWeight: 700,
          transition: "all 0.15s ease",
          boxShadow: focused ? "0 0 0 2px " + T.accent + "18" : "none",
        }}
      >
        {ALL_STAGES.map(s => (
          <option key={s} value={s} style={{ background: "#1a1a2e", color: "#e2e8f0" }}>{STAGE_DEF[s].label}</option>
        ))}
      </select>
    </div>
  );
}

function ViewRow({ label, value, color }) {
  const T = useTheme();
  if (!value && value !== 0) return null;
  return (
    <div style={{ padding: "7px 0", borderBottom: "1px solid " + T.border + "33" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: color || T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function InlineInput({ label, value, onChange, placeholder, type = "text", color, onKeyDown, onBlur, inputRef }) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "ArrowUp") {
      e.preventDefault();
      const all = Array.from(document.querySelectorAll("[data-field-nav]"));
      const idx = all.indexOf(e.currentTarget);
      if (e.key === "Enter" && idx < all.length - 1) all[idx + 1].focus();
      if (e.key === "ArrowUp" && idx > 0) all[idx - 1].focus();
      return;
    }
    onKeyDown?.(e);
  };
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3, transition: "color 0.15s" }}>{label}</label>
      <input
        ref={inputRef}
        data-field-nav
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); onBlur?.(e); }}
        placeholder={placeholder || "—"}
        style={{
          width: "100%", background: focused ? T.surface : "transparent",
          border: "1px solid " + (focused ? T.accent + "80" : "transparent"),
          borderRadius: 5, padding: focused ? "5px 9px" : "3px 0",
          color: color || T.text, fontSize: 12, fontFamily: "inherit",
          outline: "none", boxSizing: "border-box",
          transition: "all 0.15s ease",
          boxShadow: focused ? "0 0 0 2px " + T.accent + "18" : "none",
        }}
      />
    </div>
  );
}

// Keep for any potential external use
export const FieldInput = forwardRef(function FieldInput({ label, value, onChange, placeholder, type = "text", onKeyDown }, ref) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "ArrowUp") {
      e.preventDefault();
      const all = Array.from(document.querySelectorAll("[data-field-nav]"));
      const idx = all.indexOf(e.currentTarget);
      if (e.key === "Enter" && idx < all.length - 1) all[idx + 1].focus();
      if (e.key === "ArrowUp" && idx > 0) all[idx - 1].focus();
      return;
    }
    onKeyDown?.(e);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, transition: "color 0.15s" }}>{label}</label>
      <input
        data-field-nav ref={ref} type={type} value={value || ""}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder || ""}
        style={{
          background: focused ? T.bg : T.surface,
          border: "1.5px solid " + (focused ? T.accent : T.border),
          borderRadius: 7, padding: "9px 12px", color: T.text, fontSize: 12,
          outline: "none", fontFamily: "inherit",
          boxShadow: focused ? "0 0 0 3px " + T.accent + "18" : "none",
          transition: "all 0.15s ease",
        }}
      />
    </div>
  );
});

function MetricCard({ label, children }) {
  const T = useTheme();
  return (
    <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
