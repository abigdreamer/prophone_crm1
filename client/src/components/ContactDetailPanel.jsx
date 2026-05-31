import { useState, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import { addActivity } from "../services/api";
import { Spinner } from "./ui/Loader";
import {
  User, TrendingUp, Building2, Wrench, Share2, FileText, Tag, ChevronDown,
} from "lucide-react";

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
}) {
  const T     = useTheme();
  const toast = useAppToast();
  const isNew = !contact;

  const [form, setForm]             = useState(() => isNew ? emptyForm(currentUser) : contactToForm(contact));
  const [saveStatus, setSaveStatus] = useState(null);

  const firstNameRef   = useRef(null);
  const panelRef       = useRef(null);
  const statusTimerRef = useRef(null);
  const formRef        = useRef(form);
  const dirtyRef       = useRef(false);
  formRef.current      = form;

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

  useEffect(() => () => clearTimeout(statusTimerRef.current), []);

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
    <div ref={panelRef} style={{ width: "100%", paddingBottom: 24 }}>

      {/* Save status bar */}
      {(saveStatus || isNew) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8 }}>
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
        </div>
      )}

      {/* ── CONTACT INFO ──────────────────────────────────────────────────────── */}
      <Section icon={User} title="Contact Info" T={T}>
        <G cols="1fr 1fr 1fr 1fr">
          <F label="First Name"><FInput inputRef={firstNameRef} value={form.firstName} onChange={v => set("firstName", v)} placeholder="First name" /></F>
          <F label="Last Name"><FInput value={form.lastName} onChange={v => set("lastName", v)} placeholder="Last name" /></F>
          <F label="Title"><FInput value={form.title} onChange={v => set("title", v)} placeholder="Job title" /></F>
          <F label="Phone"><FInput value={form.phone} onChange={v => set("phone", v)} placeholder="(555) 000-0000" onKeyDown={phoneKey} /></F>
        </G>
        <G cols="1fr 1fr">
          <F label="Email"><FInput value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" /></F>
          <F label="Website"><FInput value={form.website} onChange={v => set("website", v)} placeholder="https://website.com" onBlur={() => { const v = (form.website||"").trim(); if(v && !/^https?:\/\//i.test(v)) set("website","https://"+v); }} /></F>
        </G>
        <G cols="2fr 1fr 1fr 1fr" mb={0}>
          <F label="Address"><FInput value={form.address} onChange={v => set("address", v)} placeholder="Street address" /></F>
          <F label="City"><FInput value={form.city} onChange={v => set("city", v)} placeholder="City" /></F>
          <F label="State"><FInput value={form.state} onChange={v => set("state", v)} placeholder="State" /></F>
          <F label="Zip"><FInput value={form.zip} onChange={v => set("zip", v)} placeholder="Zip" /></F>
        </G>
      </Section>

      {/* ── PIPELINE ──────────────────────────────────────────────────────────── */}
      <Section icon={TrendingUp} title="Pipeline" T={T}>
        <G cols="1fr 1fr" mb={0}>
          <F label="Lead Stage">
            <InlineStageSelect
              value={form.lifecycleStage}
              onChange={(newStage) => set("lifecycleStage", newStage)}
            />
          </F>
          <F label="Lead Score"><FInput value={form.leadScore} onChange={v => set("leadScore", v)} placeholder="0" onKeyDown={numKey} /></F>
        </G>
      </Section>

      {/* ── COMPANY & ACCOUNT ─────────────────────────────────────────────────── */}
      <Section icon={Building2} title="Company & Account" T={T}>
        <G cols="2fr 1fr 1fr 1fr 1fr">
          <F label="Company"><FInput value={form.company} onChange={v => set("company", v)} placeholder="Company name" /></F>
          <F label="Account Size"><FInput value={form.accountSize} onChange={v => set("accountSize", v)} placeholder="e.g. 1-5" /></F>
          <F label="Trucks"><FInput value={form.trucks} onChange={v => set("trucks", v)} placeholder="0" onKeyDown={numKey} /></F>
          <F label="Est. Revenue"><FInput value={form.estAnnualRevenue} onChange={v => set("estAnnualRevenue", v)} placeholder="$0" /></F>
          <F label="Contract ($)"><FInput value={form.contractValue} onChange={v => set("contractValue", v)} placeholder="0" onKeyDown={numKey} /></F>
        </G>
        <G cols="1fr 1fr 1fr" mb={0}>
          <F label="Years in Business"><FInput value={form.yearsInBusiness} onChange={v => set("yearsInBusiness", v)} placeholder="0" onKeyDown={numKey} /></F>
          <F label="Service Area (mi)"><FInput value={form.serviceAreaMiles} onChange={v => set("serviceAreaMiles", v)} placeholder="0" onKeyDown={numKey} /></F>
          <F label="Dispatcher Software"><FInput value={form.dispatcherSoftware} onChange={v => set("dispatcherSoftware", v)} placeholder="e.g. Omadi" /></F>
        </G>
      </Section>

      {/* ── SERVICES & OPERATIONS ─────────────────────────────────────────────── */}
      <Section icon={Wrench} title="Services & Operations" T={T}>
        <G cols="1fr 1fr">
          <F label="Services Offered"><FTextarea value={form.servicesOffered} onChange={v => set("servicesOffered", v)} placeholder="Heavy Duty, Semi Recovery, Accident…" rows={2} /></F>
          <F label="Motor Club Affiliations"><FTextarea value={form.motorClubAffiliations} onChange={v => set("motorClubAffiliations", v)} placeholder="State Farm, NSD…" rows={2} /></F>
        </G>
        <G cols="1fr" mb={0}>
          <F label="Pain Points"><FTextarea value={form.painPoints} onChange={v => set("painPoints", v)} placeholder="Key pain points or challenges…" rows={2} /></F>
        </G>
      </Section>

      {/* ── SOCIAL LINKS ──────────────────────────────────────────────────────── */}
      <Section icon={Share2} title="Social Links" T={T}>
        <G cols="1fr 1fr 1fr 1fr" mb={0}>
          {[
            { key: "facebook",  label: "Facebook",  ph: "facebook.com/…"    },
            { key: "instagram", label: "Instagram", ph: "instagram.com/…"   },
            { key: "linkedin",  label: "LinkedIn",  ph: "linkedin.com/in/…" },
            { key: "yelp",      label: "Yelp",      ph: "yelp.com/biz/…"    },
          ].map(({ key, label, ph }) => (
            <F key={key} label={label}>
              <FInput value={form.socialLinks?.[key] || ""} onChange={v => setSocial(key, v)} placeholder={ph} />
            </F>
          ))}
        </G>
      </Section>

      {/* ── NOTES ─────────────────────────────────────────────────────────────── */}
      <Section icon={FileText} title="Notes" T={T}>
        <G cols="1fr" mb={0}>
          <F label="Notes">
            <FTextarea value={form.notes} onChange={v => set("notes", v)} placeholder="Add notes about this contact…" rows={3} />
          </F>
        </G>
      </Section>

      {/* ── TAGS ──────────────────────────────────────────────────────────────── */}
      <Section icon={Tag} title="Tags" T={T} last>
        <G cols="1fr" mb={parsedTags.length > 0 ? 10 : 0}>
          <F label="Tags">
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

      {/* ── Cancellation info ─────────────────────────────────────────────────── */}
      {contact?.isCanceled && (
        <div style={{
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

function Section({ icon: Icon, title, children, T, last = false }) {
  return (
    <div style={{
      background: T.card,
      borderRadius: 8,
      padding: "14px 16px",
      marginBottom: last ? 0 : 12,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1.5px solid " + T.border }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: T.accent + "1a",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={13} color={T.accent} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "0.01em" }}>
            {title}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function F({ label, children }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.02em" }}>
          {label}
        </label>
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
