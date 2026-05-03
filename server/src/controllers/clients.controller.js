const prisma = require('../lib/prisma');

const VALID_PLANS = ['Starter', 'Pro', 'Enterprise'];

async function listClients(req, res) {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
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
      domain: domain || '',
      color: color || '#6366f1',
      industry: industry || '',
      plan: plan || 'Starter',
      mrr: parseInt(mrr) || 0,
    },
  });
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
  res.json(client);
}

module.exports = { listClients, getClient, createClient, updateClient };
