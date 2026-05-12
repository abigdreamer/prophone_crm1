import { useState, useEffect, useRef, forwardRef } from "react";
import Btn from "./ui/Btn";
import { useTheme } from "../context/ThemeContext";
import { useAppToast } from "../context/ToastContext";
import { STAGE_DEF, ALL_STAGES } from "../data/stages";
import fmt from "../utils/format";
import * as db from "../services/api";
import { Spinner } from "./ui/Loader";

const ACTION_CFG = {
  CREATE:  { label: "Created",  color: "#22c55e", icon: "✦" },
  UPDATE:  { label: "Updated",  color: "#6366f1", icon: "✎" },
  CANCEL:  { label: "Canceled", color: "#ef4444", icon: "✕" },
  RESTORE: { label: "Restored", color: "#22c55e", icon: "↩" },
};

const SOCIAL_FIELDS = [
  { key: "facebook",  label: "Facebook",    color: "#1877f2", placeholder: "https://facebook.com/yourpage"   },
  { key: "instagram", label: "Instagram",   color: "#e1306c", placeholder: "https://instagram.com/yourhandle" },
  { key: "linkedin",  label: "LinkedIn",    color: "#0a66c2", placeholder: "https://linkedin.com/in/profile"  },
  { key: "twitter",   label: "Twitter / X", color: "#1da1f2", placeholder: "https://twitter.com/handle"       },
  { key: "youtube",   label: "YouTube",     color: "#ff0000", placeholder: "https://youtube.com/@channel"     },
  { key: "yelp",      label: "Yelp",        color: "#d32323", placeholder: "https://yelp.com/biz/name"        },
  { key: "pinterest", label: "Pinterest",   color: "#e60023", placeholder: "https://pinterest.com/profile"    },
  { key: "tiktok",    label: "TikTok",      color: "#010101", placeholder: "https://tiktok.com/@handle"       },
];

const DEFAULT_FIELD_SETTINGS = {
  email: true, phone: true, website: true, address: true, city: true,
  company: true, title: true, accountSize: true, source: true, campaign: true,
  notes: true, tags: true, trucks: true, contractValue: true, leadScore: true,
  social_facebook: true, social_instagram: true, social_linkedin: true,
  social_twitter: true, social_youtube: true, social_yelp: true,
  social_pinterest: true, social_tiktok: true,
};

function contactToForm(c) {
  return {
    firstName:      c.firstName      || "",
    lastName:       c.lastName       || "",
    company:        c.company        || "",
    title:          c.title          || "",
    email:          c.email          || "",
    phone:          c.phone          || "",
    website:        c.website        || "",
    address:        c.address        || "",
    socialLinks:    c.socialLinks    || {},
    trucks:         c.trucks   != null ? String(c.trucks)         : "",
    lifecycleStage: c.lifecycleStage || "new",
    source:         c.source         || "",
    campaign:       c.campaign       || "",
    tags:           Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || ""),
    notes:          c.notes          || "",
    contractValue:  c.contractValue != null ? String(c.contractValue) : "",
    accountSize:    c.accountSize    || "",
    ownedBy:        c.ownedBy        || "",
  };
}

function emptyForm(currentUser) {
  return {
    firstName: "", lastName: "", company: "", title: "",
    email: "", phone: "", website: "", address: "",
    socialLinks: {},
    trucks: "", lifecycleStage: "new", source: "", campaign: "",
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

  const [form, setForm]           = useState(() => isNew ? emptyForm(currentUser) : contactToForm(contact));
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const [auditLog, setAuditLog]   = useState([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [fieldVis, setFieldVis]   = useState(DEFAULT_FIELD_SETTINGS);
  const [noteClicked, setNoteClicked] = useState(false);

  const firstNameRef    = useRef(null);
  const statusTimerRef  = useRef(null);
  const formRef         = useRef(form);
  const dirtyRef        = useRef(false);  // true when form has unsaved changes
  formRef.current       = form;

  // ── Auto-save implementation ──────────────────────────────────────────────
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
      dirtyRef.current = true; // re-mark dirty so retry is possible
      setSaveStatus(null);
      toast.error(err?.message || "Auto-save failed");
    }
  };

  // ── Cleanup status timer on unmount ──────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(statusTimerRef.current);
  }, []);

  // ── Reset form when contact changes ───────────────────────────────────────
  useEffect(() => {
    dirtyRef.current = false;
    const next = contact ? contactToForm(contact) : emptyForm(currentUser);
    formRef.current = next;
    setForm(next);
    setSaveStatus(null);
    setAuditLog([]);
    setAuditOpen(false);
    onDirtyChange?.(false);
    onFormChange?.(next);
  }, [contact?.id]); // eslint-disable-line

  // ── Auto-focus first name on contact load or new ──────────────────────────
  useEffect(() => {
    const t = setTimeout(() => firstNameRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [contact?.id]);

  // ── Audit log ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contact?.id) return;
    db.getContactClientActivities(contact.id).then(setAuditLog).catch(() => {});
  }, [contact?.id]);

  // ── Field visibility settings ─────────────────────────────────────────────
  useEffect(() => {
    db.getSettings(contact?.clientId || null, "contact_fields")
      .then(res => {
        if (res?.config && Object.keys(res.config).length > 0) {
          setFieldVis({ ...DEFAULT_FIELD_SETTINGS, ...res.config });
        }
      })
      .catch(() => {});
  }, [contact?.clientId]);

  // ── Escape → save immediately if dirty, then blur ────────────────────────
  useEffect(() => {
    const handler = (e) => {
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

  // ── Setters — only mark dirty, never auto-save on keystroke ─────────────
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


  // ── Build payload ─────────────────────────────────────────────────────────
  function buildPayload(f) {
    const fd = f || formRef.current;
    const tagsArr = fd.tags ? fd.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    return {
      ...(contact || {}),
      ...fd,
      id:            contact?.id || ((pool === "prospect" ? "p" : "c") + Date.now()),
      pool:          contact?.pool     || pool,
      clientId:      contact?.clientId || clientId,
      tags:          tagsArr,
      trucks:        parseInt(fd.trucks)        || 0,
      contractValue: parseInt(fd.contractValue) || 0,
      leadScore:     contact?.leadScore     || 10,
      emailsSent:    contact?.emailsSent    || 0,
      emailsOpened:  contact?.emailsOpened  || 0,
      emailsClicked: contact?.emailsClicked || 0,
      callsMade:     contact?.callsMade     || 0,
      callsAnswered: contact?.callsAnswered || 0,
      lastActivityAt: new Date().toISOString(),
      addedBy:   contact?.addedBy   || currentUser?.name || "Unknown",
      createdAt: contact?.createdAt || new Date().toISOString(),
    };
  }

  // ── Manual save (new contacts only) ──────────────────────────────────────
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

  // ── Derived display values ─────────────────────────────────────────────────
  const personName   = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const heroName     = personName || form.company || form.email || (isNew ? "New Contact" : "Unknown Contact");
  const avatarLetter = personName
    ? ((form.firstName?.[0] || "") + (form.lastName?.[0] || "")).toUpperCase()
    : (form.company?.[0] || form.email?.[0] || (isNew ? "+" : "?")).toUpperCase();

  const d    = STAGE_DEF[form.lifecycleStage] || STAGE_DEF.new;
  // Use accent color if stage color is dim/muted (makes avatar pop more)
  const avatarColor = (d.color === T.muted || d.color === T.dim) ? T.accent : d.color;
  const show = (key) => fieldVis[key] !== false;
  const enabledSocials = SOCIAL_FIELDS.filter(({ key }) => fieldVis[`social_${key}`] !== false);

  const taStyle = {
    width: "100%", marginTop: 4,
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "8px 11px",
    color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit",
    resize: "vertical", boxSizing: "border-box",
  };

  const parsedTags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  // key handlers for number fields
  const numKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^[\d()]$/.test(e.key)) e.preventDefault();
  };
  const phoneKey = (e) => {
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) return;
    if (!/^[\d()\-+ ]$/.test(e.key)) e.preventDefault();
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>

        {/* Banner */}
        <div style={{
          height: 88, position: "relative",
          background: `linear-gradient(135deg, ${avatarColor}35 0%, ${avatarColor}12 50%, transparent 100%)`,
        }}>
          <div style={{ position: "absolute", top: 14, right: 16, display: "flex", alignItems: "center", gap: 8 }}>
            {saveStatus === "saving" && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted }}>
                <Spinner size={10} color={T.muted} /> Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>✓ Saved</span>
            )}
            {isNew && saveStatus === null && (
              <span style={{ fontSize: 10, color: T.muted, fontStyle: "italic" }}>Press Esc to save</span>
            )}
          </div>
        </div>

        {/* Profile body */}
        <div style={{ padding: "0 24px 20px" }}>

          {/* Avatar + badges row — avatar overlaps banner */}
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

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingBottom: 8 }}>
              {!isNew && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                  color: contact?.isCanceled ? T.red : T.green,
                  background: (contact?.isCanceled ? T.red : T.green) + "15",
                  border: "1.5px solid " + (contact?.isCanceled ? T.red : T.green) + "45",
                  borderRadius: 20, padding: "4px 12px",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                  {contact?.isCanceled ? "CANCELED" : "ACTIVE"}
                </span>
              )}
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: avatarColor, background: avatarColor + "18",
                border: "1.5px solid " + avatarColor + "40",
                borderRadius: 20, padding: "4px 12px",
              }}>
                {d.label}
              </span>
            </div>
          </div>

          {/* Name + subtitle */}
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

          {/* Contact chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {form.email && heroName !== form.email && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.accent, background: T.accent + "0d", border: "1px solid " + T.accent + "25", borderRadius: 20, padding: "5px 13px", maxWidth: 240, overflow: "hidden" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.email}</span>
              </span>
            )}
            {form.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.dim, background: T.surface, border: "1px solid " + T.border, borderRadius: 20, padding: "5px 13px", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6.16 6.16l1.63-1.63a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>{form.phone.split(/[|,]/)[0].trim()}</span>
                {form.phone.split(/[|,]/).length > 1 && <span style={{ color: T.muted, fontSize: 10, marginLeft: 2 }}>+{form.phone.split(/[|,]/).length - 1}</span>}
              </span>
            )}
            {form.website && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.blue, background: T.blue + "0d", border: "1px solid " + T.blue + "25", borderRadius: 20, padding: "5px 13px", maxWidth: 200, overflow: "hidden", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.website.replace(/^https?:\/\//, "")}</span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Stats cards row ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {/* Lead Score */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Lead Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: T.amber, lineHeight: 1 }}>{contact?.leadScore ?? 0}</span>
          </div>
          <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginTop: 10 }}>
            <div style={{ width: `${contact?.leadScore ?? 0}%`, height: "100%", background: T.amber, borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
        {/* Contract Value */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Contract Value</div>
          <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: parseInt(form.contractValue) > 0 ? T.green : T.muted }}>
            {parseInt(form.contractValue) > 0 ? "$" + (parseInt(form.contractValue) >= 1000 ? (parseInt(form.contractValue)/1000).toFixed(1) + "k" : parseInt(form.contractValue)) : "—"}
          </span>
        </div>
        {/* Fleet Size */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Fleet Size</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: parseInt(form.trucks) > 0 ? T.orange : T.muted }}>
              {parseInt(form.trucks) > 0 ? form.trucks : "—"}
            </span>
            {parseInt(form.trucks) > 0 && <span style={{ fontSize: 11, color: T.muted }}>trucks</span>}
          </div>
        </div>
        {/* Account Size */}
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Account Size</div>
          <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: form.accountSize ? T.blue : T.muted }}>
            {form.accountSize || "—"}
          </span>
        </div>
      </div>

      {/* ── Name & Role ───────────────────────────────────────────────────── */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
        <SectionHeader>Name &amp; Role</SectionHeader>
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <FieldInput ref={firstNameRef} label="First Name" value={form.firstName} onChange={v => set("firstName", v)} placeholder="First" />
          <FieldInput label="Last Name"  value={form.lastName}  onChange={v => set("lastName",  v)} placeholder="Last" />
          <FieldInput label="Job Title"  value={form.title}     onChange={v => set("title",     v)} placeholder="Owner / Manager" />
        </div>
      </div>

      {/* ── Contact Info + Company & Acquisition ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Section title="Contact Info">
          {show("email")   && <InlineInput label="Email"   type="email" value={form.email}   onChange={v => set("email",   v)} placeholder="email@company.com"    color={T.accent} />}
          {show("phone")   && <InlineInput label="Phone"   type="tel"   value={form.phone}   onChange={v => set("phone",   v)} placeholder="(555) 000-0000" onKeyDown={phoneKey} />}
          {show("website") && <InlineInput label="Website"              value={form.website} onChange={v => set("website", v)} placeholder="https://..."          color={T.blue} />}
          {show("address") && <InlineInput label="Address"              value={form.address} onChange={v => set("address", v)} placeholder="123 Main St, City, ST" />}
        </Section>

        <Section title="Company &amp; Acquisition">
          <InlineStageSelect value={form.lifecycleStage} onChange={v => set("lifecycleStage", v)} />
          {show("company")       && <InlineInput label="Company"      value={form.company}       onChange={v => set("company",       v)} placeholder="Acme Corp" />}
          {show("accountSize")   && <InlineInput label="Account Size" value={form.accountSize}   onChange={v => set("accountSize",   v)} placeholder="1-5" />}
          {show("source")        && <InlineInput label="Source"       value={form.source}        onChange={v => set("source",        v)} placeholder="Referral" />}
          {show("campaign")      && <InlineInput label="Campaign"     value={form.campaign}      onChange={v => set("campaign",      v)} placeholder="Q1 Outreach" />}
          {show("trucks")        && <InlineInput label="# of Trucks"  type="number" value={form.trucks}        onChange={v => set("trucks",        v)} placeholder="0" onKeyDown={numKey} />}
          {show("contractValue") && <InlineInput label="Contract ($)" type="number" value={form.contractValue} onChange={v => set("contractValue", v)} placeholder="0" onKeyDown={numKey} />}
        </Section>
      </div>

      {/* ── Social Media ─────────────────────────────────────────────────── */}
      {enabledSocials.length > 0 && (
        <Section title="Social Media" style={{ marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            {enabledSocials.map(({ key, label, color, placeholder }) => (
              <InlineInput
                key={key}
                label={label}
                value={form.socialLinks?.[key] || ""}
                onChange={v => setSocial(key, v)}
                placeholder={placeholder}
                color={color}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── CRM metadata ─────────────────────────────────────────────────── */}
      {!isNew && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
          background: T.card, border: "1px solid " + T.border, borderRadius: 8,
          marginBottom: 12, overflow: "hidden",
        }}>
          {[
            ["Owner",         contact.ownedBy || "—"],
            ["Added By",      contact.addedBy || "—"],
            ["Created",       fmt.date(contact.createdAt)],
            ["Last Activity", fmt.ago(contact.lastActivityAt)],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ padding: "12px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.border : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cancellation info ────────────────────────────────────────────── */}
      {contact?.isCanceled && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
          background: T.red + "08", border: "1px solid " + T.red + "30",
          borderRadius: 8, marginBottom: 12, overflow: "hidden",
        }}>
          {[
            ["Canceled By", contact.canceledBy  || "—"],
            ["Canceled At", fmt.date(contact.canceledAt)],
            ["Reason",      contact.cancelReason || "—"],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ padding: "10px 16px", borderRight: i < arr.length - 1 ? "1px solid " + T.red + "25" : "none" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.red + "aa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: T.dim, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      {show("notes") && (
        <Section title="Notes" style={{ marginBottom: 12 }}>
          <div
            onClick={() => setNoteClicked(v => !v)}
            style={{ position: "relative" }}
          >
            {noteClicked && !isNew && contact?.lastActivityAt && (
              <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, marginBottom: 5, fontFamily: "inherit" }}>
                {(() => {
                  const d2 = new Date(contact.lastActivityAt);
                  const mm = String(d2.getMonth() + 1).padStart(2, "0");
                  const dd2 = String(d2.getDate()).padStart(2, "0");
                  const yy = String(d2.getFullYear()).slice(2);
                  const day = d2.toLocaleDateString("en-US", { weekday: "short" });
                  const h = String(d2.getHours()).padStart(2, "0");
                  const m = String(d2.getMinutes()).padStart(2, "0");
                  return `${mm}/${dd2}/${yy} ${day} ${h}:${m}`;
                })()}
              </div>
            )}
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              onFocus={e => (e.target.style.borderColor = T.accent)}
              onBlur={e  => (e.target.style.borderColor = T.border)}
              placeholder="Add notes about this contact…"
              style={{ ...taStyle, minHeight: 80 }}
            />
          </div>
        </Section>
      )}

      {/* ── Tags ─────────────────────────────────────────────────────────── */}
      {show("tags") && (
        <Section title="Tags" style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={form.tags}
            onChange={e => set("tags", e.target.value)}
            onFocus={e => (e.target.style.borderColor = T.accent)}
            onBlur={e  => (e.target.style.borderColor = T.border)}
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
                <span key={tag} style={{
                  padding: "4px 11px", borderRadius: 12, fontSize: 11,
                  background: T.accent + "15", color: T.accent,
                  border: "1px solid " + T.accent + "30", fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Audit Log ──────────────────────────────────────────────────────
      {!isNew && (
        <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden" }}>
          <button
            onClick={() => setAuditOpen(o => !o)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Audit Log <span style={{ color: T.dim, fontWeight: 500 }}>({auditLog.length})</span>
            </span>
            <span style={{ fontSize: 12, color: T.muted, transform: auditOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
          </button>
          {auditOpen && (
            <div style={{ borderTop: "1px solid " + T.border }}>
              {auditLog.length === 0 ? (
                <div style={{ padding: "14px 16px", fontSize: 12, color: T.muted, fontStyle: "italic" }}>No audit events yet.</div>
              ) : auditLog.map((entry, i) => {
                const cfg  = ACTION_CFG[entry.action] || { label: entry.action, color: T.muted, icon: "·" };
                const meta = entry.metadata || {};
                return (
                  <div key={entry.id} style={{ display: "flex", gap: 11, padding: "10px 16px", borderBottom: i < auditLog.length - 1 ? "1px solid " + T.border + "66" : "none" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: cfg.color + "18", border: "1px solid " + cfg.color + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: cfg.color, marginTop: 1 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "1px 6px", borderRadius: 4, background: cfg.color + "18", color: cfg.color, border: "1px solid " + cfg.color + "35" }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 10, color: T.muted }}>by {entry.performedBy || "system"} · {fmt.date(entry.ts)}</span>
                      </div>
                      {entry.action === "CREATE" && (
                        <div style={{ fontSize: 11, color: T.dim }}>
                          {meta.name}{meta.company ? ` · ${meta.company}` : ""}
                          {meta.email ? <span style={{ color: T.muted }}> · {meta.email}</span> : null}
                        </div>
                      )}
                      {entry.action === "UPDATE" && meta.changes && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                          {Object.entries(meta.changes).map(([field, { from, to }]) => (
                            <span key={field} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: T.accent + "12", color: T.dim, border: "1px solid " + T.border }}>
                              {field}: <span style={{ color: T.muted, textDecoration: "line-through" }}>{String(from)}</span>{" → "}<span style={{ color: T.text, fontWeight: 600 }}>{String(to)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.action === "CANCEL"  && meta.reason         && <div style={{ fontSize: 11, color: T.dim, fontStyle: "italic" }}>"{meta.reason}"</div>}
                      {entry.action === "RESTORE" && meta.previousReason && <div style={{ fontSize: 11, color: T.muted }}>Previously canceled: <span style={{ fontStyle: "italic" }}>"{meta.previousReason}"</span></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ children }) {
  const T = useTheme();
  return (
    <div style={{ padding: "8px 16px", borderBottom: "1px solid " + T.border, fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Section({ title, children, style }) {
  const T = useTheme();
  return (
    <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, overflow: "hidden", ...style }}>
      <SectionHeader>{title}</SectionHeader>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function InlineStageSelect({ value, onChange }) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  const d = STAGE_DEF[value] || STAGE_DEF.new;
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3, transition: "color 0.15s" }}>Stage</label>
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

function InlineInput({ label, value, onChange, placeholder, type = "text", color, onKeyDown }) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid " + T.border + "44" }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3, transition: "color 0.15s" }}>{label}</label>
      <input
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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

const FieldInput = forwardRef(function FieldInput({ label, value, onChange, placeholder, type = "text" }, ref) {
  const T = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: focused ? T.accent : T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, transition: "color 0.15s" }}>{label}</label>
      <input
        ref={ref}
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
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

function MetricCard({ label, color, children }) {
  const T = useTheme();
  return (
    <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
