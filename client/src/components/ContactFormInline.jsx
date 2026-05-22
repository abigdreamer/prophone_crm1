import { useState } from "react";
import { useAppToast } from "../context/ToastContext";
import Input from "./ui/Input";
import Sel from "./ui/Sel";
import Btn from "./ui/Btn";
import { useTheme } from "../context/ThemeContext";
import USERS_DB from "../data/users";
import { ALL_STAGES, STAGE_DEF } from "../data/stages";
import { Spinner } from "./ui/Loader";

const SOCIAL_FIELDS = [
  { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/in/profile" },
  { key: "twitter",   label: "Twitter / X", placeholder: "https://twitter.com/handle" },
  { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@channel" },
  { key: "yelp",      label: "Yelp",      placeholder: "https://yelp.com/biz/name" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/profile" },
  { key: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@handle" },
];

export default function ContactFormInline({ contact, onSave, onCancel, pool, clientId, currentUser }) {
  const T = useTheme();
  const isEdit = !!contact;
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  const [form, setForm] = useState(contact || {
    firstName: "", lastName: "", company: "", title: "",
    email: "", phone: "", website: "", address: "", city: "",
    socialLinks: {},
    trucks: 0, lifecycleStage: "new", source: "", campaign: "",
    tags: [], notes: "", contractValue: "", accountSize: "1-5",
    ownedBy: currentUser?.name || "",
    pool, clientId,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSocial = (k, v) => setForm(p => ({
    ...p,
    socialLinks: { ...p.socialLinks, [k]: v },
  }));

  function buildPayload() {
    // Strip server-managed fields that must not be overwritten via the edit form
    const { status, isCanceled, canceledBy, canceledAt, cancelReason, restoredAt, restoredBy, ...rest } = form;
    return {
      ...rest,
      id: contact?.id || ((pool === "prospect" ? "p" : "c") + Date.now()),
      leadScore:     contact?.leadScore     || 10,
      emailsSent:    contact?.emailsSent    || 0,
      emailsOpened:  contact?.emailsOpened  || 0,
      emailsClicked: contact?.emailsClicked || 0,
      callsMade:     contact?.callsMade     || 0,
      callsAnswered: contact?.callsAnswered || 0,
      lastActivityAt: new Date().toISOString(),
      addedBy:  contact?.addedBy  || currentUser?.name || "Unknown",
      createdAt: contact?.createdAt || new Date().toISOString(),
      trucks:        parseInt(form.trucks)        || 0,
      contractValue: parseInt(form.contractValue) || 0,
    };
  }

  async function handleSave() {
    const hasName = !!(form.firstName?.trim() || form.lastName?.trim() || form.company?.trim());
    // if (!hasName) {
    //   toast.warning("Please provide at least a first name, last name, or company.");
    //   return;
    // }
    // if (!form.email?.trim()) {
    //   toast.warning("Email address is required.");
    //   return;
    // }
    setSaving(true);
    try {
      await onSave(buildPayload());
    } catch (err) {
      toast.error(err.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  const taStyle = {
    width: "100%", marginTop: 4,
    background: T.surface, border: "1px solid " + T.border,
    borderRadius: 6, padding: "8px 11px",
    color: T.text, fontSize: 12,
    outline: "none", fontFamily: "inherit",
    resize: "vertical", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
          {isEdit ? "Edit Contact" : "Add New Contact"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Spinner size={13} color="#fff" />
                  {isEdit ? "Saving…" : "Adding…"}
                </span>
              : (isEdit ? "Save Changes" : "Add Contact")
            }
          </Btn>
        </div>
      </div>

      {/* Form body */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        {/* Basic Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Input label="First Name"   value={form.firstName}     onChange={v => set("firstName",     v)} placeholder="Mike" />
          <Input label="Last Name"    value={form.lastName}      onChange={v => set("lastName",      v)} placeholder="Johnson" />
          <Input label="Email *"      value={form.email}         onChange={v => set("email",         v)} placeholder="mike@towpro.com" type="email" />
          <Input label="Phone"        value={form.phone}         onChange={v => set("phone",         v)} placeholder="(510) 555-1234" type="tel" />
          <Input label="Company"      value={form.company}       onChange={v => set("company",       v)} placeholder="TowPro LLC" />
          <Input label="Job Title"    value={form.title}         onChange={v => set("title",         v)} placeholder="Owner" />
          <div style={{ gridColumn: "1 / -1" }}>
            <Input label="Address" value={form.address} onChange={v => set("address", v)} placeholder="123 Main St, Dallas, TX 75201" />
          </div>
          <Input label="Website"            value={form.website}       onChange={v => set("website",       v)} placeholder="https://towpro.com" />
          <Input label="# of Trucks"        value={form.trucks}        onChange={v => set("trucks",        v)} placeholder="4" type="number" />
          <Input label="Contract Value ($)" value={form.contractValue} onChange={v => set("contractValue", v)} placeholder="5000" type="number" />
          <Sel
            label="Stage"
            value={form.lifecycleStage}
            onChange={v => set("lifecycleStage", v)}
            options={ALL_STAGES.map(s => ({ value: s, label: STAGE_DEF[s].label }))}
          />
          <Sel
            label="Assigned To"
            value={form.ownedBy}
            onChange={v => set("ownedBy", v)}
            options={USERS_DB.map(u => ({ value: u.name, label: `${u.name} (${u.role})` }))}
          />
        </div>

        {/* Social Media */}
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontSize: 10, color: T.muted, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
          }}>
            Social Media Links
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
              <Input
                key={key}
                label={label}
                value={form.socialLinks?.[key] || ""}
                onChange={v => setSocial(key, v)}
                placeholder={placeholder}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Notes
          </label>
          <textarea
            value={form.notes || ""}
            onChange={e => set("notes", e.target.value)}
            style={{ ...taStyle, minHeight: 60 }}
            onFocus={e => (e.target.style.borderColor = T.accent)}
            onBlur={e  => (e.target.style.borderColor = T.border)}
          />
        </div>
      </div>
    </div>
  );
}
