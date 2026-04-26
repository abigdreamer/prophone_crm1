import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Sel from "../ui/Sel";
import Btn from "../ui/Btn";
import T from "../../theme";
import { getUsers } from "../../api/auth.api";
import { ALL_STAGES, STAGE_DEF } from "../../data/stages";
import { Spinner } from "../ui/Loader";

// ─── Add / Edit Contact modal ─────────────────────────────────────────────────
export default function ContactModal({ contact, onSave, onClose, pool, clientId, currentUser, groups = [] }) {
  const isEdit = !!contact;
  const [saving, setSaving] = useState(false);
  const [users,  setUsers]  = useState([]);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState(contact || {
    firstName: "", lastName: "", company: "", title: "",
    email: "", phone: "", website: "", city: "",
    lifecycleStage: "new", source: "", campaign: "",
    tags: [], notes: "", contractValue: "", accountSize: "1-5",
    ownedBy: currentUser?.name || "",
    groupId: "",
    pool, clientId,
  });

  useEffect(() => {
    getUsers(clientId).then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]));
  }, [clientId]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  };

  async function handleSave() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.email.trim())     e.email     = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});

    const saved = {
      ...form,
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
      activities: contact?.activities || [{
        id: "a" + Date.now(),
        type: "stage_changed",
        note: "Contact created",
        ts: new Date().toISOString(),
        by: currentUser?.name || "Unknown",
      }],
      contractValue: parseInt(form.contractValue) || 0,
    };
    setSaving(true);
    try {
      await onSave(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Contact" : "Add Contact"} onClose={onClose} width={600}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input
          label="First Name" required
          value={form.firstName} onChange={v => set("firstName", v)}
          placeholder="Mike" error={errors.firstName}
        />
        <Input label="Last Name" value={form.lastName} onChange={v => set("lastName", v)} placeholder="Johnson" />
        <Input
          label="Email" required type="email"
          value={form.email} onChange={v => set("email", v)}
          placeholder="mike@company.com" error={errors.email}
        />
        <Input label="Phone" type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="(510) 555-1234" />
        <Input label="Company"   value={form.company} onChange={v => set("company", v)} placeholder="Acme Inc." />
        <Input label="Job Title" value={form.title}   onChange={v => set("title",   v)} placeholder="Owner" />
        <Input label="City"      value={form.city}    onChange={v => set("city",    v)} placeholder="Oakland, CA" />
        <Input label="Contract Value ($)" type="number" value={form.contractValue} onChange={v => set("contractValue", v)} placeholder="5000" />
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
          options={users.length
            ? users.map(u => ({ value: u.name, label: `${u.name} (${u.role})` }))
            : currentUser ? [{ value: currentUser.name, label: `${currentUser.name} (${currentUser.role})` }] : []
          }
        />
        <Sel
          label="Group (optional)"
          value={form.groupId || ""}
          onChange={v => set("groupId", v || null)}
          options={[
            { value: "", label: "— No group —" },
            ...groups.map(g => ({ value: g.id, label: `${g.name} (${g.contactCount} contacts)` })),
          ]}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          style={{
            width: "100%", marginTop: 4,
            background: T.surface, border: "1px solid " + T.border,
            borderRadius: 6, padding: "8px 11px",
            color: T.text, fontSize: 12,
            outline: "none", fontFamily: "inherit",
            minHeight: 60, resize: "vertical", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = T.accent)}
          onBlur={e  => (e.target.style.borderColor = T.border)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
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
    </Modal>
  );
}
