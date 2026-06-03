import prisma from '../lib/prisma.js';
import { VALID_CLIENT_PLANS, ACTION, ENTITY_TYPE, TRACKED_CLIENT_FIELDS } from '../constants/index.js';
import { logActivity } from '../lib/activityLogger.js';
import { seedDefaultsForClient } from '../lib/seedDefaults.js';

async function listClients(req, res) {
  const { all } = req.query;
  const where = all === 'true' ? {} : { isCanceled: false };
  const clients = await prisma.client.findMany({ where, orderBy: { name: 'asc' } });
  res.json(clients);
}

async function listCanceledClients(req, res) {
  const clients = await prisma.client.findMany({
    where: { isCanceled: true },
    orderBy: { canceledAt: 'desc' },
  });
  res.json(clients);
}

async function getClient(req, res) {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}

async function clientExists(id) {
  const existing = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  return !!existing;
}

async function createClient(req, res) {
  const { id, name, domain, color, industry, plan, mrr } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
  if (plan && !VALID_CLIENT_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  if (await clientExists(id)) {
    return res.status(409).json({ error: `A client with the ID "${id}" already exists. Please use a different company name.` });
  }

  const client = await prisma.client.create({
    data: {
      id, name,
      domain:   domain   || '',
      color:    color    || '#6366f1',
      industry: industry || '',
      plan:     plan     || 'Starter',
      mrr:      parseInt(mrr) || 0,
    },
  });

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.CLIENT, client.id, ACTION.CREATE, `Client created: ${client.name}`, by);

  // Auto-seed built-in sort and filter options for the new client pool
  seedDefaultsForClient(client.id, prisma).catch(err =>
    console.error(`[seedDefaults] Failed to seed defaults for client ${client.id}:`, err)
  );

  res.status(201).json(client);
}

async function updateClient(req, res) {
  const { id } = req.params;
  const body = req.body;
  if (body.plan && !VALID_CLIENT_PLANS.includes(body.plan)) return res.status(400).json({ error: 'Invalid plan' });

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const client = await prisma.client.update({
    where: { id },
    data: {
      name:     body.name     ?? existing.name,
      domain:   body.domain   ?? existing.domain,
      color:    body.color    ?? existing.color,
      industry: body.industry ?? existing.industry,
      plan:     body.plan     ?? existing.plan,
      mrr:      body.mrr !== undefined ? parseInt(body.mrr) : existing.mrr,
    },
  });

  const changes = {};
  for (const field of TRACKED_CLIENT_FIELDS) {
    if (body[field] === undefined) continue;
    if (String(existing[field] ?? '') !== String(body[field] ?? '')) {
      changes[field] = { from: existing[field], to: body[field] };
    }
  }
  if (Object.keys(changes).length > 0) {
    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CLIENT, id, ACTION.UPDATE, `Client updated`, by);
  }

  res.json(client);
}

async function cancelClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  if (existing.isCanceled) return res.status(400).json({ error: 'Client is already canceled' });

  const by           = req.user?.name || req.user?.email || 'system';
  const cancelReason = (req.body?.cancelReason || '').trim();

  const [client] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data: { isCanceled: true, canceledAt: new Date(), canceledBy: by, cancelReason },
    }),
    prisma.activity.create({
      data: { entityType: ENTITY_TYPE.CLIENT, entityId: id, type: ACTION.CANCEL, note: cancelReason || 'Client canceled', by },
    }),
  ]);

  res.json(client);
}

async function restoreClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  if (!existing.isCanceled) return res.status(400).json({ error: 'Client is not canceled' });

  const by = req.user?.name || req.user?.email || 'system';

  const [client] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data: { isCanceled: false, restoredAt: new Date(), restoredBy: by },
    }),
    prisma.activity.create({
      data: { entityType: ENTITY_TYPE.CLIENT, entityId: id, type: ACTION.RESTORE, note: 'Client restored', by },
    }),
  ]);

  res.json(client);
}

async function getClientActivities(req, res) {
  const activities = await prisma.activity.findMany({
    where: { entityType: ENTITY_TYPE.CLIENT, entityId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(activities);
}

export { listClients, listCanceledClients, getClient, createClient, updateClient, cancelClient, restoreClient, getClientActivities };
