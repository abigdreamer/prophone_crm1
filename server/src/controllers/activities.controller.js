import prisma from '../lib/prisma.js';
import { VALID_ACTIVITY_TYPES } from '../constants/index.js';

async function addActivity(req, res) {
  const { contactId } = req.params;
  const { type, note, by, ts } = req.body;

  if (!type) return res.status(400).json({ error: 'type is required' });
  if (!VALID_ACTIVITY_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid activity type' });

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const activity = await prisma.activity.create({
    data: {
      contactId,
      type,
      note: note || '',
      by:   by   || '',
      ts:   ts ? new Date(ts) : new Date(),
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastActivityAt: new Date() },
  });

  res.status(201).json({ id: activity.id, type: activity.type, note: activity.note, ts: activity.ts, by: activity.by });
}

export { addActivity };
