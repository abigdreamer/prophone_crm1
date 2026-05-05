import prisma from '../lib/prisma.js';
import { icontains, skipDups } from '../lib/db-compat.js';

export async function findMany(where) {
  return prisma.campaign.findMany({
    where,
    include: {
      template: { select: { id: true, name: true, subject: true } },
      _count:   { select: { recipients: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findById(id) {
  return prisma.campaign.findUnique({
    where:   { id },
    include: { template: { select: { id: true, name: true, subject: true } } },
  });
}

export async function createCampaign(data) {
  return prisma.campaign.create({ data });
}

export async function updateCampaign(id, data) {
  return prisma.campaign.update({ where: { id }, data });
}

export async function removeCampaign(id) {
  return prisma.campaign.delete({ where: { id } });
}

export async function findRecipients(campaignId, { status, abVariant, search, skip = 0, limit = 50 } = {}) {
  const where = { campaignId };
  if (status)    where.status    = status;
  if (abVariant) where.abVariant = abVariant;
  if (search) {
    where.contact = {
      OR: [
        { email:     icontains(search) },
        { firstName: icontains(search) },
        { lastName:  icontains(search) },
      ],
    };
  }

  const [rows, total] = await Promise.all([
    prisma.campaignRecipient.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, company: true, lifecycleStage: true,
          },
        },
      },
    }),
    prisma.campaignRecipient.count({ where }),
  ]);
  return { rows, total };
}

export async function addRecipients(campaignId, contactIds) {
  const data = contactIds.map(contactId => ({
    campaignId,
    contactId,
    status: 'pending',
  }));
  const result = await prisma.campaignRecipient.createMany({ data, ...skipDups });
  // Update recipientsCount
  const count = await prisma.campaignRecipient.count({ where: { campaignId } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { recipientsCount: count } });
  return result;
}

export async function removeAllRecipients(campaignId) {
  const result = await prisma.campaignRecipient.deleteMany({ where: { campaignId } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { recipientsCount: 0 } });
  return result;
}

export async function countPendingRecipients(campaignId) {
  return prisma.campaignRecipient.count({ where: { campaignId, status: 'pending' } });
}

export async function groupRecipientsByStatus(campaignId) {
  return prisma.campaignRecipient.groupBy({
    by:    ['status'],
    where: { campaignId },
    _count: { status: true },
  });
}

export async function assignVariants(campaignId) {
  const recipients = await prisma.campaignRecipient.findMany({
    where:  { campaignId, status: 'pending' },
    select: { id: true },
  });
  const half = Math.floor(recipients.length / 2);
  const idsForB = recipients.slice(half).map(r => r.id);
  if (idsForB.length) {
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: idsForB } },
      data:  { abVariant: 'B' },
    });
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, id: { notIn: idsForB } },
      data:  { abVariant: 'A' },
    });
  }
}

// ── Send helpers ──────────────────────────────────────────────────────────────

export async function findPendingRecipientsForSend(campaignId) {
  return prisma.campaignRecipient.findMany({
    where:   { campaignId, status: 'pending' },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
      },
    },
  });
}

export async function markRecipientSent(id, messageId) {
  return prisma.campaignRecipient.update({
    where: { id },
    data:  { status: 'sent', messageId: messageId || null, sentAt: new Date() },
  });
}

// ── Webhook event helpers ─────────────────────────────────────────────────────

export async function findRecipientByMessageId(messageId) {
  return prisma.campaignRecipient.findFirst({
    where:  { messageId },
    select: { id: true, campaignId: true, status: true, openedAt: true, clickedAt: true },
  });
}

const STATUS_RANK = { pending: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };

export async function applyEmailEvent(messageId, event) {
  const recipient = await findRecipientByMessageId(messageId);
  if (!recipient) return;

  const recipientData = {};
  const campaignData  = {};
  const now = new Date();

  switch (event) {
    case 'delivered':
      if ((STATUS_RANK[recipient.status] ?? 0) >= STATUS_RANK.delivered) return;
      recipientData.status = 'delivered';
      campaignData.deliveredCount = { increment: 1 };
      break;
    case 'opened':
      if (recipient.openedAt) return; // de-dupe multiple open events
      recipientData.status   = 'opened';
      recipientData.openedAt = now;
      campaignData.openedCount = { increment: 1 };
      break;
    case 'clicked':
      if (recipient.clickedAt) return; // de-dupe
      recipientData.status    = 'clicked';
      recipientData.clickedAt = now;
      campaignData.clickedCount = { increment: 1 };
      break;
    case 'bounced':
      recipientData.status    = 'bounced';
      recipientData.bouncedAt = now;
      campaignData.bouncedCount = { increment: 1 };
      break;
    case 'complained':
      recipientData.status = 'unsubscribed';
      campaignData.unsubscribedCount = { increment: 1 };
      break;
    default:
      return;
  }

  await Promise.all([
    prisma.campaignRecipient.update({ where: { id: recipient.id }, data: recipientData }),
    prisma.campaign.update({ where: { id: recipient.campaignId }, data: campaignData }),
  ]);
}

export async function logEvent(recipientId, campaignId, event, metadata = null) {
  return prisma.campaignRecipientEvent.create({
    data: { recipientId, campaignId, event, metadata },
  }).catch(() => {});
}

export async function getRecipientEvents(recipientId) {
  return prisma.campaignRecipientEvent.findMany({
    where:   { recipientId },
    orderBy: { occurredAt: 'asc' },
    select:  { id: true, event: true, occurredAt: true, metadata: true },
  });
}

export async function getContactsForFilter(clientId, filter) {
  const where = {};
  // Strict client scoping: only contacts that belong to exactly this client.
  // clientId = null → only prospect (unscoped) contacts.
  where.clientId = clientId ?? null;
  if (filter && filter !== 'all') {
    where.lifecycleStage = filter;
  }
  return prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, email: true, company: true, lifecycleStage: true },
    orderBy: { firstName: 'asc' },
  });
}
