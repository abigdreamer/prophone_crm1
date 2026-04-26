import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as contactRepo from '../repositories/contactRepository.js';

function toContact(row) {
  if (!row) return null;
  return {
    id:             row.id,
    prophone_id:    row.prophone_id,
    pool:           row.pool,
    clientId:       row.client_id,
    firstName:      row.first_name,
    lastName:       row.last_name,
    email:          row.email,
    phone:          row.phone,
    company:        row.company,
    title:          row.title,
    website:        row.website,
    city:           row.city,
    trucks:         row.trucks,
    lifecycleStage: row.lifecycle_stage,
    leadScore:      row.lead_score,
    status:         row.status,
    source:         row.source,
    campaign:       row.campaign,
    emailsSent:     row.emails_sent,
    emailsOpened:   row.emails_opened,
    emailsClicked:  row.emails_clicked,
    callsMade:      row.calls_made,
    callsAnswered:  row.calls_answered,
    lastActivityAt: row.last_activity_at,
    contractValue:  row.contract_value,
    accountSize:    row.account_size,
    tags:           row.tags,
    notes:          row.notes,
    ownedBy:        row.owned_by,
    addedBy:        row.added_by,
    createdAt:      row.created_at,
    activities: (row.activities || [])
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map(a => ({ id: a.id, type: a.type, note: a.note || '', ts: a.ts, by: a.by || '' })),
  };
}

export async function listContacts(req, res) {
  const { pool, clientId } = req.query;
  try {
    const where = { ...tenantWhere(req), pool };
    if (pool === 'client' && clientId) where.client_id = clientId;

    const rows = await contactRepo.findMany(where);
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

  try {
    const row = await contactRepo.createContact({
      prophone_id:      tid,
      pool:             contact.pool,
      client_id:        contact.clientId        || null,
      first_name:       contact.firstName        || '',
      last_name:        contact.lastName         || '',
      email:            contact.email            || '',
      phone:            contact.phone            || '',
      company:          contact.company          || '',
      title:            contact.title            || '',
      website:          contact.website          || '',
      city:             contact.city             || '',
      trucks:           parseInt(contact.trucks) || 0,
      lifecycle_stage:  contact.lifecycleStage   || 'new',
      lead_score:       contact.leadScore        || 10,
      status:           contact.status           || 'active',
      source:           contact.source           || '',
      campaign:         contact.campaign         || '',
      contract_value:   parseInt(contact.contractValue) || 0,
      account_size:     contact.accountSize      || '1-5',
      tags:             contact.tags             || [],
      notes:            contact.notes            || '',
      owned_by:         contact.ownedBy          || '',
      added_by:         contact.addedBy          || '',
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

    const row = await contactRepo.updateContact(req.params.id, {
      first_name:       contact.firstName        || '',
      last_name:        contact.lastName         || '',
      email:            contact.email            || '',
      phone:            contact.phone            || '',
      company:          contact.company          || '',
      title:            contact.title            || '',
      website:          contact.website          || '',
      city:             contact.city             || '',
      trucks:           parseInt(contact.trucks) || 0,
      lifecycle_stage:  contact.lifecycleStage   || 'new',
      lead_score:       contact.leadScore        || 0,
      status:           contact.status           || 'active',
      source:           contact.source           || '',
      campaign:         contact.campaign         || '',
      contract_value:   parseInt(contact.contractValue) || 0,
      account_size:     contact.accountSize      || '1-5',
      tags:             contact.tags             || [],
      notes:            contact.notes            || '',
      owned_by:         contact.ownedBy          || '',
      last_activity_at: contact.lastActivityAt ? new Date(contact.lastActivityAt) : new Date(),
    });

    sendSuccess(res, toContact(row));
  } catch (err) {
    sendServerError(res, err, 'updateContact');
  }
}

export async function addActivity(req, res) {
  const { type, note, by, ts } = req.body ?? {};
  if (!type) return sendError(res, 'Activity type is required', 400);

  try {
    const contact = await contactRepo.findTenantById(req.params.id);
    if (!contact) return sendError(res, 'Contact not found', 404);
    if (!canAccessTenant(req, contact.prophone_id)) return sendError(res, 'Forbidden', 403);

    await contactRepo.addActivity(req.params.id, { type, note, by, ts });
    sendSuccess(res, { ok: true }, 201);
  } catch (err) {
    sendServerError(res, err, 'addActivity');
  }
}
