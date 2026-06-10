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

function stageTypeColor(label, T) {
  switch (label) {
    case "Prospect":  return T.muted;
    case "Lead":      return T.blue;
    case "Warm Lead": return T.purple;
    case "Hot Lead":  return T.amber;
    case "Customer":  return T.green;
    case "Lost":      return T.red;
    default:          return T.muted;
  }
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

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

function buildPayload(f, contact, pool, clientId, currentUser) {
  const tagsArr = f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  return {
    ...(contact || {}), ...f,
    id:               contact?.id || ((pool === "prospect" ? "p" : "c") + Date.now()),
    pool:             contact?.pool    || pool,
    clientId:         contact?.clientId || clientId,
    tags:             tagsArr,
    trucks:           parseInt(f.trucks)           || 0,
    contractValue:    parseInt(f.contractValue)    || 0,
    leadScore:        parseInt(f.leadScore)        || 0,
    yearsInBusiness:  parseInt(f.yearsInBusiness)  || 0,
    serviceAreaMiles: parseInt(f.serviceAreaMiles) || 0,
    lastActivityAt:   new Date().toISOString(),
    addedBy:          contact?.addedBy || currentUser?.name || "Unknown",
    createdAt:        contact?.createdAt || new Date().toISOString(),
  };
}

function fieldNav(e) {
  if (e.key !== "Enter" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll("[data-field-nav]"));
  const idx = all.indexOf(e.currentTarget);
  if (e.key === "Enter" && idx < all.length - 1) all[idx + 1].focus();
  if (e.key === "ArrowUp" && idx > 0) all[idx - 1].focus();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContactDetailPanel({
  contact, onSave, onAction, currentUser, pool, clientId,
  onFormChange, onDirtyChange,
  editMode = false, onEditModeChange,
}) {
  const T     = useTheme();
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

  const doSaveRef = useRef(null);
  doSaveRef.current = async () => {
    if (isNew || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveStatus("saving");
    onDirtyChange?.(true);
    try {
      await onSave(buildPayload(formRef.current, contact, pool, clientId, currentUser));
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

  useEffect(() => {
    dirtyRef.current = false;
    const next = contact ? contactToForm(contact) : emptyForm(currentUser);
    formRef.current = next;
    setForm(next);
    setSaveStatus(null);
    onDirtyChange?.(false);
    onFormChange?.(next);
  }, [contact?.id]); // eslint-disable-line

  // Sync server-computed leadScore back into the form after a save,
  // without resetting other fields the user may have in-flight.
  useEffect(() => {
    if (!contact) return;
    const serverScore = String(contact.leadScore ?? 0);
    setForm(prev => {
      if (prev.leadScore === serverScore) return prev;
      const next = { ...prev, leadScore: serverScore };
      formRef.current = next;
      return next;
    });
  }, [contact?.leadScore]); // eslint-disable-line

  useEffect(() => {
    if (contact) return;
    const t = setTimeout(() => {
      let el = panelRef.current?.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "visible") {
          el.scrollTo({ top: 0, behavior: "smooth" }); break;
        }
        el = el.parentElement;
      }
      firstNameRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [contact?.id]); // eslint-disable-line

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && !isNew) {
        if (panelRef.current?.contains(document.activeElement)) return;
        e.preventDefault();
        setTimeout(() => {
          let el = panelRef.current?.parentElement;
          while (el) {
            if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "visible") {
              el.scrollTo({ top: 0, behavior: "smooth" }); break;
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
      } else if (dirtyRef.current) {
        e.stopImmediatePropagation();
        doSaveRef.current?.();
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
      await onSave(buildPayload(formRef.current, null, pool, clientId, currentUser));
      setSaveStatus("saved");
      onDirtyChange?.(false);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      setSaveStatus(null);
      toast.error(err?.message || "Failed to add contact");
    }
  }

  const numKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };
  const phoneKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^[\d()\-+ ]$/.test(e.key)) e.preventDefault();
  };

  const leadType      = STAGE_TYPE_MAP[form.lifecycleStage] || "Prospect";
  const leadTypeColor = stageTypeColor(leadType, T);
  const parsedTags    = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];



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
            ["Canceled At", contact.canceledAt ? new Date(contact.canceledAt).toLocaleDateString() : "—"],
            ["Reason",      contact.cancelReason || "—"],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ padding: "10px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.red + "25" : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.red + "aa", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

    </div>
    </EditCtx.Provider>
  );
}

// ─── Grid row ────────────────────────────────────────────────────────────────

function G({ cols, children, gap = "10px 14px", mb = 12 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap, marginBottom: mb }}>
      {children}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

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

// ─── Field wrapper ────────────────────────────────────────────────────────────

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
  const [pos,  setPos]  = useState({ top: 0, left: 0, width: 120 });
  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (!triggerRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    function reposition() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const d = STAGE_DEF[value] || STAGE_DEF.new;

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  }

  const dropdown = open && createPortal(
    <div ref={dropRef} style={{
      position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 200),
      zIndex: 99999, background: T.card, border: "1px solid " + T.border,
      borderRadius: 8, boxShadow: "0 10px 32px rgba(0,0,0,0.32)", overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid " + T.border + "66" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>Select Stage</span>
      </div>
      {ALL_STAGES.map(s => {
        const sd = STAGE_DEF[s];
        const active = s === value;
        return (
          <div
            key={s}
            onMouseDown={e => { e.preventDefault(); if (!active) { onChange(s, ""); setOpen(false); } }}
            style={{
              padding: "9px 14px", cursor: active ? "default" : "pointer",
              fontSize: 13, color: sd.color, fontFamily: "inherit",
              background: active ? sd.color + "14" : "transparent",
              fontWeight: active ? 700 : 400,
              display: "flex", alignItems: "center", gap: 9,
              opacity: active ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = sd.color + "12"; }}
            onMouseLeave={e => { e.currentTarget.style.background = active ? sd.color + "14" : "transparent"; }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: sd.color, flexShrink: 0, display: "inline-block" }} />
            {sd.label}
            {active && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.05em" }}>CURRENT</span>}
          </div>
        );
      })}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        data-field-nav
        type="button"
        onClick={toggle}
        onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accent}22`; }}
        onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
        onKeyDown={e => {
          if (e.key === "Enter") { fieldNav(e); return; }
          if (e.key === " ") { e.preventDefault(); toggle(); }
          if (e.key === "Escape") setOpen(false);
        }}
        style={{
          width: "100%", padding: "8px 11px", boxSizing: "border-box",
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: 5, fontSize: 13, fontFamily: "inherit",
          outline: "none", minHeight: 36,
          transition: "border-color 0.15s, box-shadow 0.15s",
          textAlign: "left", display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: d.color, fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0, display: "inline-block" }} />
          {d.label}
        </span>
        <ChevronDown size={14} color={d.color} style={{ opacity: 0.5, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {dropdown}
    </>
  );
}

// ─── Keep for external use ────────────────────────────────────────────────────

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
          borderRadius: 10, padding: "9px 12px", color: T.text, fontSize: 12,
          outline: "none", fontFamily: "inherit",
          boxShadow: focused ? "0 0 0 3px " + T.accent + "18" : "none",
          transition: "all 0.15s ease",
        }}
      />
    </div>
  );
});
