/**
 * templateStore — email template data layer with dev-only localStorage fallback.
 *
 * Production (import.meta.env.PROD === true):
 *   - All reads/writes go directly to the database.
 *   - On failure, throws / returns empty — no localStorage involved.
 *
 * Development (import.meta.env.DEV === true):
 *   - Tries the database first for every operation.
 *   - If the database is unreachable, falls back to localStorage.
 *   - Every record carries a `_source` field: "db" | "localStorage".
 *   - Call migrateLocalToDb(tenantId) to push unsynced local records
 *     into the database and remove them from localStorage.
 */

import * as emailDb from "../api/emailTemplates.api";

const IS_PROD  = import.meta.env.PROD;
const LOCAL_ID = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function getTenantId() {
  try {
    const u = JSON.parse(localStorage.getItem("prophone_user") || "null");
    return u?.prophone_id || u?.id || "anon";
  } catch { return "anon"; }
}

const LS_KEY = () => `prophone_templates_${getTenantId()}`;

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsRead() {
  try {
    const raw = localStorage.getItem(LS_KEY());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsWrite(records) {
  try { localStorage.setItem(LS_KEY(), JSON.stringify(records)); } catch { /* quota */ }
}

function lsUpsert(record) {
  const all = lsRead();
  const idx = all.findIndex(r => r.id === record.id);
  if (idx !== -1) all[idx] = record;
  else all.unshift(record);
  lsWrite(all);
}

function lsRemove(id) {
  lsWrite(lsRead().filter(r => r.id !== id));
}

function lsFind(id) {
  return lsRead().find(r => r.id === id) ?? null;
}

// ── Source tagging ────────────────────────────────────────────────────────────
// _source is in-memory metadata only. It is NOT written to the database.

function tag(record, source) {
  return { ...record, _source: source };
}

function stripMeta(record) {
  // eslint-disable-next-line no-unused-vars
  const { _source, ...rest } = record ?? {};
  return rest;
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Push all localStorage-sourced templates for this tenant into the database,
 * then remove them from localStorage. Safe to call at any time — a no-op in
 * production or when the database is unreachable.
 *
 * Returns { migrated: number, pending: number }
 */
export async function migrateLocalToDb() {
  if (IS_PROD) return { migrated: 0, pending: 0 };

  const local = lsRead().filter(r => r._source === "localStorage");
  if (local.length === 0) return { migrated: 0, pending: 0 };

  const check = await emailDb.checkSchema().catch(() => ({ ok: false }));
  if (!check.ok) return { migrated: 0, pending: local.length };

  let migrated = 0;
  for (const record of local) {
    try {
      const { _source: _s, id: _id, created_at: _c, updated_at: _u, ...payload } = record;
      await emailDb.createEmailTemplate({ ...payload });
      lsRemove(record.id);
      migrated++;
    } catch {
      // Leave it in localStorage; will retry next call
    }
  }

  return { migrated, pending: local.length - migrated };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * List all templates for a tenant.
 * In dev, merges DB records with any unsynced localStorage records.
 */
export async function getTemplates() {
  try {
    const data = await emailDb.getEmailTemplates();
    const dbRecords = data.map(r => tag(r, "db"));

    if (!IS_PROD) {
      const dbIds    = new Set(dbRecords.map(r => r.id));
      const unsynced = lsRead()
        .filter(r => r._source === "localStorage" && !dbIds.has(r.id));
      return [...unsynced, ...dbRecords];
    }

    return dbRecords;
  } catch {
    if (IS_PROD) {
      console.error("[templateStore] Database unavailable in production — returning empty list.");
      return [];
    }
    console.warn("[templateStore] DB unavailable — reading from localStorage (dev only).");
    return lsRead().map(r => tag(r, "localStorage"));
  }
}

/**
 * Load a single template by ID.
 */
export async function getTemplate(id) {
  try {
    const data = await emailDb.getEmailTemplate(id);
    return tag(data, "db");
  } catch {
    if (IS_PROD) return null;
    const local = lsFind(id);
    return local ? tag(local, "localStorage") : null;
  }
}

/**
 * Create a new template.
 */
export async function createTemplate(payload) {
  try {
    const data = await emailDb.createEmailTemplate(stripMeta(payload));
    return tag(data, "db");
  } catch {
    if (IS_PROD) throw new Error("Database unavailable — cannot save template in production.");

    console.warn("[templateStore] DB unavailable — saving to localStorage (dev only).");
    const now = new Date().toISOString();
    const local = {
      ...stripMeta(payload),
      id:         LOCAL_ID(),
      created_at: now,
      updated_at: now,
      _source:    "localStorage",
    };
    lsUpsert(local);
    return tag(local, "localStorage");
  }
}

/**
 * Update an existing template.
 */
export async function updateTemplate(id, updates) {
  try {
    const data = await emailDb.updateEmailTemplate(id, stripMeta(updates));
    if (!IS_PROD) lsRemove(id);
    return tag(data, "db");
  } catch {
    if (IS_PROD) throw new Error("Database unavailable — cannot update template in production.");

    console.warn("[templateStore] DB unavailable — updating localStorage (dev only).");
    const existing = lsFind(id);
    const now      = new Date().toISOString();
    const updated  = {
      ...(existing ?? { id, created_at: now }),
      ...stripMeta(updates),
      updated_at: now,
      _source:    "localStorage",
    };
    lsUpsert(updated);
    return tag(updated, "localStorage");
  }
}

/**
 * Delete a template.
 */
export async function deleteTemplate(id) {
  try {
    await emailDb.deleteEmailTemplate(id);
    if (!IS_PROD) lsRemove(id);
  } catch {
    if (IS_PROD) throw new Error("Database unavailable — cannot delete template in production.");
    lsRemove(id);
  }
}

/**
 * Duplicate a template.
 */
export async function duplicateTemplate(id) {
  try {
    const copy = await emailDb.duplicateEmailTemplate(id);
    return tag(copy, "db");
  } catch {
    if (IS_PROD) throw new Error("Database unavailable — cannot duplicate template in production.");

    const original = lsFind(id);
    if (!original) throw new Error("Template not found.");
    const now  = new Date().toISOString();
    const copy = {
      ...stripMeta(original),
      id:         LOCAL_ID(),
      name:       `${original.name} (Copy)`,
      status:     "draft",
      created_at: now,
      updated_at: now,
      _source:    "localStorage",
    };
    lsUpsert(copy);
    return tag(copy, "localStorage");
  }
}
