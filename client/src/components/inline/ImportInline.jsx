import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, ChevronRight, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Btn from "../ui/Btn";
import { Spinner } from "../ui/Loader";
import * as db from "../../services/api";

const CONTACT_FIELDS = [
  { key: "fullName",       label: "Full Name (auto-split)", required: false },
  { key: "firstName",      label: "First Name",            required: true  },
  { key: "lastName",       label: "Last Name",             required: false },
  { key: "email",          label: "Email",                 required: true  },
  { key: "phone",          label: "Phone",                 required: false },
  { key: "company",        label: "Company",               required: false },
  { key: "title",          label: "Job Title",             required: false },
  { key: "website",        label: "Website",               required: false },
  { key: "address",        label: "Address",               required: false },
  { key: "description",    label: "Description",           required: false },
  { key: "trucks",         label: "# of Trucks",           required: false },
  { key: "contractValue",  label: "Contract Value ($)",    required: false },
  { key: "source",         label: "Source",                required: false },
  { key: "notes",          label: "Notes",                 required: false },
  { key: "facebook",       label: "Facebook",              required: false },
  { key: "instagram",      label: "Instagram",             required: false },
  { key: "linkedin",       label: "LinkedIn",              required: false },
  { key: "twitter",        label: "Twitter / X",           required: false },
  { key: "youtube",        label: "YouTube",               required: false },
  { key: "yelp",           label: "Yelp",                  required: false },
  { key: "pinterest",      label: "Pinterest",             required: false },
  { key: "tiktok",         label: "TikTok",                required: false },
  { key: "__skip__",       label: "— Skip column —",       required: false },
];

const SOCIAL_KEYS = new Set(["facebook","instagram","linkedin","twitter","youtube","yelp","pinterest","tiktok"]);

const AUTO_MAP = {
  "full name": "fullName", fullname: "fullName", full_name: "fullName",
  "contact name": "fullName", name: "fullName",
  firstname: "firstName", first_name: "firstName", "first name": "firstName",
  lastname: "lastName", last_name: "lastName", "last name": "lastName",
  email: "email", "e-mail": "email", "email address": "email",
  phone: "phone", mobile: "phone", cell: "phone", "phone number": "phone",
  company: "company", organization: "company", "company name": "company",
  title: "title", "job title": "title", position: "title", role: "title",
  website: "website", url: "website", "website url": "website", web: "website",
  domain: "website", "web domain": "website", "company domain": "website", site: "website",
  address: "address", "street address": "address", street: "address", location: "address",
  description: "description", bio: "description", about: "description",
  trucks: "trucks", "# of trucks": "trucks", "num trucks": "trucks",
  "contract value": "contractValue", contract: "contractValue", value: "contractValue", mrr: "contractValue",
  source: "source", notes: "notes", comments: "notes",
  facebook: "facebook", "facebook url": "facebook",
  instagram: "instagram", "instagram url": "instagram",
  linkedin: "linkedin", "linkedin url": "linkedin", "linked in": "linkedin",
  twitter: "twitter", x: "twitter", "twitter / x": "twitter", "twitter/x": "twitter",
  youtube: "youtube", "youtube url": "youtube",
  yelp: "yelp", "yelp url": "yelp",
  pinterest: "pinterest", "pinterest url": "pinterest",
  tiktok: "tiktok", "tiktok url": "tiktok",
};

function detectMapping(headers) {
  return headers.map(h => AUTO_MAP[h.toLowerCase().trim()] || "__skip__");
}

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
          {["First Name *","Last Name","Email","Phone","Company","Job Title","Website","Address","Description","# of Trucks","Contract Value","Facebook","Instagram","LinkedIn","Twitter","YouTube","Yelp","TikTok"].map(f => (
            <span key={f} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: T.card, border: `1px solid ${T.border}`, color: T.dim }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepMap({ headers, mapping, setMapping }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Map your columns to contact fields
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {headers.map((h, i) => (
          <div key={h} style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "8px 12px", borderRadius: 6, background: T.bg, border: `1px solid ${T.border}`, fontSize: 12, color: T.dim, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {h}
            </div>
            <ChevronRight size={14} color={T.muted} />
            <select
              value={mapping[i] || "__skip__"}
              onChange={e => { const next = [...mapping]; next[i] = e.target.value; setMapping(next); }}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: mapping[i] === "__skip__" ? T.muted : T.text, fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer" }}
            >
              {CONTACT_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: T.muted }}>
        Columns mapped to "— Skip column —" will not be imported.
      </div>
    </div>
  );
}

function StepPreview({ headers, rows, mapping, duplicateAction, setDuplicateAction }) {
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
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [importError, setImportError] = useState("");

  function handleParsed({ headers: h, rows, fileName: fn }) {
    setHeaders(h); setRawRows(rows); setMapping(detectMapping(h)); setFileName(fn); setStep(1);
  }

  const mapRows = useCallback(() => {
    return rawRows.map(row => {
      const contact = {};
      const socialLinks = {};
      headers.forEach((h, i) => {
        const field = mapping[i];
        if (!field || field === "__skip__") return;
        if (field === "fullName") {
          const full = (row[h] ?? "").trim();
          const space = full.indexOf(" ");
          if (space !== -1) {
            contact.firstName = contact.firstName || full.slice(0, space).trim();
            contact.lastName = contact.lastName || full.slice(space + 1).trim();
          } else {
            contact.firstName = contact.firstName || full;
          }
        } else if (SOCIAL_KEYS.has(field)) {
          const v = (row[h] ?? "").trim();
          if (v) socialLinks[field] = v;
        } else {
          contact[field] = row[h] ?? "";
        }
      });
      contact.socialLinks = socialLinks;
      return contact;
    });
  }, [rawRows, headers, mapping]);

  async function handleImport() {
    setImporting(true); setImportError("");
    try {
      const rows = mapRows();
      const res = await db.importContacts({ rows, clientId, pool, duplicateAction });
      setResult(res);
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
    setMapping([]); setResult(null); setImportError("");
  }

  const canAdvance = step === 1 ? mapping.some(m => m !== "__skip__") : true;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 32 }}>
      {/* Header */}
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

      {/* Body */}
      <div style={{ background: T.card, border: "1px solid " + T.border, borderRadius: 10, padding: "20px 22px" }}>
        {step < 3 && <Steps current={step} />}

        {step === 0 && <StepUpload onParsed={handleParsed} />}
        {step === 1 && <StepMap headers={headers} mapping={mapping} setMapping={setMapping} />}
        {step === 2 && (
          <StepPreview headers={headers} rows={rawRows} mapping={mapping}
            duplicateAction={duplicateAction} setDuplicateAction={setDuplicateAction} />
        )}
        {step === 3 && <StepSummary result={result} onBack={onBack} onStartOver={reset} />}

        {importError && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 7, background: T.red + "15", border: `1px solid ${T.red}30`, color: T.red, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} /> {importError}
          </div>
        )}

        {/* Footer nav */}
        {step < 3 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid " + T.border }}>
            <div style={{ fontSize: 11, color: T.muted }}>
              {step === 2 && `${rawRows.length} row${rawRows.length !== 1 ? "s" : ""} ready`}
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
