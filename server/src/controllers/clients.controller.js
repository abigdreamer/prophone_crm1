import prisma from '../lib/prisma.js';

const VALID_PLANS = ['Starter', 'Pro', 'Enterprise'];

async function listClients(req, res) {
  const clients = await prisma.client.findMany({
    where: { isCanceled: false },
    orderBy: { name: 'asc' },
  });
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
  if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  if (await clientExists(id)) {
    return res.status(409).json({ error: `A client with the ID "${id}" already exists. Please use a different company name.` });
  }

  const client = await prisma.client.create({
    data: {
      id,
      name,
      domain:   domain   || '',
      color:    color    || '#6366f1',
      industry: industry || '',
      plan:     plan     || 'Starter',
      mrr:      parseInt(mrr) || 0,
    },
  });

  const by = req.user?.name || req.user?.email || 'system';
  prisma.clientActivity.create({
    data: { entityType: 'client', entityId: client.id, action: 'CREATE', performedBy: by, metadata: { name: client.name, plan: client.plan }, ts: new Date() },
  }).catch(() => {});

  res.status(201).json(client);
}

async function updateClient(req, res) {
  const { id } = req.params;
  const body = req.body;
  if (body.plan && !VALID_PLANS.includes(body.plan)) return res.status(400).json({ error: 'Invalid plan' });

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

  // Diff and log changes
  const TRACKED = ['name', 'domain', 'industry', 'plan', 'mrr', 'color'];
  const changes = {};
  for (const field of TRACKED) {
    if (body[field] === undefined) continue;
    if (String(existing[field] ?? '') !== String(body[field] ?? '')) {
      changes[field] = { from: existing[field], to: body[field] };
    }
  }
  if (Object.keys(changes).length > 0) {
    const by = req.user?.name || req.user?.email || 'system';
    prisma.clientActivity.create({
      data: { entityType: 'client', entityId: id, action: 'UPDATE', performedBy: by, metadata: { changes }, ts: new Date() },
    }).catch(() => {});
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
    prisma.clientActivity.create({
      data: { entityType: 'client', entityId: id, action: 'CANCEL', performedBy: by, metadata: { reason: cancelReason }, ts: new Date() },
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
    prisma.clientActivity.create({
      data: { entityType: 'client', entityId: id, action: 'RESTORE', performedBy: by, metadata: { previousReason: existing.cancelReason }, ts: new Date() },
    }),
  ]);

  res.json(client);
}

async function getClientActivities(req, res) {
  const activities = await prisma.clientActivity.findMany({
    where: { entityId: req.params.id, entityType: 'client' },
    orderBy: { ts: 'desc' },
  });
  res.json(activities);
}

export { listClients, listCanceledClients, getClient, createClient, updateClient, cancelClient, restoreClient, getClientActivities };
