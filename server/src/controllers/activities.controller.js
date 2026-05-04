import prisma from '../lib/prisma.js';

const VALID_TYPES = [
  'form_submitted',
  'email_sent', 'email_opened', 'email_clicked', 'email_replied',
  'call_made', 'call_answered',
  'sms_sent', 'sms_received',
  'demo_scheduled', 'demo_held',
  'proposal_sent', 'contract_signed',
  'stage_changed', 'note_added',
  'ad_clicked', 'ad_impression',
  'meeting_scheduled', 'meeting_held',
];

async function addActivity(req, res) {
  const { contactId } = req.params;
  const { type, note, by, ts } = req.body;

  if (!type) return res.status(400).json({ error: 'type is required' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid activity type' });

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
