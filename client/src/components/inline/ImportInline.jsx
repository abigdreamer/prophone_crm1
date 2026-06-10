import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, X, ChevronRight, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Btn from "../ui/Btn";
import { Spinner } from "../ui/Loader";
import * as db from "../../services/api";

function detectSocialPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("yelp.com")) return "yelp";
  if (u.includes("pinterest.com")) return "pinterest";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("maps.google.com") || u.includes("google.com/maps") || u.includes("goo.gl/maps")) return "google";
  return null;
}

const STAGE_ALIASES = {
  new: "new", prospect: "new", fresh: "new", cold: "new", "cold lead": "new",
  contacted: "contacted", contact: "contacted", warm: "contacted", "warm lead": "contacted",
  engaged: "engaged",
  demo_scheduled: "demo_scheduled", "demo scheduled": "demo_scheduled",
  demo_done: "demo_done", "demo done": "demo_done",
  proposal_sent: "proposal_sent", "proposal sent": "proposal_sent", proposal: "proposal_sent",
  hot: "proposal_sent", "hot lead": "proposal_sent",
  negotiating: "negotiating",
  customer: "customer", client: "customer",
  not_qualified: "not_qualified", "not qualified": "not_qualified", unqualified: "not_qualified",
  lost: "lost",
  churned: "churned",
};
function normalizeStage(raw) {
  return STAGE_ALIASES[(raw || "").toLowerCase().trim()] || null;
}

const CONTACT_FIELDS = [
  { key: "fullName",              label: "Full Name (auto-split)",    group: "Identity" },
  { key: "firstName",             label: "First Name",                group: "Identity" },
  { key: "lastName",              label: "Last Name",                 group: "Identity" },
  { key: "email",                 label: "Email",                     group: "Contact" },
  { key: "phone",                 label: "Phone",                     group: "Contact" },
  { key: "company",               label: "Company",                   group: "Company" },
  { key: "title",                 label: "Job Title",                 group: "Company" },
  { key: "website",               label: "Website",                   group: "Company" },
  { key: "address",               label: "Address",                   group: "Company" },
  { key: "city",                  label: "City",                      group: "Company" },
  { key: "state",                 label: "State",                     group: "Company" },
  { key: "zip",                   label: "ZIP Code",                  group: "Company" },
  { key: "trucks",                label: "# of Trucks",               group: "Business" },
  { key: "contractValue",         label: "Contract Value ($)",        group: "Business" },
  { key: "estAnnualRevenue",      label: "Est. Annual Revenue",       group: "Business" },
  { key: "yearsInBusiness",       label: "Years in Business",         group: "Business" },
  { key: "servicesOffered",       label: "Services Offered",          group: "Business" },
  { key: "serviceAreaMiles",      label: "Service Area (miles)",      group: "Business" },
  { key: "motorClubAffiliations", label: "Motor Club Affiliations",   group: "Business" },
  { key: "dispatcherSoftware",    label: "Dispatcher Software",       group: "Business" },
  { key: "painPoints",            label: "Pain Points",               group: "Business" },
  { key: "leadScore",             label: "Lead Score",                group: "Business" },
  { key: "lifecycleStage",        label: "Lead Stage",                group: "Business" },
  { key: "source",                label: "Source",                    group: "Business" },
  { key: "campaign",              label: "Campaign",                  group: "Business" },
  { key: "tags",                  label: "Tags (comma-separated)",    group: "Other" },
  { key: "notes",                 label: "Notes",                     group: "Other" },
  { key: "description",           label: "Description",               group: "Other" },
  { key: "createdAt",             label: "Date Added",                group: "Other" },
  { key: "socialMedia",           label: "Social / URL (auto-detect)", group: "Social" },
  { key: "__skip__",              label: "— Skip column —",           group: "" },
];

const AUTO_MAP = {
  "full name": "fullName", fullname: "fullName", full_name: "fullName",
  "contact name": "fullName", name: "fullName", contact: "fullName",
  "owner/contact name": "fullName", "owner contact name": "fullName",
  "contact person": "fullName", owner: "fullName",
  firstname: "firstName", first_name: "firstName", "first name": "firstName", "given name": "firstName",
  lastname: "lastName", last_name: "lastName", "last name": "lastName",
  "family name": "lastName", surname: "lastName",
  email: "email", "e-mail": "email", "email address": "email",
  "e-mail address": "email", "email addr": "email",
  phone: "phone", mobile: "phone", cell: "phone", "phone number": "phone",
  "phone #": "phone", telephone: "phone", "business phone": "phone", "office phone": "phone",
  company: "company", organization: "company", "company name": "company",
  "business name": "company", business: "company", dba: "company",
  title: "title", "job title": "title", position: "title", role: "title", "position title": "title",
  website: "website", url: "website", "website url": "website", web: "website",
  domain: "website", "web domain": "website", "company domain": "website", site: "website",
  address: "address", "street address": "address", street: "address",
  "mailing address": "address", location: "address",
  city: "city", "city name": "city", town: "city",
  state: "state", "us state": "state", "state/province": "state",
  zip: "zip", "zip code": "zip", zipcode: "zip", "postal code": "zip", postal_code: "zip", postal: "zip",
  trucks: "trucks", "# of trucks": "trucks", "num trucks": "trucks",
  "number of trucks": "trucks", "truck count": "trucks",
  "company size trucks": "trucks", "company size (trucks)": "trucks",
  "fleet size": "trucks", "# trucks": "trucks",
  "contract value": "contractValue", contract: "contractValue", mrr: "contractValue",
  "est annual revenue": "estAnnualRevenue", "estimated annual revenue": "estAnnualRevenue",
  "annual revenue": "estAnnualRevenue", est_annual_revenue: "estAnnualRevenue",
  "est. annual revenue": "estAnnualRevenue",
  "years in business": "yearsInBusiness", "years operating": "yearsInBusiness",
  years_in_business: "yearsInBusiness", "time in business": "yearsInBusiness",
  "services offered": "servicesOffered", services: "servicesOffered",
  services_offered: "servicesOffered", "service types": "servicesOffered",
  "service area miles": "serviceAreaMiles", "service area (miles)": "serviceAreaMiles",
  "service radius": "serviceAreaMiles", service_area_miles: "serviceAreaMiles",
  "service area": "serviceAreaMiles",
  "motor club affiliations": "motorClubAffiliations", "motor clubs": "motorClubAffiliations",
  "motor club": "motorClubAffiliations", motor_club_affiliations: "motorClubAffiliations",
  "dispatcher software": "dispatcherSoftware", "dispatching software": "dispatcherSoftware",
  dispatcher_software: "dispatcherSoftware", "dispatch system": "dispatcherSoftware",
  "pain points": "painPoints", "pain points notes": "painPoints",
  challenges: "painPoints", pain_points: "painPoints",
  "lead score": "leadScore", score: "leadScore", leadscore: "leadScore", lead_score: "leadScore",
  "lead stage": "lifecycleStage", "lifecycle stage": "lifecycleStage",
  lifecyclestage: "lifecycleStage", lifecycle_stage: "lifecycleStage",
  stage: "lifecycleStage", status: "lifecycleStage", "lead status": "lifecycleStage",
  source: "source", "lead source": "source",
  campaign: "campaign", "campaign name": "campaign",
  tags: "tags", tag: "tags", labels: "tags", categories: "tags",
  notes: "notes", note: "notes", bio: "notes", about: "notes", comments: "notes",
  description: "description", "company description": "description", summary: "description",
  "date added": "createdAt", "created at": "createdAt", "created date": "createdAt",
  "date created": "createdAt", createdat: "createdAt", created_at: "createdAt",
  "added date": "createdAt", "date joined": "createdAt",
  facebook: "socialMedia", "facebook url": "socialMedia", "facebook link": "socialMedia",
  instagram: "socialMedia", "instagram url": "socialMedia",
  linkedin: "socialMedia", "linkedin url": "socialMedia", "linked in": "socialMedia",
  yelp: "socialMedia", "yelp url": "socialMedia", "yelp page": "socialMedia",
  "google business url": "socialMedia", "google business": "socialMedia",
  "google maps": "socialMedia", gmb: "socialMedia",
  tiktok: "socialMedia", "tiktok url": "socialMedia",
  twitter: "socialMedia", "twitter url": "socialMedia",
  x: "socialMedia", "twitter / x": "socialMedia", "twitter/x": "socialMedia",
  youtube: "socialMedia", "youtube url": "socialMedia",
  pinterest: "socialMedia", "pinterest url": "socialMedia",
  "social media": "socialMedia", social: "socialMedia", "social url": "socialMedia",
  "social link": "socialMedia", "social media url": "socialMedia",
};

const _AUTO_MAP_KEYS = Object.keys(AUTO_MAP).sort((a, b) => b.length - a.length);

function detectMapping(headers) {
  return headers.map(h => {
    const norm = h.toLowerCase().trim();

    // Pass 1 — exact match
    if (AUTO_MAP[norm]) return AUTO_MAP[norm];

    // Pass 2 — strip noise then exact-match:
    //   "Lead Score (1-10)"             → "lead score"
    //   "Dispatcher Software (Current)" → "dispatcher software"
    //   "Pain Points / Notes"           → "pain points"
    //   "Status: Active/Inactive"       → "status"
    const clean = norm
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s*[\/|:].*/,  '')
      .trim();
    if (clean && clean !== norm && AUTO_MAP[clean]) return AUTO_MAP[clean];

    // Pass 3 — word-boundary prefix scan on cleaned string (longest key wins)
    const target = clean || norm;
    for (const key of _AUTO_MAP_KEYS) {
      const re = new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'i');
      if (re.test(target)) return AUTO_MAP[key];
    }

    return "__skip__";
  });
}

const FIELD_GROUPS = ["Identity", "Contact", "Company", "Business", "Other", "Social", ""];
const groupedFields = FIELD_GROUPS.map(g => ({
  group: g,
  fields: CONTACT_FIELDS.filter(f => f.group === g),
})).filter(g => g.fields.length > 0);

function Steps({ current }) {
  const T = useTheme();
  const steps = ["Upload", "Map", "Preview", "Import"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: done ? T.green : active ? T.accent : T.surface,
                border: `1.5px solid ${done ? T.green : active ? T.accent : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: done || active ? "#fff" : T.muted,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? T.text : done ? T.dim : T.muted }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? T.green + "60" : T.border, margin: "0 8px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepUpload({ onParsed }) {
  const T = useTheme();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function parseFile(file) {
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: ({ data, meta }) => {
          if (!meta.fields?.length) { setError("Could not detect headers in this CSV."); return; }
          onParsed({ headers: meta.fields, rows: data, fileName: file.name });
        },
        error: e => setError(e.message),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const headers = Object.keys(data[0] || {});
          if (!headers.length) { setError("Could not detect headers in this file."); return; }
          onParsed({ headers, rows: data, fileName: file.name });
        } catch (err) {
          setError("Failed to parse Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Only .csv, .xlsx, and .xls files are supported.");
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? T.accent : T.border}`,
          borderRadius: 10, padding: "48px 24px", textAlign: "center",
          cursor: "pointer", background: dragging ? T.accent + "06" : T.bg,
        }}
      >
        <Upload size={28} color={dragging ? T.accent : T.muted} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
          Drop your file here, or click to browse
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>Supports .csv, .xlsx, .xls</div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />
      </div>
      {error && (
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 7,
          background: T.red + "15", border: `1px solid ${T.red}30`, color: T.red, fontSize: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: T.surface, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          Expected columns (any order)
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            "Company Name","Owner/Contact Name","Title","Email Address","Phone Number",
            "Address","City","State","ZIP","Website",
            "Facebook URL","Instagram URL","LinkedIn URL","Yelp URL","Google Business URL",
            "Company Size Trucks","Est Annual Revenue","Years in Business",
            "Services Offered","Service Area Miles","Motor Club Affiliations",
            "Dispatcher Software","Pain Points Notes","Lead Score","Status","Date Added",
          ].map(f => (
            <span key={f} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: T.card, border: `1px solid ${T.border}`, color: T.dim }}>{f}</span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>
          Columns are auto-mapped from header names. Social URLs are detected from the URL value itself. Each row must have an Email.
        </div>
      </div>
    </div>
  );
}

function StepMap({ headers, mapping, setMapping }) {
  const T = useTheme();
  const autoCount = mapping.filter(m => m && m !== "__skip__").length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Column mapping
        </div>
        <div style={{ fontSize: 11, color: T.green }}>{autoCount} of {headers.length} auto-detected</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {headers.map((h, i) => {
          const mapped = mapping[i] && mapping[i] !== "__skip__";
          return (
            <div key={h} style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", alignItems: "center", gap: 10 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 12px", borderRadius: 6,
                background: T.bg, border: `1px solid ${mapped ? T.green + "40" : T.border}`,
                fontSize: 12, color: T.dim, fontFamily: "monospace", overflow: "hidden",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: mapped ? T.green : T.border }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</span>
              </div>
              <ChevronRight size={14} color={T.muted} />
              <select
                value={mapping[i] || "__skip__"}
                onChange={e => { const next = [...mapping]; next[i] = e.target.value; setMapping(next); }}
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: mapping[i] === "__skip__" ? T.muted : T.text, fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
              >
                {groupedFields.map(({ group, fields }) =>
                  group ? (
                    <optgroup key={group} label={group}>
                      {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </optgroup>
                  ) : (
                    fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)
                  )
                )}
              </select>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: T.muted }}>
        Green dot = auto-mapped. Fix any wrong mappings before continuing. Social URLs are detected from the URL value — column name does not matter.
      </div>
    </div>
  );
}

function StepPreview({ headers, rows, mapping, duplicateAction, setDuplicateAction, cityOverride, setCityOverride }) {
  const T = useTheme();
  const mapped = headers.map((h, i) => ({ header: h, field: mapping[i] })).filter(m => m.field !== "__skip__");
  const preview = rows.slice(0, 8);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Preview — first {preview.length} of {rows.length} rows
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Duplicates:</span>
          {["ignore", "update"].map(opt => (
            <button key={opt} onClick={() => setDuplicateAction(opt)} style={{
              padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
              background: duplicateAction === opt ? T.accent + "20" : "transparent",
              border: `1px solid ${duplicateAction === opt ? T.accent : T.border}`,
              color: duplicateAction === opt ? T.accent : T.muted,
            }}>{opt}</button>
          ))}
        </div>
      </div>

      {/* City override — applies to all imported leads */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
        padding: "10px 14px", borderRadius: 8,
        background: T.surface, border: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 11, color: T.dim, flexShrink: 0 }}>Apply city to all leads:</div>
        <input
          type="text"
          value={cityOverride}
          onChange={e => setCityOverride(e.target.value)}
          placeholder="e.g. Dallas, TX  (optional)"
          style={{
            flex: 1, background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: "6px 10px",
            color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        {cityOverride && (
          <button onClick={() => setCityOverride("")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${T.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: T.surface }}>
              {mapped.map(m => {
                const fd = CONTACT_FIELDS.find(f => f.key === m.field);
                return (
                  <th key={m.header} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600, borderBottom: `1px solid ${T.border}`, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {fd?.label || m.field}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: `1px solid ${T.border}` }}>
                {mapped.map(m => (
                  <td key={m.header} style={{ padding: "7px 12px", color: T.dim, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(row[m.header] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && <div style={{ marginTop: 8, fontSize: 11, color: T.muted, textAlign: "center" }}>+ {rows.length - 8} more rows</div>}
    </div>
  );
}

function StepImporting({ progress, total }) {
  const T = useTheme();
  const done = progress >= 100;
  const barColor = done ? T.green : T.accent;
  return (
    <div style={{ textAlign: "center", padding: "36px 8px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 28 }}>
        Importing {total.toLocaleString()} contacts…
      </div>
      <div style={{ height: 10, borderRadius: 5, background: T.border, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ height: "100%", borderRadius: 5, width: `${progress}%`, background: barColor, transition: "width 0.35s ease, background 0.35s" }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: barColor, marginBottom: 8, transition: "color 0.35s" }}>
        {progress}%
      </div>
      <div style={{ fontSize: 12, color: T.muted }}>
        {done ? "Finishing up…" : "Please wait while your contacts are being imported."}
      </div>
    </div>
  );
}

function StepSummary({ result, onBack, onStartOver }) {
  const T = useTheme();
  const { total, imported, updated, skipped, errors } = result;
  const success = imported + updated;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: success > 0 ? T.green + "18" : T.amber + "18",
        border: `2px solid ${success > 0 ? T.green : T.amber}40`,
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        <CheckCircle size={24} color={success > 0 ? T.green : T.amber} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Import Complete</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 24 }}>
        {success > 0 ? `${success} contact${success !== 1 ? "s" : ""} processed successfully.` : "No contacts were imported."}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "TOTAL", value: total, color: T.text },
          { label: "IMPORTED", value: imported, color: T.green },
          { label: "UPDATED", value: updated, color: T.blue },
          { label: "SKIPPED", value: skipped, color: T.amber },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 10px", borderRadius: 8, background: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: "0.07em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      {errors?.length > 0 && (
        <div style={{ textAlign: "left", maxHeight: 140, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, letterSpacing: "0.06em" }}>{errors.length} ROW{errors.length !== 1 ? "S" : ""} SKIPPED</span>
          </div>
          {errors.slice(0, 20).map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 11 }}>
              <span style={{ color: T.muted, flexShrink: 0 }}>Row {e.row}</span>
              <span style={{ color: T.dim }}>{e.reason}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onStartOver} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 7, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <RefreshCw size={13} /> Import Another
        </button>
        <button onClick={onBack} style={{ padding: "9px 22px", borderRadius: 7, background: T.accent, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function ImportInline({ onBack, clientId, pool, onImported }) {
  const T = useTheme();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState([]);
  const [duplicateAction, setDuplicateAction] = useState("ignore");
  const [cityOverride, setCityOverride] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [importError, setImportError] = useState("");

  function handleParsed({ headers: h, rows, fileName: fn }) {
    setHeaders(h); setRawRows(rows); setMapping(detectMapping(h)); setFileName(fn); setStep(1);
  }

  const firstValue = (raw, sep = /[,|]/) =>
    String(raw ?? "").split(sep).map(v => v.trim()).find(Boolean) ?? "";

  const mapRows = useCallback(() => {
    const INT_FIELDS = new Set(["trucks", "leadScore", "serviceAreaMiles", "yearsInBusiness"]);
    return rawRows.map(row => {
      const contact = {};
      const socialLinks = {};

      headers.forEach((h, i) => {
        const field = mapping[i];
        if (!field || field === "__skip__") return;
        const raw = row[h] ?? "";

        if (field === "fullName") {
          const full = String(raw).trim();
          const space = full.indexOf(" ");
          if (space !== -1) {
            contact.firstName = contact.firstName || full.slice(0, space).trim();
            contact.lastName  = contact.lastName  || full.slice(space + 1).trim();
          } else {
            contact.firstName = contact.firstName || full;
          }
        } else if (field === "email") {
          contact.email = firstValue(raw, /[,|]/);
        } else if (field === "phone") {
          contact.phone = firstValue(raw, /[,|;]/);
        } else if (field === "socialMedia") {
          const v = String(raw).trim();
          if (v) {
            const platform = detectSocialPlatform(v);
            if (platform && !socialLinks[platform]) socialLinks[platform] = v;
          }
        } else if (field === "lifecycleStage") {
          const v = String(raw).trim();
          contact.lifecycleStage = normalizeStage(v) || v || "";
        } else if (field === "tags") {
          const v = String(raw).trim();
          contact.tags = v ? v.split(/[,;|]/).map(t => t.trim()).filter(Boolean) : [];
        } else if (field === "createdAt") {
          const v = String(raw).trim();
          if (v) { const d = new Date(v); if (!isNaN(d)) contact.createdAt = d.toISOString(); }
        } else if (INT_FIELDS.has(field)) {
          contact[field] = parseInt(raw) || 0;
        } else {
          contact[field] = String(raw);
        }
      });

      // URL scan — detect social links from EVERY cell regardless of mapping
      for (const h of headers) {
        const v = String(row[h] ?? "").trim();
        if (!v) continue;
        const platform = detectSocialPlatform(v);
        if (platform && !socialLinks[platform]) socialLinks[platform] = v;
      }

      contact.socialLinks = socialLinks;
      return contact;
    });
  }, [rawRows, headers, mapping]);

  async function handleImport() {
    setImporting(true);
    setImportError("");
    setProgress(0);
    try {
      const allMapped = mapRows();

      // Apply city override to all rows if set
      const city = cityOverride.trim();
      if (city) allMapped.forEach(r => { r.city = city; });

      const withEmail    = allMapped.filter(r => r.email?.trim());
      const noEmailCount = allMapped.length - withEmail.length;

      const CHUNK = 500;
      const chunks = [];
      for (let i = 0; i < withEmail.length; i += CHUNK) chunks.push(withEmail.slice(i, i + CHUNK));

      const combined = {
        total:    rawRows.length,
        imported: 0,
        updated:  0,
        skipped:  noEmailCount,
        errors:   [],
      };

      if (chunks.length === 0) {
        setProgress(100);
      } else {
        for (let ci = 0; ci < chunks.length; ci++) {
          const res = await db.importContacts({ rows: chunks[ci], clientId, pool, duplicateAction });
          combined.imported += res.imported || 0;
          combined.updated  += res.updated  || 0;
          combined.skipped  += res.skipped  || 0;
          if (res.errors?.length) combined.errors.push(...res.errors);
          setProgress(Math.round(((ci + 1) / chunks.length) * 100));
        }
      }

      setResult(combined);
      setStep(3);
      onImported?.();
    } catch (err) {
      setImportError(err.message || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep(0); setFileName(""); setHeaders([]); setRawRows([]);
    setMapping([]); setCityOverride(""); setResult(null); setImportError("");
  }

  const canAdvance = step === 1 ? mapping.some(m => m !== "__skip__") : true;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "14px 20px",
        background: T.card, border: "1px solid " + T.border, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Import Contacts</div>
          {fileName && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{fileName}</div>}
        </div>
        <Btn variant="ghost" onClick={onBack}>← Back</Btn>
      </div>

      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        {step < 3 && <Steps current={step} />}

        {step === 0 && <StepUpload onParsed={handleParsed} />}
        {step === 1 && <StepMap headers={headers} mapping={mapping} setMapping={setMapping} />}
        {step === 2 && importing && <StepImporting progress={progress} total={rawRows.length} />}
        {step === 2 && !importing && (
          <StepPreview
            headers={headers} rows={rawRows} mapping={mapping}
            duplicateAction={duplicateAction} setDuplicateAction={setDuplicateAction}
            cityOverride={cityOverride} setCityOverride={setCityOverride}
          />
        )}
        {step === 3 && <StepSummary result={result} onBack={onBack} onStartOver={reset} />}

        {importError && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 7, background: T.red + "15", border: `1px solid ${T.red}30`, color: T.red, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} /> {importError}
          </div>
        )}

        {step < 3 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid " + T.border }}>
            <div style={{ fontSize: 11, color: T.muted }}>
              {step === 2 && !importing && `${rawRows.length} row${rawRows.length !== 1 ? "s" : ""} ready`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && step < 3 && (
                <button onClick={() => setStep(s => s - 1)} disabled={importing}
                  style={{ padding: "9px 18px", borderRadius: 7, background: "none", border: `1px solid ${T.border}`, color: T.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Back
                </button>
              )}
              {step < 2 && (
                <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 7, background: canAdvance ? T.accent : T.surface, border: "none", color: canAdvance ? "#fff" : T.muted, fontSize: 12, fontWeight: 700, cursor: canAdvance ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  Next <ChevronRight size={14} />
                </button>
              )}
              {step === 2 && (
                <button onClick={handleImport} disabled={importing}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 7, background: importing ? T.accent + "80" : T.accent, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: importing ? "wait" : "pointer", fontFamily: "inherit" }}>
                  {importing ? <><Spinner size={14} color="#fff" /> Importing…</> : "Import Contacts"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
