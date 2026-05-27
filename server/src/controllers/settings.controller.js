import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/auth.middleware.js';

// GET /api/settings?clientId=X&module=Y
export async function getSettings(req, res) {
  const { module } = req.query;
  const clientId = req.query.clientId || null;

  if (!module) return res.status(400).json({ error: 'module is required' });

  // Prisma rejects null in a composite unique key — use findFirst for the null case
  const record = clientId
    ? await prisma.contactFieldSettings.findUnique({
        where: { clientId_module: { clientId, module } },
      })
    : await prisma.contactFieldSettings.findFirst({
        where: { clientId: null, module },
      });

  res.json({ clientId, module, config: record?.config ?? {} });
}

// PUT /api/settings
export async function saveSettings(req, res) {
  const { module, config } = req.body;
  const clientId = req.body.clientId ?? null;

  if (!module) return res.status(400).json({ error: 'module is required' });
  if (config === undefined) return res.status(400).json({ error: 'config is required' });

  let record;
  if (clientId) {
    record = await prisma.contactFieldSettings.upsert({
      where: { clientId_module: { clientId, module } },
      update: { config },
      create: { id: crypto.randomUUID(), clientId, module, config },
    });
  } else {
    // clientId is null — upsert via findFirst + update/create
    const existing = await prisma.contactFieldSettings.findFirst({
      where: { clientId: null, module },
    });
    if (existing) {
      record = await prisma.contactFieldSettings.update({
        where: { id: existing.id },
        data: { config },
      });
    } else {
      record = await prisma.contactFieldSettings.create({
        data: { id: crypto.randomUUID(), clientId: null, module, config },
      });
    }
  }

  res.json({ clientId, module, config: record.config });
}
