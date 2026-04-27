import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import Btn from "../ui/Btn";
import T from "../../theme";
import { importContacts } from "../../api/contacts.api";
import { Spinner } from "../ui/Loader";

// ─── Column name normalizer ───────────────────────────────────────────────────
const COL_MAP = {
  firstname: "firstName", first_name: "firstName", "first name": "firstName", fname: "firstName",
  lastname:  "lastName",  last_name:  "lastName",  "last name":  "lastName",  lname: "lastName",
  name: "_fullName",
  email: "email", "email address": "email", "e-mail": "email",
  phone: "phone", "phone number": "phone", mobile: "phone", tel: "phone",
  company: "company", organization: "company", org: "company", "company name": "company",
  title: "title", "job title": "title", position: "title", role: "title",
  city: "city", location: "city",
  website: "website", url: "website", web: "website",
  source: "source",
  notes: "notes", note: "notes", comments: "notes",
};

function normalizeKey(raw) {
  return COL_MAP[raw.toLowerCase().trim()] || null;
}

function rowToContact(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = normalizeKey(k);
    if (mapped) out[mapped] = String(v ?? "").trim();
  }
  if (out._fullName && !out.firstName) {
    const parts = out._fullName.split(" ");
    out.firstName = parts[0] || "";
    out.lastName  = parts.slice(1).join(" ") || "";
    delete out._fullName;
  }
  return out;
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: r => resolve(r.data),
      error:    e => reject(e),
    });
  });
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = T.accent }) {
  return (
    <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        background: color,
        width: pct + "%",
        transition: "width 0.3s ease",
      }} />
    </div>
  );
}

// ─── Stage label ─────────────────────────────────────────────────────────────
const STAGES = [
  { id: "reading",    label: "Reading file",    pct: 15 },
  { id: "parsing",    label: "Parsing data",    pct: 35 },
  { id: "validating", label: "Validating data", pct: 55 },
  { id: "group",      label: "Select group",    pct: 60 },
  { id: "importing",  label: "Importing",       pct: 60 },
  { id: "done",       label: "Complete",        pct: 100 },
];

// ─── Main ImportModal ─────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onDone, groups = [] }) {
  const fileRef = useRef(null);

  // phase: idle | processing | group | importing | done | error
  const [phase,    setPhase]    = useState("idle");
  const [stageId,  setStageId]  = useState(null);
  const [pct,      setPct]      = useState(0);
  const [parsed,   setParsed]   = useState([]);  // normalized contact objects
  const [stats,    setStats]    = useState(null); // { total, valid, invalid }
  const [groupId,  setGroupId]  = useState("");
  const [result,   setResult]   = useState(null); // { imported, skipped }
  const [error,    setError]    = useState(null);
  const [fileName, setFileName] = useState("");

  function progress(sid, p) {
    setStageId(sid);
    setPct(p);
  }

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setPhase("processing");

    try {
      progress("reading", 10);
      await tick();

      let rawRows;
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "csv") {
        progress("reading", 20);
        rawRows = await parseCSV(file);
      } else if (["xls", "xlsx"].includes(ext)) {
        progress("reading", 20);
        rawRows = await parseExcel(file);
      } else {
        throw new Error("Unsupported file type. Please use CSV, XLS or XLSX.");
      }

      progress("parsing", 35);
      await tick();

      const contacts = rawRows.map(rowToContact);

      progress("validating", 55);
      await tick();

      const valid   = contacts.filter(c => c.firstName || c.email);
      const invalid = contacts.length - valid.length;

      progress("group", 60);
      setParsed(valid);
      setStats({ total: rawRows.length, valid: valid.length, invalid });
      setPhase("group");
    } catch (err) {
      setError(err.message || "Failed to parse file.");
      setPhase("error");
    }
  }

  async function handleImport() {
    if (!groupId) return;
    setPhase("importing");

    const CHUNK = 200;
    const total = parsed.length;
    let done = 0;

    try {
      for (let i = 0; i < parsed.length; i += CHUNK) {
        const batch  = parsed.slice(i, i + CHUNK);
        await importContacts(batch, groupId);
        done += batch.length;
        const p = 60 + Math.round((done / total) * 38);
        progress("importing", Math.min(p, 98));
      }

      progress("done", 100);
      setPhase("done");
      setResult({ imported: done });
    } catch (err) {
      setError(err.message || "Import failed. Please try again.");
      setPhase("error");
    }
  }

  function tick() {
    return new Promise(r => setTimeout(r, 80));
  }

  const currentStage = STAGES.find(s => s.id === stageId);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={phase === "idle" || phase === "done" || phase === "error" ? onClose : undefined}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid " + T.border,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Import Contacts</div>
          {(phase === "idle" || phase === "done" || phase === "error") && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        <div style={{ padding: 24 }}>

          {/* ── IDLE: file drop zone ─────────────────────────────────────── */}
          {phase === "idle" && (
            <>
              <input
                ref={fileRef} type="file"
                accept=".csv,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed " + T.border, borderRadius: 12,
                  padding: "48px 24px", textAlign: "center",
                  cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accent + "06"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "transparent"; }}
              >
                <Upload size={32} color={T.muted} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                  Click to select a file
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  Supports CSV, XLS, XLSX — up to 10,000+ records
                </div>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: T.panel, borderRadius: 8, fontSize: 12, color: T.muted }}>
                <strong style={{ color: T.sub }}>Expected columns (any order):</strong>{" "}
                First Name, Last Name, Email, Phone, Company, Title, City, Source, Notes
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              </div>
            </>
          )}

          {/* ── PROCESSING ───────────────────────────────────────────────── */}
          {phase === "processing" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ marginBottom: 20 }}>
                <FileText size={40} color={T.accent} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fileName}</div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <ProgressBar pct={pct} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted, marginBottom: 24 }}>
                <span>{currentStage?.label || "Processing…"}</span>
                <span>{pct}%</span>
              </div>

              {STAGES.filter(s => !["group", "importing", "done"].includes(s.id)).map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: pct >= s.pct ? T.accent : T.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {pct >= s.pct && <CheckCircle size={12} color="#fff" />}
                  </div>
                  <span style={{ color: pct >= s.pct ? T.text : T.muted, fontWeight: pct >= s.pct ? 600 : 400 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── GROUP SELECTION ───────────────────────────────────────────── */}
          {phase === "group" && (
            <>
              <div style={{ marginBottom: 20 }}>
                <ProgressBar pct={60} />
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Total rows",  value: stats.total,   color: T.text },
                  { label: "Valid",       value: stats.valid,   color: "#22c55e" },
                  { label: "Skipped",     value: stats.invalid, color: stats.invalid ? "#f59e0b" : T.muted },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    flex: 1, background: T.panel, borderRadius: 10, padding: "12px 14px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Group selector */}
              <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Assign to group <span style={{ color: "#dc2626" }}>*</span>
              </div>

              {groups.length === 0 ? (
                <div style={{
                  padding: "14px 16px", borderRadius: 8,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 8,
                }}>
                  <AlertCircle size={16} />
                  No groups exist yet. Go to Contact Groups and create a group first.
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <select
                    value={groupId}
                    onChange={e => setGroupId(e.target.value)}
                    style={{
                      width: "100%", appearance: "none", WebkitAppearance: "none",
                      background: T.surface, border: "1px solid " + (groupId ? T.accent : T.border),
                      borderRadius: 8, padding: "10px 36px 10px 12px",
                      color: groupId ? T.text : T.muted, fontSize: 13,
                      outline: "none", fontFamily: "inherit", cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <option value="">Select a group…</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.contactCount} contacts)</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color={T.muted} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              )}

              {!groupId && groups.length > 0 && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>
                  Group is required — all imported contacts will be assigned to this group.
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn onClick={handleImport} disabled={!groupId || groups.length === 0}>
                  Import {stats.valid.toLocaleString()} Contacts
                </Btn>
              </div>
            </>
          )}

          {/* ── IMPORTING ─────────────────────────────────────────────────── */}
          {phase === "importing" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <Spinner size={32} color={T.accent} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 20 }}>
                Importing contacts…
              </div>
              <div style={{ marginBottom: 8 }}>
                <ProgressBar pct={pct} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted }}>
                <span>Uploading to server</span>
                <span>{pct}%</span>
              </div>
            </div>
          )}

          {/* ── DONE ──────────────────────────────────────────────────────── */}
          {phase === "done" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ marginBottom: 20 }}>
                <ProgressBar pct={100} color="#22c55e" />
              </div>
              <CheckCircle size={48} color="#22c55e" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                Import Complete
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
                Successfully imported <strong style={{ color: T.text }}>{result?.imported?.toLocaleString()}</strong> contacts.
              </div>
              <Btn onClick={() => { onDone?.(result?.imported ?? 0); onClose(); }}>Done</Btn>
            </div>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {phase === "error" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <AlertCircle size={48} color="#dc2626" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>Import Failed</div>
              <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 24, background: "#fef2f2", borderRadius: 8, padding: "10px 14px" }}>
                {error}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <Btn variant="ghost" onClick={onClose}>Close</Btn>
                <Btn onClick={() => { setPhase("idle"); setError(null); }}>Try Again</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
