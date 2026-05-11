import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/auth.middleware.js';

// GET /api/settings?clientId=X&module=Y
export async function getSettings(req, res) {
  const { module } = req.query;
  const clientId = req.query.clientId || null;

  if (!module) return res.status(400).json({ error: 'module is required' });

  const record = await prisma.tenantSettings.findUnique({
    where: { clientId_module: { clientId, module } },
  });

  res.json({ clientId, module, config: record?.config ?? {} });
}

// PUT /api/settings
export async function saveSettings(req, res) {
  const { module, config } = req.body;
  const clientId = req.body.clientId ?? null;

  if (!module) return res.status(400).json({ error: 'module is required' });
  if (config === undefined) return res.status(400).json({ error: 'config is required' });

  const record = await prisma.tenantSettings.upsert({
    where: { clientId_module: { clientId, module } },
    update: { config },
    create: { id: crypto.randomUUID(), clientId, module, config },
  });

  res.json({ clientId, module, config: record.config });
}
