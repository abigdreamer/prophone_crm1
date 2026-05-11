import prisma from '../lib/prisma.js';
import { icontains, skipDups } from '../lib/db-compat.js';
import { tracking } from '../config/tracking.js';

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

export async function cancelCampaign(id, cancelReason = '') {
  return prisma.campaign.update({
    where: { id },
    data:  { isCanceled: true, canceledAt: new Date(), cancelReason, restoredAt: null },
    include: { template: { select: { id: true, name: true, subject: true } } },
  });
}

export async function restoreCampaign(id) {
  return prisma.campaign.update({
    where: { id },
    data:  { isCanceled: false, restoredAt: new Date() },
    include: { template: { select: { id: true, name: true, subject: true } } },
  });
}

export async function findRecipients(campaignId, { status, abVariant, search, skip = 0, limit = 50 } = {}) {
  const where = { campaignId };
  if (status) {
    const tsFilter = TIMESTAMP_FILTERS[status];
    if (tsFilter) {
      Object.assign(where, tsFilter);
    } else {
      where.status = status;
    }
  }
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

export async function countByTimestamp(campaignId, field) {
  return prisma.campaignRecipient.count({
    where: { campaignId, [field]: { not: null } },
  });
}

export async function countByStatus(campaignId, status) {
  return prisma.campaignRecipient.count({
    where: { campaignId, status },
  });
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

export async function resetRecipientsForResend(campaignId, statuses) {
  return prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: statuses } },
    data:  { status: 'pending', sentAt: null, messageId: null },
  });
}

export async function updateRecipientStatus(id, status) {
  return prisma.campaignRecipient.update({
    where: { id },
    data:  { status },
  });
}

// ── Webhook event helpers ─────────────────────────────────────────────────────

export async function findRecipientByMessageId(messageId) {
  return prisma.campaignRecipient.findFirst({
    where:  { messageId },
    select: { id: true, campaignId: true, status: true, deliveredAt: true, openedAt: true, clickedAt: true },
  });
}

const STATUS_RANK = { pending: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };

export async function applyEmailEvent(messageId, event) {
  const recipient = await findRecipientByMessageId(messageId);
  if (!recipient) {
    console.warn(`[applyEmailEvent] No recipient found for messageId=${messageId} (event=${event})`);
    return;
  }

  console.log(`[applyEmailEvent] Found recipient=${recipient.id}, campaign=${recipient.campaignId}, currentStatus=${recipient.status}, event=${event}`);

  const recipientData = {};
  const campaignData  = {};
  const now = new Date();

  switch (event) {
    case 'delivered':
      if (recipient.deliveredAt) {
        console.log(`[applyEmailEvent] Skipping delivered — already delivered`);
        await logEvent(recipient.id, recipient.campaignId, event).catch(() => {});
        return;
      }
      recipientData.deliveredAt = now;
      // Only update status if it hasn't progressed past delivered
      if ((STATUS_RANK[recipient.status] ?? 0) < STATUS_RANK.delivered) {
        recipientData.status = 'delivered';
      }
      campaignData.deliveredCount = { increment: 1 };
      break;
    case 'opened':
      if (recipient.openedAt) {
        await logEvent(recipient.id, recipient.campaignId, event).catch(() => {});
        return;
      }
      // Only update status if it hasn't progressed past opened (e.g., already clicked)
      if ((STATUS_RANK[recipient.status] ?? 0) < STATUS_RANK.opened) {
        recipientData.status = 'opened';
      }
      recipientData.openedAt = now;
      // Open implies delivered
      if (!recipient.deliveredAt) {
        recipientData.deliveredAt = now;
        campaignData.deliveredCount = { increment: 1 };
      }
      campaignData.openedCount = { increment: 1 };
      break;
    case 'clicked':
      if (recipient.clickedAt) {
        await logEvent(recipient.id, recipient.campaignId, event).catch(() => {});
        return;
      }
      recipientData.status    = 'clicked';
      recipientData.clickedAt = now;
      // Click implies open + delivered
      if (!recipient.openedAt) {
        recipientData.openedAt = now;
        campaignData.openedCount = { increment: 1 };
      }
      if (!recipient.deliveredAt) {
        recipientData.deliveredAt = now;
        campaignData.deliveredCount = { increment: 1 };
      }
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
    logEvent(recipient.id, recipient.campaignId, event),
  ]);

  console.log(`[applyEmailEvent] Updated recipient=${recipient.id} to status=${recipientData.status || 'unchanged'}`);
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

/**
 * Apply an open or click tracking event end-to-end:
 *
 *   Open path
 *     De-duplicate → mark recipient → increment campaign counter →
 *     create Activity → update Contact score + counters.
 *
 *   Click path (superset of open)
 *     Same as above for click, PLUS:
 *     If TRACKING_CLICK_IMPLIES_OPEN is enabled and no open has been
 *     recorded yet (pixel was blocked), atomically backfill the open using
 *     an UPDATE … WHERE openedAt IS NULL guard so concurrent requests
 *     never double-count it.
 *
 * Uses an interactive transaction so the de-duplicate read and all writes
 * share a single DB transaction — prevents race conditions where two
 * concurrent pixel loads would both see openedAt = null.
 */
export async function applyTrackingEvent(recipientId, event) {
  if (!tracking.enabled) return;
  if (event !== 'opened' && event !== 'clicked') return;

  await prisma.$transaction(async tx => {
    const recipient = await tx.campaignRecipient.findUnique({
      where:  { id: recipientId },
      select: {
        id: true, campaignId: true, contactId: true,
        deliveredAt: true, openedAt: true, clickedAt: true,
      },
    });

    if (!recipient?.contactId) return;

    const isOpen  = event === 'opened';
    const isClick = event === 'clicked';

    // Hard de-duplicate: event already recorded for this recipient
    if (isOpen  && recipient.openedAt)  return;
    if (isClick && recipient.clickedAt) return;

    // ── click-implies-open fallback ───────────────────────────────────────
    // Pixel may have been blocked by the email client. When a click arrives
    // without a prior open, atomically claim the open slot with a conditional
    // UPDATE (WHERE openedAt IS NULL). The row-level lock acquired by the
    // UPDATE ensures only one concurrent request backfills the open, even
    // under parallel requests. count=0 means another writer already won.
    let openBackfilled = false;
    if (isClick && tracking.clickImpliesOpen && !recipient.openedAt) {
      const { count } = await tx.campaignRecipient.updateMany({
        where: { id: recipient.id, openedAt: null },
        data:  { openedAt: new Date() },
      });
      openBackfilled = count > 0;
    }

    // ── build merged writes ───────────────────────────────────────────────
    const now = new Date();

    const recipientData = isOpen
      ? { status: 'opened',  openedAt:  now }
      : { status: 'clicked', clickedAt: now };  // status 'clicked' supersedes 'opened'

    // Open/click implies delivered — backfill if missing
    if (!recipient.deliveredAt) {
      recipientData.deliveredAt = now;
    }

    const campaignData = {
      ...(isClick ? { clickedCount: { increment: 1 } } : { openedCount: { increment: 1 } }),
      ...(openBackfilled ? { openedCount: { increment: 1 } } : {}),
      ...(!recipient.deliveredAt ? { deliveredCount: { increment: 1 } } : {}),
    };

    const contactData = {
      ...(isClick ? { emailsClicked: { increment: 1 } } : { emailsOpened: { increment: 1 } }),
      ...(openBackfilled ? { emailsOpened: { increment: 1 } } : {}),
      leadScore:      { increment: (isOpen ? tracking.openPoints : tracking.clickPoints)
                                 + (openBackfilled ? tracking.openPoints : 0) },
      lastActivityAt: now,
    };

    const activityRows = [];

    // Backfilled open activity (appears first in the timeline)
    if (openBackfilled) {
      activityRows.push({
        contactId: recipient.contactId,
        type:      'email_opened',
        note:      'Opened a campaign email (inferred from click)',
        by:        'System',
        points:    tracking.openPoints,
      });
    }

    // Primary event activity
    activityRows.push({
      contactId: recipient.contactId,
      type:      isOpen ? 'email_opened' : 'email_clicked',
      note:      isOpen ? 'Opened a campaign email' : 'Clicked a link in a campaign email',
      by:        'System',
      points:    isOpen ? tracking.openPoints : tracking.clickPoints,
    });

    await Promise.all([
      tx.campaignRecipient.update({ where: { id: recipient.id },         data: recipientData }),
      tx.campaign.update({          where: { id: recipient.campaignId },  data: campaignData  }),
      tx.contact.update({           where: { id: recipient.contactId },   data: contactData   }),
      ...activityRows.map(data => tx.activity.create({ data })),
    ]);
  });
}

// Return set of contactIds that have ever bounced or unsubscribed
export async function findSuppressedContactIds(contactIds) {
  // Check campaign_recipients for bounced/unsubscribed status
  const recipientRows = await prisma.campaignRecipient.findMany({
    where:  { contactId: { in: contactIds }, status: { in: ['bounced', 'unsubscribed'] } },
    select: { contactId: true },
    distinct: ['contactId'],
  });

  // Also check contacts table for globally unsubscribed contacts
  const unsubRows = await prisma.contact.findMany({
    where:  { id: { in: contactIds }, isUnsubscribed: true },
    select: { id: true },
  });

  const set = new Set(recipientRows.map(r => r.contactId));
  unsubRows.forEach(r => set.add(r.id));
  return set;
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
