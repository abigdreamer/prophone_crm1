import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as contactRepo from '../repositories/contactRepository.js';

const VALID_STAGES = ['new','contacted','engaged','proposal_sent','negotiating','customer','not_qualified','lost'];

function toContact(row) {
  if (!row) return null;
  const activities = (row.activities || [])
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .map(a => ({ id: a.id, type: a.type, note: a.note || '', ts: a.ts, by: a.by || '' }));

  return {
    id:             row.id,
    prophone_id:    row.prophone_id,
    firstName:      row.first_name,
    lastName:       row.last_name,
    email:          row.email ?? '',
    phone:          row.phone,
    company:        row.company,
    title:          row.title,
    website:        row.website,
    city:           row.city,
    lifecycleStage: row.lifecycle_stage,
    status:         row.status,
    source:         row.source,
    tags:           row.tags,
    notes:          row.notes,
    ownedBy:        row.owned_by,
    addedBy:        row.added_by,
    groupId:        row.group_id,
    groupName:      row.group?.name || null,
    lastActivityAt: row.last_activity_at,
    createdAt:      row.created_at,
    activities,
  };
}

export async function listContacts(req, res) {
  try {
    const rows = await contactRepo.findMany(tenantWhere(req));
    sendSuccess(res, rows.map(toContact));
  } catch (err) {
    sendServerError(res, err, 'listContacts');
  }
}

export async function getContact(req, res) {
  try {
    const row = await contactRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Contact not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);
    sendSuccess(res, toContact(row));
  } catch (err) {
    sendServerError(res, err, 'getContact');
  }
}

export async function createContact(req, res) {
  const { activities: initialActs = [], ...contact } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid) return sendError(res, 'prophone_id is required to create a contact', 400);
  if (!contact.groupId) return sendError(res, 'group_id is required', 400);

  const stage = VALID_STAGES.includes(contact.lifecycleStage) ? contact.lifecycleStage : 'new';

  try {
    const row = await contactRepo.createContact({
      prophone_id:      tid,
      first_name:       contact.firstName        || '',
      last_name:        contact.lastName         || '',
      email:            contact.email            || null,
      phone:            contact.phone            || '',
      company:          contact.company          || '',
      title:            contact.title            || '',
      website:          contact.website          || '',
      city:             contact.city             || '',
      lifecycle_stage:  stage,
      status:           contact.status           || 'active',
      source:           contact.source           || '',
      tags:             contact.tags             || [],
      notes:            contact.notes            || '',
      owned_by:         contact.ownedBy          || '',
      added_by:         contact.addedBy          || '',
      group_id:         contact.groupId          || null,
      last_activity_at: new Date(),
    }, initialActs);

    sendSuccess(res, toContact(row), 201);
  } catch (err) {
    sendServerError(res, err, 'createContact');
  }
}

export async function updateContact(req, res) {
  const contact = req.body ?? {};
  try {
    const existing = await contactRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Contact not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);

    const stage = VALID_STAGES.includes(contact.lifecycleStage) ? contact.lifecycleStage : undefined;
    const lastActivityAt = contact.lastActivityAt ? new Date(contact.lastActivityAt) : new Date();

    const row = await contactRepo.updateContact(req.params.id, {
      first_name:       contact.firstName        !== undefined ? contact.firstName       || '' : undefined,
      last_name:        contact.lastName         !== undefined ? contact.lastName        || '' : undefined,
      email:            contact.email            !== undefined ? (contact.email || null)        : undefined,
      phone:            contact.phone            !== undefined ? contact.phone           || '' : undefined,
      company:          contact.company          !== undefined ? contact.company         || '' : undefined,
      title:            contact.title            !== undefined ? contact.title           || '' : undefined,
      website:          contact.website          !== undefined ? contact.website         || '' : undefined,
      city:             contact.city             !== undefined ? contact.city            || '' : undefined,
      lifecycle_stage:  stage,
      status:           contact.status           !== undefined ? contact.status          || 'active' : undefined,
      source:           contact.source           !== undefined ? contact.source          || '' : undefined,
      tags:             contact.tags             !== undefined ? contact.tags               : undefined,
      notes:            contact.notes            !== undefined ? contact.notes           || '' : undefined,
      owned_by:         contact.ownedBy          !== undefined ? contact.ownedBy         || '' : undefined,
      group_id:         contact.groupId          !== undefined ? (contact.groupId || null)      : undefined,
      last_activity_at: lastActivityAt,
    });

    sendSuccess(res, toContact(row));
  } catch (err) {
    sendServerError(res, err, 'updateContact');
  }
}

export async function deleteContact(req, res) {
  try {
    const existing = await contactRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Contact not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);
    await contactRepo.deleteContact(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteContact');
  }
}

export async function addActivity(req, res) {
  const { type, note, by, ts } = req.body ?? {};
  if (!type) return sendError(res, 'Activity type is required', 400);

  try {
    const tenant = await contactRepo.findTenantById(req.params.id);
    if (!tenant) return sendError(res, 'Contact not found', 404);
    if (!canAccessTenant(req, tenant.prophone_id)) return sendError(res, 'Forbidden', 403);
    await contactRepo.addActivity(req.params.id, { type, note, by, ts });
    sendSuccess(res, { ok: true }, 201);
  } catch (err) {
    sendServerError(res, err, 'addActivity');
  }
}

export async function importContacts(req, res) {
  const { contacts, groupId } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid)     return sendError(res, 'prophone_id is required', 400);
  if (!groupId) return sendError(res, 'group_id is required', 400);
  if (!Array.isArray(contacts) || contacts.length === 0)
    return sendError(res, 'contacts array is required and must not be empty', 400);

  const VALID_STAGES = ['new','contacted','engaged','proposal_sent','negotiating','customer','not_qualified','lost'];
  const CHUNK = 500;
  let imported = 0;
  let skipped  = 0;

  try {
    for (let i = 0; i < contacts.length; i += CHUNK) {
      const chunk = contacts.slice(i, i + CHUNK).map(c => ({
        prophone_id:      tid,
        first_name:       String(c.firstName || c.first_name || '').trim(),
        last_name:        String(c.lastName  || c.last_name  || '').trim(),
        email:            c.email ? String(c.email).trim() || null : null,
        phone:            String(c.phone   || '').trim(),
        company:          String(c.company || '').trim(),
        title:            String(c.title   || '').trim(),
        website:          String(c.website || '').trim(),
        city:             String(c.city    || '').trim(),
        lifecycle_stage:  VALID_STAGES.includes(c.lifecycleStage) ? c.lifecycleStage : 'new',
        status:           'active',
        source:           String(c.source  || 'import').trim(),
        tags:             [],
        notes:            String(c.notes   || '').trim(),
        owned_by:         '',
        added_by:         req.user?.name || '',
        group_id:         groupId,
        last_activity_at: new Date(),
      }));

      const result = await contactRepo.bulkCreate(chunk);
      imported += result.count;
      skipped  += chunk.length - result.count;
    }

    sendSuccess(res, { imported, skipped, total: contacts.length });
  } catch (err) {
    sendServerError(res, err, 'importContacts');
  }
}
