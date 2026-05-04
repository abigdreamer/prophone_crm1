import prisma from '../prisma.js';
import { icontains, skipDups } from '../lib/db-compat.js';

export async function findMany(where) {
  return prisma.campaign.findMany({
    where,
    select: {
      id: true, account_id: true, name: true, subject: true,
      from_name: true, from_email: true, status: true,
      sent_count: true, opened_count: true, clicked_count: true,
      bounced_count: true, failed_count: true,
      recipients_count: true, delivered_count: true,
      hard_bounced_count: true, soft_bounced_count: true,
      unsubscribed_count: true, complaints_count: true,
      completed_at: true,
      scheduled_at: true, created_at: true, updated_at: true,
      template_id: true,
      template: { select: { id: true, name: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.campaign.findUnique({
    where:   { id },
    include: { template: { select: { id: true, name: true, subject: true } } },
  });
}

export async function findByIdFull(id) {
  return prisma.campaign.findUnique({
    where:   { id },
    include: { template: true },
  });
}

export async function findTenantById(id) {
  return prisma.campaign.findUnique({
    where:  { id },
    select: { account_id: true, status: true },
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

export async function groupRecipientsByStatus(campaignId) {
  return prisma.campaign_recipient.groupBy({
    by:    ['status'],
    where: { campaign_id: campaignId },
    _count: { status: true },
  });
}

export async function groupRecipientsByVariantAndStatus(campaignId) {
  return prisma.campaign_recipient.groupBy({
    by:    ['ab_variant', 'status'],
    where: { campaign_id: campaignId },
    _count: { status: true },
  });
}

export async function findRecipients(campaignId, { status, variant, search, skip, limit }) {
  const where = { campaign_id: campaignId };
  if (status)  where.status     = status;
  if (variant) where.ab_variant = variant;
  if (search) {
    where.OR = [
      { email:      icontains(search) },
      { first_name: icontains(search) },
      { last_name:  icontains(search) },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.campaign_recipient.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, email: true, first_name: true, last_name: true,
        ab_variant: true, status: true, message_id: true,
        sent_at: true, opened_at: true, clicked_at: true, bounced_at: true,
        error_message: true, attempts: true,
      },
    }),
    prisma.campaign_recipient.count({ where }),
  ]);
  return { rows, total };
}

export async function addRecipients(campaignId, contacts, variant = null) {
  return prisma.campaign_recipient.createMany({
    data: contacts.map(c => ({
      campaign_id: campaignId,
      lead_id:     c.id,
      email:       c.email,
      first_name:  c.first_name || '',
      last_name:   c.last_name  || '',
      status:      'pending',
      ...(variant ? { ab_variant: variant } : {}),
    })),
    ...skipDups,
  });
}

export async function removeAllRecipients(campaignId) {
  return prisma.campaign_recipient.deleteMany({ where: { campaign_id: campaignId } });
}

export async function countPendingRecipients(campaignId) {
  return prisma.campaign_recipient.count({
    where: { campaign_id: campaignId, status: 'pending' },
  });
}

export async function findPendingRecipientIds(campaignId) {
  const rows = await prisma.campaign_recipient.findMany({
    where:  { campaign_id: campaignId, status: 'pending' },
    select: { id: true },
  });
  return rows.map(r => r.id);
}

export async function assignVariants(campaignId, idsForB) {
  if (!idsForB.length) return;
  return prisma.campaign_recipient.updateMany({
    where: { id: { in: idsForB } },
    data:  { ab_variant: 'B' },
  });
}

export async function findContactsByIds(contactIds, account_id) {
  return prisma.lead.findMany({
    where: {
      id:         { in: contactIds },
      account_id,
      email:      { not: null },
    },
    select: { id: true, email: true, first_name: true, last_name: true, phone: true },
  });
}

export async function logEvent(recipientId, campaignId, event, metadata = null) {
  return prisma.campaign_recipient_event.create({
    data: { recipient_id: recipientId, campaign_id: campaignId, event, metadata },
  }).catch(() => {}); // non-blocking
}

export async function getRecipientEvents(recipientId) {
  return prisma.campaign_recipient_event.findMany({
    where:   { recipient_id: recipientId },
    orderBy: { occurred_at: 'asc' },
    select:  { id: true, event: true, occurred_at: true, metadata: true },
  });
}

export async function findContactsByGroup(groupId, account_id) {
  return prisma.lead.findMany({
    where: {
      group_id:   groupId,
      account_id,
      email:      { not: null },
    },
    select: { id: true, email: true, first_name: true, last_name: true, phone: true },
  });
}
