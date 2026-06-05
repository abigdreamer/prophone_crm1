import { useState, useEffect, useRef, forwardRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import { addActivity, getSettings, saveSettings } from "../services/api";
import { Spinner } from "./ui/Loader";
import CustomFieldsSection from "./CustomFieldsSection";
import {
  User, TrendingUp, Building2, Wrench, Share2, FileText, Tag, ChevronDown, SlidersHorizontal,
} from "lucide-react";

// Context that passes edit-mode state down to F without prop-drilling
const EditCtx = createContext(null);

// ─── Stage helpers ────────────────────────────────────────────────────────────

const STAGE_TYPE_MAP = {
  new:            "Prospect",
  contacted:      "Lead",
  engaged:        "Lead",
  demo_scheduled: "Warm Lead",
  demo_done:      "Warm Lead",
  proposal_sent:  "Hot Lead",
  negotiating:    "Hot Lead",
  customer:       "Customer",
  not_qualified:  "Lost",
  lost:           "Lost",
  churned:        "Lost",
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

function contactToForm(c) {
  return {
    firstName:             c.firstName             || "",
    lastName:              c.lastName              || "",
    title:                 c.title                 || "",
    phone:                 c.phone                 || "",
    email:                 c.email                 || "",
    website:               c.website               || "",
    address:               c.address               || "",
    city:                  c.city                  || "",
    state:                 c.state                 || "",
    zip:                   c.zip                   || "",
    lifecycleStage:        c.lifecycleStage        || "new",
    leadScore:             c.leadScore != null ? String(c.leadScore) : "0",
    company:               c.company               || "",
    accountSize:           c.accountSize           || "",
    trucks:                c.trucks != null ? String(c.trucks) : "",
    estAnnualRevenue:      c.estAnnualRevenue       || "",
    contractValue:         c.contractValue != null ? String(c.contractValue) : "",
    yearsInBusiness:       c.yearsInBusiness != null ? String(c.yearsInBusiness) : "",
    serviceAreaMiles:      c.serviceAreaMiles != null ? String(c.serviceAreaMiles) : "",
    dispatcherSoftware:    c.dispatcherSoftware    || "",
    servicesOffered:       c.servicesOffered       || "",
    motorClubAffiliations: c.motorClubAffiliations || "",
    painPoints:            c.painPoints            || "",
    socialLinks:           c.socialLinks           || {},
    source:                c.source                || "",
    campaign:              c.campaign              || "",
    ownedBy:               c.ownedBy               || "",
    tags:                  Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || ""),
    notes:                 c.notes                 || "",
    udfValues:             c.udfValues             || {},
  };
}

function emptyForm(currentUser) {
  return {
    firstName: "", lastName: "", title: "", phone: "",
    email: "", website: "", address: "", city: "", state: "", zip: "",
    lifecycleStage: "new", leadScore: "0",
    company: "", accountSize: "", trucks: "", estAnnualRevenue: "", contractValue: "",
    yearsInBusiness: "", serviceAreaMiles: "", dispatcherSoftware: "",
    servicesOffered: "", motorClubAffiliations: "", painPoints: "",
    socialLinks: {}, source: "", campaign: "",
    ownedBy: currentUser?.name || "",
    tags: "", notes: "",
    udfValues: {},
  };
}

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

function fieldNav(e) {
  if (e.key !== "Enter" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll("[data-field-nav]"));
  const idx = all.indexOf(e.currentTarget);
  if (e.key === "Enter" && idx < all.length - 1) all[idx + 1].focus();
  if (e.key === "ArrowUp" && idx > 0) all[idx - 1].focus();
}

function fieldNavSelect(e) {
  if (e.key !== "Enter") return;
  const all = Array.from(document.querySelectorAll("[data-field-nav]"));
  const idx = all.indexOf(e.currentTarget);
  if (idx < all.length - 1) all[idx + 1].focus();
}

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
  editMode = false, onEditModeChange,
}) {
  const T = useTheme();
  const toast = useAppToast();
  const isNew = !contact;

  const [form, setForm]             = useState(() => isNew ? emptyForm(currentUser) : contactToForm(contact));
  const [saveStatus, setSaveStatus] = useState(null);
  const [vis, setVis]               = useState({});
  const [sectionDragOverKey, setSectionDragOverKey] = useState(null);

  useEffect(() => {
    getSettings(clientId, "contact_fields")
      .then(res => {
        if (res?.config && Object.keys(res.config).length > 0) {
          setVis(res.config);
        }
      })
      .catch(() => {});
  }, [clientId]);

  // In edit mode every field renders; visibility is communicated via styling only
  const show = key => editMode ? true : vis[key] !== false;
  const isFieldVisible  = key => vis[key] !== false;

  const saveVisTimer = useRef(null);

  const toggleVis = (key) => {
    setVis(prev => {
      const next = { ...prev, [key]: prev[key] !== false ? false : true };
      clearTimeout(saveVisTimer.current);
      saveVisTimer.current = setTimeout(() => {
        saveSettings(clientId, "contact_fields", next).catch(() => {});
      }, 400);
      return next;
    });
  };

  const getFieldLabel  = (key) => vis[`label_${key}`] || null;
  const saveFieldLabel = (key, newLabel) => {
    const trimmed = newLabel.trim();
    setVis(prev => {
      const next = { ...prev };
      if (trimmed) next[`label_${key}`] = trimmed;
      else delete next[`label_${key}`];
      clearTimeout(saveVisTimer.current);
      saveVisTimer.current = setTimeout(() => {
        saveSettings(clientId, "contact_fields", next).catch(() => {});
      }, 400);
      return next;
    });
  };

  const SECTION_KEYS_LIST = ["contact_info", "pipeline", "company", "services", "social", "notes", "tags", "custom_fields"];
  const rawSectionOrder   = Array.isArray(vis.section_order) ? vis.section_order : [];
  const sectionOrder      = [
    ...rawSectionOrder.filter(k => SECTION_KEYS_LIST.includes(k)),
    ...SECTION_KEYS_LIST.filter(k => !rawSectionOrder.includes(k)),
  ];

  const isSectionCollapsed    = (key) => vis[`sec_col_${key}`] === true;
  const toggleSectionCollapse = (key) => {
    setVis(prev => {
      const next = { ...prev, [`sec_col_${key}`]: !prev[`sec_col_${key}`] };
      clearTimeout(saveVisTimer.current);
      saveVisTimer.current = setTimeout(() => saveSettings(clientId, "contact_fields", next).catch(() => {}), 400);
      return next;
    });
  };
  const isSectionVisible  = (key) => vis[`sec_hid_${key}`] !== true;
  const toggleSectionVis  = (key) => {
    setVis(prev => {
      const next = { ...prev, [`sec_hid_${key}`]: !prev[`sec_hid_${key}`] };
      clearTimeout(saveVisTimer.current);
      saveVisTimer.current = setTimeout(() => saveSettings(clientId, "contact_fields", next).catch(() => {}), 400);
      return next;
    });
  };
  const onSectionDragStart = (key) => { sectionDragIdxRef.current = key; };
  const onSectionDragOver  = (e, key) => { e.preventDefault(); setSectionDragOverKey(key); };
  const onSectionDragLeave = () => setSectionDragOverKey(null);
  const onSectionDrop      = (e, key) => {
    e.preventDefault();
    setSectionDragOverKey(null);
    const from = sectionDragIdxRef.current;
    sectionDragIdxRef.current = null;
    if (!from || from === key) return;
    const order = [...sectionOrder];
    const fi = order.indexOf(from);
    const ti = order.indexOf(key);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1);
    order.splice(ti, 0, from);
    setVis(prev => {
      const next = { ...prev, section_order: order };
      clearTimeout(saveVisTimer.current);
      saveVisTimer.current = setTimeout(() => saveSettings(clientId, "contact_fields", next).catch(() => {}), 400);
      return next;
    });
  };

  const editCtx = {
    editMode, isFieldVisible, toggleVis, getFieldLabel, saveFieldLabel,
    isSectionCollapsed, toggleSectionCollapse,
    isSectionVisible, toggleSectionVis,
    sectionOrder,
    onSectionDragStart, onSectionDragOver, onSectionDragLeave, onSectionDrop, sectionDragOverKey,
  };

  const firstNameRef      = useRef(null);
  const panelRef          = useRef(null);
  const statusTimerRef    = useRef(null);
  const formRef           = useRef(form);
  const dirtyRef          = useRef(false);
  const sectionDragIdxRef = useRef(null);
  formRef.current         = form;

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

  useEffect(() => () => { clearTimeout(statusTimerRef.current); clearTimeout(saveVisTimer.current); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !panelRef.current?.contains(e.relatedTarget)) {
        if (dirtyRef.current) doSaveRef.current?.();
      }
    };
    document.addEventListener("focusout", handler);
    return () => document.removeEventListener("focusout", handler);
  }, []);

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
    const t = setTimeout(() => {
      // Scroll the nearest scrollable ancestor to the top so the name field is visible
      let el = panelRef.current?.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "visible") {
          el.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        el = el.parentElement;
      }
      firstNameRef.current?.focus();
    }, 60);
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
        setTimeout(() => {
          let el = panelRef.current?.parentElement;
          while (el) {
            if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "visible") {
              el.scrollTo({ top: 0, behavior: "smooth" });
              break;
            }
            el = el.parentElement;
          }
          firstNameRef.current?.focus();
        }, 60);
        return;
      }
      if (e.key !== "Escape") return;
      if (editMode) {
        e.stopImmediatePropagation();
        onEditModeChange?.(false);
        document.activeElement?.blur?.();
        return;
      }
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
  }, [isNew, editMode]); // eslint-disable-line

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

  const setUdf = (sortKey, val) => {
    const next = { ...formRef.current, udfValues: { ...formRef.current.udfValues, [sortKey]: val } };
    formRef.current = next;
    dirtyRef.current = true;
    setForm(next);
    onFormChange?.(next);
    onDirtyChange?.(true);
  };

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
  const heroName      = personName || form.company || "";
  const heroEmpty     = !heroName;
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

  // name_role fields (firstName, lastName, title) live directly in the header card now
  const visibleContainers = containers.filter(c => c.visible && c.id !== "name_role");
  const hiddenContainers  = containers.filter(c => !c.visible && c.id !== "name_role");
  const rows              = groupContainers(visibleContainers);

  return (
    <EditCtx.Provider value={editCtx}>
    <div ref={panelRef} style={{ width: "100%", paddingBottom: 24 }}>

      {/* Save status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8, minHeight: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saveStatus === "saving" && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted }}>
              <Spinner size={10} color={T.muted} /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>✓ Saved</span>
          )}
          {isNew && !saveStatus && (
            <span style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>Press Esc to save</span>
          )}
          {editMode && !saveStatus && (
            <span style={{ fontSize: 11, color: T.accent, fontStyle: "italic" }}>Press Esc to exit</span>
          )}
        </div>
      </div>

      {/* sections — flex column so CSS order can resequence them */}
      <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── CONTACT INFO ──────────────────────────────────────────────────────── */}
      <Section icon={User} title="Contact Info" T={T} sectionKey="contact_info">
        <G cols="1fr 1fr 1fr 1fr">
          {show("firstName") && <F label="First Name" fieldKey="firstName"><FInput inputRef={firstNameRef} value={form.firstName} onChange={v => set("firstName", v)} placeholder="First name" /></F>}
          {show("lastName")  && <F label="Last Name"  fieldKey="lastName"><FInput value={form.lastName} onChange={v => set("lastName", v)} placeholder="Last name" /></F>}
          {show("title")     && <F label="Title"      fieldKey="title"><FInput value={form.title} onChange={v => set("title", v)} placeholder="Job title" /></F>}
          {show("phone")     && <F label="Phone"      fieldKey="phone"><FInput value={form.phone} onChange={v => set("phone", v)} placeholder="(555) 000-0000" onKeyDown={phoneKey} /></F>}
        </G>
        {(show("email") || show("website")) && (
          <G cols="1fr 1fr">
            {show("email")   && <F label="Email"   fieldKey="email"><FInput value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" /></F>}
            {show("website") && <F label="Website" fieldKey="website"><FInput value={form.website} onChange={v => set("website", v)} placeholder="https://website.com" onBlur={() => { const v = (form.website||"").trim(); if(v && !/^https?:\/\//i.test(v)) set("website","https://"+v); }} /></F>}
          </G>
        )}
        {(show("address") || show("city") || show("state") || show("zip")) && (
          <G cols="2fr 1fr 1fr 1fr" mb={0}>
            {show("address") && <F label="Address" fieldKey="address"><FInput value={form.address} onChange={v => set("address", v)} placeholder="Street address" /></F>}
            {show("city")    && <F label="City"    fieldKey="city"><FInput value={form.city} onChange={v => set("city", v)} placeholder="City" /></F>}
            {show("state")   && <F label="State"   fieldKey="state"><FInput value={form.state} onChange={v => set("state", v)} placeholder="State" /></F>}
            {show("zip")     && <F label="Zip"     fieldKey="zip"><FInput value={form.zip} onChange={v => set("zip", v)} placeholder="Zip" /></F>}
          </G>
        )}
      </Section>

      {/* ── PIPELINE ──────────────────────────────────────────────────────────── */}
      {(show("lifecycleStage") || show("leadScore")) && (
        <Section icon={TrendingUp} title="Pipeline" T={T} sectionKey="pipeline">
          <G cols="1fr 1fr" mb={0}>
            {show("lifecycleStage") && (
              <F label="Lead Stage" fieldKey="lifecycleStage">
                <InlineStageSelect
                  value={form.lifecycleStage}
                  onChange={(newStage) => set("lifecycleStage", newStage)}
                />
              </F>
            )}
            {show("leadScore") && <F label="Lead Score" fieldKey="leadScore"><FInput value={form.leadScore} onChange={v => set("leadScore", v)} placeholder="0" onKeyDown={numKey} /></F>}
          </G>
        </Section>
      )}

      {/* ── COMPANY & ACCOUNT ─────────────────────────────────────────────────── */}
      {(show("company") || show("accountSize") || show("trucks") || show("estAnnualRevenue") || show("contractValue") || show("yearsInBusiness") || show("serviceAreaMiles") || show("dispatcherSoftware") || show("source") || show("campaign")) && (
        <Section icon={Building2} title="Company & Account" T={T} sectionKey="company">
          {(show("company") || show("accountSize") || show("trucks") || show("estAnnualRevenue") || show("contractValue")) && (
            <G cols="2fr 1fr 1fr 1fr 1fr">
              {show("company")        && <F label="Company"      fieldKey="company"><FInput value={form.company} onChange={v => set("company", v)} placeholder="Company name" /></F>}
              {show("accountSize")   && <F label="Account Size"  fieldKey="accountSize"><FInput value={form.accountSize} onChange={v => set("accountSize", v)} placeholder="e.g. 1-5" /></F>}
              {show("trucks")        && <F label="Trucks"        fieldKey="trucks"><FInput value={form.trucks} onChange={v => set("trucks", v)} placeholder="0" onKeyDown={numKey} /></F>}
              {show("estAnnualRevenue") && <F label="Est. Revenue" fieldKey="estAnnualRevenue"><FInput value={form.estAnnualRevenue} onChange={v => set("estAnnualRevenue", v)} placeholder="$0" /></F>}
              {show("contractValue") && <F label="Contract ($)"  fieldKey="contractValue"><FInput value={form.contractValue} onChange={v => set("contractValue", v)} placeholder="0" onKeyDown={numKey} /></F>}
            </G>
          )}
          {(show("yearsInBusiness") || show("serviceAreaMiles") || show("dispatcherSoftware") || show("source") || show("campaign")) && (
            <G cols="1fr 1fr 1fr" mb={0}>
              {show("yearsInBusiness")    && <F label="Years in Business"    fieldKey="yearsInBusiness"><FInput value={form.yearsInBusiness} onChange={v => set("yearsInBusiness", v)} placeholder="0" onKeyDown={numKey} /></F>}
              {show("serviceAreaMiles")  && <F label="Service Area (mi)"    fieldKey="serviceAreaMiles"><FInput value={form.serviceAreaMiles} onChange={v => set("serviceAreaMiles", v)} placeholder="0" onKeyDown={numKey} /></F>}
              {show("dispatcherSoftware") && <F label="Dispatcher Software" fieldKey="dispatcherSoftware"><FInput value={form.dispatcherSoftware} onChange={v => set("dispatcherSoftware", v)} placeholder="e.g. Omadi" /></F>}
              {show("source")   && <F label="Source"   fieldKey="source"><FInput value={form.source} onChange={v => set("source", v)} placeholder="e.g. Cold Call" /></F>}
              {show("campaign") && <F label="Campaign" fieldKey="campaign"><FInput value={form.campaign} onChange={v => set("campaign", v)} placeholder="Campaign name" /></F>}
            </G>
          )}
        </Section>
      )}

      {/* ── SERVICES & OPERATIONS ─────────────────────────────────────────────── */}
      {(show("servicesOffered") || show("motorClubAffiliations") || show("painPoints")) && (
        <Section icon={Wrench} title="Services & Operations" T={T} sectionKey="services">
          {(show("servicesOffered") || show("motorClubAffiliations")) && (
            <G cols="1fr 1fr">
              {show("servicesOffered")       && <F label="Services Offered"        fieldKey="servicesOffered"><FTextarea value={form.servicesOffered} onChange={v => set("servicesOffered", v)} placeholder="Heavy Duty, Semi Recovery, Accident…" rows={2} /></F>}
              {show("motorClubAffiliations") && <F label="Motor Club Affiliations" fieldKey="motorClubAffiliations"><FTextarea value={form.motorClubAffiliations} onChange={v => set("motorClubAffiliations", v)} placeholder="State Farm, NSD…" rows={2} /></F>}
            </G>
          )}
          {show("painPoints") && (
            <G cols="1fr" mb={0}>
              <F label="Pain Points" fieldKey="painPoints"><FTextarea value={form.painPoints} onChange={v => set("painPoints", v)} placeholder="Key pain points or challenges…" rows={2} /></F>
            </G>
          )}
        </Section>
      )}

      {/* ── SOCIAL LINKS ──────────────────────────────────────────────────────── */}
      {(() => {
        const ALL_SOCIAL = [
          { key: "facebook",  vis: "social_facebook",  label: "Facebook",    ph: "facebook.com/…"    },
          { key: "instagram", vis: "social_instagram", label: "Instagram",   ph: "instagram.com/…"   },
          { key: "linkedin",  vis: "social_linkedin",  label: "LinkedIn",    ph: "linkedin.com/in/…" },
          { key: "twitter",   vis: "social_twitter",   label: "Twitter / X", ph: "x.com/…"           },
          { key: "youtube",   vis: "social_youtube",   label: "YouTube",     ph: "youtube.com/…"     },
          { key: "yelp",      vis: "social_yelp",      label: "Yelp",        ph: "yelp.com/biz/…"    },
          { key: "pinterest", vis: "social_pinterest", label: "Pinterest",   ph: "pinterest.com/…"   },
          { key: "tiktok",    vis: "social_tiktok",    label: "TikTok",      ph: "tiktok.com/@…"     },
        ].filter(s => show(s.vis));

        if (ALL_SOCIAL.length === 0) return null;

        return (
          <Section icon={Share2} title="Social Links" T={T} sectionKey="social">
            <G cols="1fr 1fr 1fr 1fr" mb={0}>
              {ALL_SOCIAL.map(({ key, label, ph, vis: vk }) => (
                <F key={key} label={label} fieldKey={vk}>
                  <FInput value={form.socialLinks?.[key] || ""} onChange={v => setSocial(key, v)} placeholder={ph} />
                </F>
              ))}
            </G>
          </Section>
        );
      })()}

      {/* ── NOTES ─────────────────────────────────────────────────────────────── */}
      {show("notes") && (
        <Section icon={FileText} title="Notes" T={T} sectionKey="notes">
          <G cols="1fr" mb={0}>
            <F label="Notes" fieldKey="notes">
              <FTextarea value={form.notes} onChange={v => set("notes", v)} placeholder="Add notes about this contact…" rows={3} />
            </F>
          </G>
        </Section>
      )}

      {/* ── TAGS ──────────────────────────────────────────────────────────────── */}
      {show("tags") && (
        <Section icon={Tag} title="Tags" T={T} sectionKey="tags">
          <G cols="1fr" mb={parsedTags.length > 0 ? 10 : 0}>
            <F label="Tags" fieldKey="tags">
              <FInput value={form.tags} onChange={v => set("tags", v)} placeholder="tag1, tag2, tag3  (comma-separated)" />
            </F>
          </G>
          {parsedTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {parsedTags.map(tag => (
                <span key={tag} style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11,
                  background: T.accent + "18", color: T.accent,
                  border: "1px solid " + T.accent + "35", fontWeight: 600,
                }}>{tag}</span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── CUSTOM FIELDS ─────────────────────────────────────────────────────── */}
      <Section icon={SlidersHorizontal} title="Custom Fields" T={T} sectionKey="custom_fields">
        <CustomFieldsSection
          clientId={clientId}
          contactId={contact?.id}
          udfValues={form.udfValues || {}}
          onValueChange={setUdf}
          toast={toast}
          editMode={editMode}
          noWrapper
        />
      </Section>

      </div>{/* end sections flex container */}

      {/* ── Cancellation info ─────────────────────────────────────────────────── */}
      {contact?.isCanceled && (
        <div style={{
          marginTop: 12,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          background: T.red + "08", border: "1px solid " + T.red + "30",
          borderRadius: 6, marginTop: 4, overflow: "hidden",
        }}>
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
    </EditCtx.Provider>
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
      padding: "12px 20px 4px",
      minHeight: 32,
    }}>
      {/* Drag grip — only visible in layout mode */}
      {layoutMode && dragCtx && (
        <span
          draggable
          onDragStart={dragCtx.onDragStart}
          onDragEnd={dragCtx.onDragEnd}
          style={{
            fontSize: 15, color: T.muted, cursor: "grab",
            userSelect: "none", flexShrink: 0, lineHeight: 1, touchAction: "none",
            opacity: 0.8,
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
          <div style={{ padding: "14px 20px 6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          <div style={{ padding: "14px 20px 0" }}>
            <DraggableFieldList
              containerId={container.id}
              fields={fieldObjs}
              columns={container.fieldColumns || 1}
              editMode={editMode}
              layoutMode={layoutMode}
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
          <div style={{ padding: "14px 20px 14px" }}>
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
                  data-field-nav
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      const all = Array.from(document.querySelectorAll("[data-field-nav]"));
                      const idx = all.indexOf(e.currentTarget);
                      if (idx < all.length - 1) { e.preventDefault(); all[idx + 1].focus(); }
                    } else if (e.key === "ArrowUp") {
                      const all = Array.from(document.querySelectorAll("[data-field-nav]"));
                      const idx = all.indexOf(e.currentTarget);
                      if (idx > 0) { e.preventDefault(); all[idx - 1].focus(); }
                    }
                  }}
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
          <div style={{ padding: "14px 20px 0" }}>
            {editMode ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                {enabledSocials.map(({ key, label, color, placeholder }) => (
                  <InlineInput key={key} label={label} value={form.socialLinks?.[key] || ""} onChange={v => setSocial(key, v)} placeholder={placeholder} color={color} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                {enabledSocials.map(({ key, label, color }) => {
                  const val = form.socialLinks?.[key];
                  return (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: T.dim, marginBottom: 5 }}>{label}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, opacity: val ? 1 : 0.35 }} />
                        <span style={{ fontSize: 13, color: val ? color : T.muted, fontStyle: val ? "normal" : "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {val || "Not set"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null;
        break;

      case "tags":
        body = show("tags") ? (
          <div style={{ padding: "14px 20px 14px" }}>
            {editMode ? (
              <>
                <input
                  data-field-nav
                  type="text"
                  value={form.tags}
                  onChange={e => set("tags", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                  onKeyDown={fieldNav}
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
          <div style={{ padding: "4px 20px 16px" }}>
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

function Section({ icon: Icon, title, children, T, sectionKey }) {
  const ctx = useContext(EditCtx);
  const em  = ctx?.editMode ?? false;

  const isCollapsed = sectionKey ? (ctx?.isSectionCollapsed?.(sectionKey) ?? false) : false;
  const isVisible   = sectionKey ? (ctx?.isSectionVisible?.(sectionKey)   ?? true)  : true;
  const isDragOver  = !!(sectionKey && ctx?.sectionDragOverKey === sectionKey);
  const order       = sectionKey && ctx?.sectionOrder ? ctx.sectionOrder.indexOf(sectionKey) : undefined;

  if (!em && sectionKey && !isVisible) return null;

  return (
    <div
      onDragOver={em && sectionKey ? (e) => ctx.onSectionDragOver(e, sectionKey) : undefined}
      onDragLeave={em && sectionKey ? ctx.onSectionDragLeave : undefined}
      onDrop={em && sectionKey ? (e) => ctx.onSectionDrop(e, sectionKey) : undefined}
      style={{
        background: T.card,
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 12,
        order: order !== undefined && order >= 0 ? order : undefined,
        opacity: em && sectionKey && !isVisible ? 0.45 : 1,
        outline: isDragOver ? `2px solid ${T.accent}60` : "none",
        outlineOffset: -2,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ marginBottom: isCollapsed ? 0 : 14 }}>
        <div
          onClick={() => sectionKey && ctx?.toggleSectionCollapse?.(sectionKey)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            paddingBottom: isCollapsed ? 0 : 10,
            borderBottom: isCollapsed ? "none" : "1.5px solid " + T.border,
            cursor: sectionKey ? "pointer" : "default",
            userSelect: "none",
          }}
        >
          {em && sectionKey && (
            <span
              draggable
              onDragStart={e => { e.stopPropagation(); ctx.onSectionDragStart?.(sectionKey); }}
              onClick={e => e.stopPropagation()}
              title="Drag to reorder"
              style={{ color: T.muted, fontSize: 16, lineHeight: 1, cursor: "grab", flexShrink: 0, userSelect: "none" }}
            >
              ⠿
            </span>
          )}
          {em && sectionKey && (
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => ctx.toggleSectionVis?.(sectionKey)}
              onClick={e => e.stopPropagation()}
              title={isVisible ? "Hide section" : "Show section"}
              style={{ width: 12, height: 12, cursor: "pointer", accentColor: T.accent, flexShrink: 0, margin: 0 }}
            />
          )}
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: T.accent + "1a",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={13} color={T.accent} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "0.01em", flex: 1 }}>
            {title}
          </span>
          {sectionKey && (
            <ChevronDown
              size={14}
              color={T.muted}
              style={{
                flexShrink: 0,
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          )}
        </div>
      </div>
      {!isCollapsed && children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Primitive sub-components
// ══════════════════════════════════════════════════════════════════════════════

function F({ label, children, fieldKey }) {
  const T   = useTheme();
  const ctx = useContext(EditCtx);

  const em      = ctx?.editMode ?? false;
  const visible = !fieldKey || (ctx?.isFieldVisible(fieldKey) ?? true);

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft,   setLabelDraft]   = useState("");

  // Resolved display label (may have been renamed)
  const displayLabel = fieldKey ? (ctx?.getFieldLabel(fieldKey) || label) : label;

  function startLabelEdit() {
    setLabelDraft(displayLabel || "");
    setEditingLabel(true);
  }
  function commitLabelEdit() {
    ctx?.saveFieldLabel(fieldKey, labelDraft);
    setEditingLabel(false);
  }
  function cancelLabelEdit() {
    setEditingLabel(false);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 5,
      opacity: em && !visible ? 0.38 : 1,
      transition: "opacity 0.2s",
    }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {em && fieldKey && (
            <input
              type="checkbox"
              checked={visible}
              onChange={() => ctx.toggleVis(fieldKey)}
              title={visible ? "Hide this field" : "Show this field"}
              style={{ width: 12, height: 12, cursor: "pointer", accentColor: T.accent, flexShrink: 0, margin: 0 }}
            />
          )}
          {em && fieldKey && editingLabel ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={commitLabelEdit}
              onKeyDown={e => {
                if (e.key === "Enter")  { e.preventDefault(); commitLabelEdit(); }
                if (e.key === "Escape") { e.preventDefault(); cancelLabelEdit(); }
              }}
              style={{
                fontSize: 11, fontWeight: 600, color: T.accent,
                background: T.bg, border: "1px solid " + T.accent,
                borderRadius: 3, padding: "1px 5px", outline: "none",
                fontFamily: "inherit", letterSpacing: "0.02em",
              }}
            />
          ) : (
            <label
              onClick={em && fieldKey ? startLabelEdit : undefined}
              title={em && fieldKey ? "Click to rename" : undefined}
              style={{
                fontSize: 11, fontWeight: 600, color: T.muted,
                letterSpacing: "0.02em",
                cursor: em && fieldKey ? "text" : "default",
                userSelect: "none",
              }}
            >
              {displayLabel}
            </label>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── FInput ───────────────────────────────────────────────────────────────────

function FInput({ value, onChange, placeholder, type = "text", onKeyDown, onBlur, inputRef }) {
  const T = useTheme();
  const mouseDownRef = useRef(false);
  return (
    <input
      ref={inputRef}
      data-field-nav
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { fieldNav(e); onKeyDown?.(e); }}
      onMouseDown={() => { mouseDownRef.current = true; }}
      onFocus={e => {
        e.target.style.borderColor = T.accent;
        e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`;
        if (!mouseDownRef.current) {
          const len = e.target.value.length;
          setTimeout(() => e.target.setSelectionRange(len, len), 0);
        }
        mouseDownRef.current = false;
      }}
      onBlur={e => {
        e.target.style.borderColor = T.border;
        e.target.style.boxShadow = "none";
        mouseDownRef.current = false;
        onBlur?.(e);
      }}
      placeholder={placeholder || ""}
      style={{
        width: "100%", padding: "8px 11px", boxSizing: "border-box",
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 5, color: T.text, fontSize: 13,
        outline: "none", fontFamily: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        minHeight: 36,
      }}
    />
  );
}

// ─── FTextarea ────────────────────────────────────────────────────────────────

function FTextarea({ value, onChange, placeholder, rows = 3 }) {
  const T = useTheme();
  return (
    <textarea
      data-field-nav
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`; }}
      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
      placeholder={placeholder || ""}
      rows={rows}
      style={{
        width: "100%", padding: "8px 11px", boxSizing: "border-box",
        background: T.surface, border: "1px solid " + T.border,
        borderRadius: 5, color: T.text, fontSize: 13,
        outline: "none", fontFamily: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        resize: "vertical", lineHeight: 1.55,
      }}
    />
  );
}

// ─── InlineStageSelect ────────────────────────────────────────────────────────

function InlineStageSelect({ value, onChange }) {
  const T = useTheme();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  function openMenu() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setRect(r);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (!triggerRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", () => setOpen(false), { capture: true, once: true });
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = options.find(o => o.value === value) || options[0];
  const selColor = getColor ? getColor(value) : T.text;

  function pick(val) {
    onChange(val);
    setOpen(false);
    const all = Array.from(document.querySelectorAll("[data-field-nav]"));
    const idx = all.indexOf(triggerRef.current);
    if (idx < all.length - 1) setTimeout(() => all[idx + 1].focus(), 30);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      // advance to next field like all other inputs
      fieldNav(e);
    } else if (e.key === " ") {
      e.preventDefault();
      open ? setOpen(false) : openMenu();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = options.findIndex(o => o.value === value);
      if (idx < options.length - 1) onChange(options[idx + 1].value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex(o => o.value === value);
      if (idx > 0) {
        onChange(options[idx - 1].value);
      } else {
        const all = Array.from(document.querySelectorAll("[data-field-nav]"));
        const i = all.indexOf(triggerRef.current);
        if (i > 0) all[i - 1].focus();
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  const dropStyle = rect ? {
    position: "fixed",
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
    zIndex: 99999,
    background: T.card,
    border: "1px solid " + T.border,
    borderRadius: 8,
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    overflow: "hidden",
  } : null;

  return (
    <div style={{ marginBottom: 14, ...outerStyle }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: focused ? T.accent : T.dim, display: "block", marginBottom: 5, transition: "color 0.15s" }}>{label}</label>
      <button
        ref={triggerRef}
        data-field-nav
        type="button"
        onClick={openMenu}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={e => {
          setFocused(false);
          if (!dropRef.current?.contains(e.relatedTarget)) setOpen(false);
        }}
        style={{
          width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: T.surface, border: "1.5px solid " + (focused ? T.accent : T.border),
          borderRadius: 8, padding: "8px 11px", color: selColor,
          fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 600,
          outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: focused ? "0 0 0 3px " + T.accent + "14" : "none",
        }}
      >
        <span>{selected?.label}</span>
        <span style={{ opacity: 0.45, fontSize: 10, marginLeft: 4, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && dropStyle && (
        <div ref={dropRef} style={dropStyle}>
          {options.map(opt => {
            const c = getColor ? getColor(opt.value) : T.text;
            const active = opt.value === value;
            return (
              <div
                key={opt.value}
                onMouseDown={e => { e.preventDefault(); pick(opt.value); }}
                style={{
                  padding: "9px 13px", cursor: "pointer", fontSize: 13,
                  color: c, fontFamily: "inherit",
                  background: active ? T.accent + "18" : "transparent",
                  fontWeight: active ? 700 : 400,
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.accent + "10"}
                onMouseLeave={e => e.currentTarget.style.background = active ? T.accent + "18" : "transparent"}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadStateSelect({ value, onChange }) {
  return (
    <CustomSelect
      label="Lead State"
      value={value || "prospect"}
      options={LEAD_STATE_OPTS}
      onChange={onChange}
    />
  );
}

function InlineStageSelect({ label = "Stage", value, onChange }) {
  return (
    <CustomSelect
      label={label}
      value={value}
      options={ALL_STAGES.map(s => ({ value: s, label: STAGE_DEF[s].label }))}
      onChange={onChange}
      getColor={v => (STAGE_DEF[v] || STAGE_DEF.new).color}
    />
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
    fieldNav(e);
    if (e.key !== "Enter" && e.key !== "ArrowUp") onKeyDown?.(e);
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
