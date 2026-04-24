import prisma from '../prisma.js';
import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';

const ACTIVITY_SELECT = { id: true, type: true, note: true, by: true, ts: true };

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

    const rows = await prisma.contact.findMany({
      where,
      include: { activities: { select: ACTIVITY_SELECT } },
      orderBy: { last_activity_at: 'desc' },
    });
    res.json(rows.map(toContact));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getContact(req, res) {
  try {
    const row = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { activities: { select: ACTIVITY_SELECT } },
    });
    if (!row) return res.status(404).json({ error: 'Contact not found' });
    if (!canAccessTenant(req, row.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    res.json(toContact(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createContact(req, res) {
  const { activities: initialActs = [], ...contact } = req.body;
  const tid = tenantId(req);
  if (!tid) {
    return res.status(400).json({ error: 'prophone_id is required to create a contact' });
  }

  try {
    const row = await prisma.contact.create({
      data: {
        prophone_id:      tid,
        pool:             contact.pool,
        client_id:        contact.clientId || null,
        first_name:       contact.firstName || '',
        last_name:        contact.lastName || '',
        email:            contact.email || '',
        phone:            contact.phone || '',
        company:          contact.company || '',
        title:            contact.title || '',
        website:          contact.website || '',
        city:             contact.city || '',
        trucks:           parseInt(contact.trucks) || 0,
        lifecycle_stage:  contact.lifecycleStage || 'new',
        lead_score:       contact.leadScore || 10,
        status:           contact.status || 'active',
        source:           contact.source || '',
        campaign:         contact.campaign || '',
        contract_value:   parseInt(contact.contractValue) || 0,
        account_size:     contact.accountSize || '1-5',
        tags:             contact.tags || [],
        notes:            contact.notes || '',
        owned_by:         contact.ownedBy || '',
        added_by:         contact.addedBy || '',
        last_activity_at: new Date(),
        activities: initialActs.length > 0 ? {
          create: initialActs.map(a => ({
            type: a.type,
            note: a.note || '',
            by:   a.by || '',
            ts:   a.ts ? new Date(a.ts) : new Date(),
          })),
        } : undefined,
      },
      include: { activities: { select: ACTIVITY_SELECT } },
    });
    res.status(201).json(toContact(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateContact(req, res) {
  const contact = req.body;
  try {
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id }, select: { prophone_id: true } });
    if (!existing) return res.status(404).json({ error: 'Contact not found' });
    if (!canAccessTenant(req, existing.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    const row = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        first_name:       contact.firstName || '',
        last_name:        contact.lastName || '',
        email:            contact.email || '',
        phone:            contact.phone || '',
        company:          contact.company || '',
        title:            contact.title || '',
        website:          contact.website || '',
        city:             contact.city || '',
        trucks:           parseInt(contact.trucks) || 0,
        lifecycle_stage:  contact.lifecycleStage || 'new',
        lead_score:       contact.leadScore || 0,
        status:           contact.status || 'active',
        source:           contact.source || '',
        campaign:         contact.campaign || '',
        contract_value:   parseInt(contact.contractValue) || 0,
        account_size:     contact.accountSize || '1-5',
        tags:             contact.tags || [],
        notes:            contact.notes || '',
        owned_by:         contact.ownedBy || '',
        last_activity_at: contact.lastActivityAt ? new Date(contact.lastActivityAt) : new Date(),
      },
      include: { activities: { select: ACTIVITY_SELECT } },
    });
    res.json(toContact(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addActivity(req, res) {
  const { type, note, by, ts } = req.body;
  try {
    const contact = await prisma.contact.findUnique({ where: { id: req.params.id }, select: { prophone_id: true } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    if (!canAccessTenant(req, contact.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.activity.create({
      data: {
        contact_id: req.params.id,
        type,
        note: note || '',
        by:   by || '',
        ts:   ts ? new Date(ts) : new Date(),
      },
    });
    await prisma.contact.update({
      where: { id: req.params.id },
      data:  { last_activity_at: new Date() },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
