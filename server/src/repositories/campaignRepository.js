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
  // Scope to the campaign's client when one is set; otherwise include all contacts
  if (clientId) {
    where.OR = [{ clientId }, { clientId: null }];
  }
  if (filter && filter !== 'all') {
    where.lifecycleStage = filter;
  }
  return prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, email: true, company: true, lifecycleStage: true },
    orderBy: { firstName: 'asc' },
  });
}
