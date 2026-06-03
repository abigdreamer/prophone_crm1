import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { icontains, skipDups } from '../lib/db-compat.js';
import { tracking } from '../config/tracking.js';
import { TIMESTAMP_FILTERS } from '../constants/index.js';

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

export async function findRecipients(campaignId, { status, event, abVariant, search, skip = 0, limit = 50 } = {}) {
  const where = { campaignId };

  if (event) {
    // Scope event filter to this campaign so the count matches getStatisticsFromEvents,
    // which also filters CampaignRecipientEvent by campaignId.
    where.events = { some: { event, campaignId } };
  } else if (status) {
    where.status = status;
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

// Upsert recipients for re-send flows: resets status to 'pending' if the row already exists
// so the contact can be sent to again. Uniqueness within a batch is enforced by the caller.
export async function upsertRecipients(campaignId, contactIds) {
  await Promise.all(
    contactIds.map(contactId =>
      prisma.campaignRecipient.upsert({
        where:  { campaignId_contactId: { campaignId, contactId } },
        create: { campaignId, contactId, status: 'pending' },
        update: {
          status:    'pending',
          messageId: null,
          sendId:    null,
          sentAt:    null,
          openedAt:  null,
          clickedAt: null,
          bouncedAt: null,
        },
      })
    )
  );
  const count = await prisma.campaignRecipient.count({ where: { campaignId } });
  await prisma.campaign.update({ where: { id: campaignId }, data: { recipientsCount: count } });
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

// Reset skipped recipients back to pending so the send can re-evaluate them with
// current suppression rules. Contacts with no email will be skipped again immediately.
export async function resetSkippedToPending(campaignId) {
  return prisma.campaignRecipient.updateMany({
    where: { campaignId, status: 'skipped' },
    data:  { status: 'pending' },
  });
}

export async function findPendingRecipientsForSend(campaignId, limit = null) {
  return prisma.campaignRecipient.findMany({
    where:   { campaignId, status: 'pending' },
    ...(limit ? { take: limit } : {}),
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
      },
    },
  });
}

export async function markRecipientSent(id, messageId, campaignId = null, sendLabel = '') {
  const sendId = randomUUID();
  const result = await prisma.campaignRecipient.update({
    where: { id },
    data:  { status: 'sent', messageId: messageId || null, sendId, sendLabel: sendLabel || '', sentAt: new Date() },
  });
  if (campaignId) logEvent(id, campaignId, 'sent', null, sendId).catch(() => {});
  return result;
}

export async function resetRecipientsForResend(campaignId, statuses) {
  return prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: statuses } },
    data:  { status: 'pending', sentAt: null, messageId: null, sendId: null },
  });
}

export async function updateRecipientStatus(id, status, skipReason = null) {
  return prisma.campaignRecipient.update({
    where: { id },
    data:  { status, ...(skipReason != null ? { skipReason } : {}) },
  });
}

export async function resubscribeRecipient(recipientId) {
  return prisma.campaignRecipient.update({
    where: { id: recipientId },
    data:  { resubscribedAt: new Date() },
  });
}

export async function dryRunSend(campaignId, limit = null) {
  const allPending = await findPendingRecipientsForSend(campaignId, limit);
  const total = allPending.length;
  if (total === 0) {
    return { total: 0, willSend: 0, skipUnsubscribed: 0, skipBounced: 0, skipNoEmail: 0, skipDuplicate: 0 };
  }

  const contactIds    = allPending.map(r => r.contactId).filter(Boolean);
  const suppressedIds = await findSuppressedContactIds(contactIds, campaignId);

  let skipUnsubscribed = 0, skipBounced = 0, skipNoEmail = 0, skipDuplicate = 0, willSend = 0;
  const seenEmails = new Set();

  for (const r of allPending) {
    if (suppressedIds.unsubIds.has(r.contactId))  { skipUnsubscribed++; continue; }
    if (suppressedIds.bounceIds.has(r.contactId)) { skipBounced++;      continue; }
    const email = r.contact?.email?.toLowerCase();
    if (!email || !email.includes('@'))            { skipNoEmail++;      continue; }
    if (seenEmails.has(email))                     { skipDuplicate++;    continue; }
    seenEmails.add(email);
    willSend++;
  }

  return { total, willSend, skipUnsubscribed, skipBounced, skipNoEmail, skipDuplicate };
}

// ── Webhook event helpers ─────────────────────────────────────────────────────

export async function findRecipientByMessageId(messageId) {
  return prisma.campaignRecipient.findFirst({
    where:  { messageId },
    select: { id: true, campaignId: true, status: true, openedAt: true, clickedAt: true, sendId: true },
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

  const logEventType = event === 'complained' ? 'unsubscribed' : event;
  await Promise.all([
    prisma.campaignRecipient.update({ where: { id: recipient.id }, data: recipientData }),
    prisma.campaign.update({ where: { id: recipient.campaignId }, data: campaignData }),
    logEvent(recipient.id, recipient.campaignId, logEventType, null, recipient.sendId),
  ]);

  console.log(`[applyEmailEvent] Updated recipient=${recipient.id} to status=${recipientData.status || 'unchanged'}`);
}

export async function logEvent(recipientId, campaignId, event, metadata = null, sendId = null) {
  return prisma.campaignRecipientEvent.create({
    data: { recipientId, campaignId, event, metadata, sendId },
  }).catch(() => {});
}

export async function getRecipientEvents(recipientId) {
  return prisma.campaignRecipientEvent.findMany({
    where:   { recipientId },
    orderBy: { createdAt: 'asc' },
    select:  { id: true, event: true, createdAt: true, metadata: true },
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
        openedAt: true, clickedAt: true, sendId: true,
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
    const eventRows    = [];

    // Derive send_id: use stored value; fall back to messageId lookup or recipientId for legacy rows.
    // We do this inside the transaction so the read and writes are consistent.
    let sendId = recipient.sendId;
    if (!sendId) {
      const full = await tx.campaignRecipient.findUnique({
        where:  { id: recipient.id },
        select: { messageId: true },
      });
      sendId = full?.messageId ?? recipient.id;
    }

    // Backfilled open activity (appears first in the timeline)
    if (openBackfilled) {
      activityRows.push({
        entityType: 'contact',
        entityId:   recipient.contactId,
        type:       'email_opened',
        note:       'Opened a campaign email (inferred from click)',
        by:         'System',
        points:     tracking.openPoints,
      });
      eventRows.push({
        recipientId: recipient.id,
        campaignId:  recipient.campaignId,
        sendId,
        event:       'opened',
      });
    }

    // Primary event activity
    activityRows.push({
      entityType: 'contact',
      entityId:   recipient.contactId,
      type:       isOpen ? 'email_opened' : 'email_clicked',
      note:       isOpen ? 'Opened a campaign email' : 'Clicked a link in a campaign email',
      by:         'System',
      points:     isOpen ? tracking.openPoints : tracking.clickPoints,
    });
    eventRows.push({
      recipientId: recipient.id,
      campaignId:  recipient.campaignId,
      sendId,
      event:       isOpen ? 'opened' : 'clicked',
    });

    await Promise.all([
      tx.campaignRecipient.update({ where: { id: recipient.id },         data: recipientData }),
      tx.campaign.update({          where: { id: recipient.campaignId },  data: campaignData  }),
      tx.contact.update({           where: { id: recipient.contactId },   data: contactData   }),
      ...activityRows.map(data => tx.activity.create({ data })),
      ...eventRows.map(data => tx.campaignRecipientEvent.create({ data })),
    ]);
  });
}

// Return set of contactIds that have ever bounced or unsubscribed
export async function findPendingRecipientsForContacts(campaignId, contactIds) {
  return prisma.campaignRecipient.findMany({
    where: { campaignId, status: 'pending', contactId: { in: contactIds } },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, company: true },
      },
    },
  });
}

export async function findSuppressedContactIds(contactIds, campaignId) {
  // Global: unsubscribed contacts that have NOT been re-subscribed by an admin
  const unsubRows = await prisma.campaignRecipient.findMany({
    where:  { contactId: { in: contactIds }, status: 'unsubscribed', resubscribedAt: null },
    select: { contactId: true },
    distinct: ['contactId'],
  });

  // Per-campaign: skip contacts that already bounced in THIS specific campaign
  const bounceQuery = { contactId: { in: contactIds }, status: 'bounced' };
  if (campaignId) bounceQuery.campaignId = campaignId;
  const bounceRows = await prisma.campaignRecipient.findMany({
    where:  bounceQuery,
    select: { contactId: true },
    distinct: ['contactId'],
  });

  const unsubIds  = new Set(unsubRows.map(r => r.contactId));
  const bounceIds = new Set(bounceRows.map(r => r.contactId));
  const all = new Set([...unsubIds, ...bounceIds]);
  // Expose split sets for skip-reason attribution while staying backwards-compatible
  all.unsubIds  = unsubIds;
  all.bounceIds = bounceIds;
  return all;
}

/**
 * Return per-send analytics for a campaign, grouped by send_id.
 *
 * For events that pre-date the send_id column (sendId = null), the effective
 * send_id is derived in priority order: stored sendId → recipient.messageId
 * (unique Resend message ID) → recipient.id.
 *
 * Each group reports:
 *   uniqueOpen  – 1 if any open event exists for this send, else 0
 *   totalOpen   – raw count of open events (pixel may fire multiple times)
 *   totalClicks – count of click events
 *   clicks      – click event detail array for link-level attribution
 */
export async function getSendAnalytics(campaignId) {
  const recipients = await prisma.campaignRecipient.findMany({
    where:   { campaignId },
    select: {
      id: true, contactId: true, messageId: true, sendId: true,
      sentAt: true,
      events: {
        select: { id: true, event: true, sendId: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return recipients.map(r => {
    // Derive effective send_id for recipient and its legacy events
    const effectiveSendId = r.sendId ?? r.messageId ?? r.id;

    const openEvents  = [];
    const clickEvents = [];

    for (const evt of r.events) {
      // Each event may have its own sendId; if absent, inherit from recipient
      const evtSendId = evt.sendId ?? effectiveSendId;
      // Only include events that belong to this send instance
      if (evtSendId !== effectiveSendId) continue;
      if (evt.event === 'opened')  openEvents.push(evt);
      if (evt.event === 'clicked') clickEvents.push(evt);
    }

    return {
      sendId:      effectiveSendId,
      recipientId: r.id,
      contactId:   r.contactId,
      sentAt:      r.sentAt,
      uniqueOpen:  openEvents.length  > 0 ? 1 : 0,
      totalOpen:   openEvents.length,
      totalClicks: clickEvents.length,
      clicks:      clickEvents.map(e => ({ id: e.id, metadata: e.metadata, createdAt: e.createdAt })),
    };
  });
}

/**
 * Count unique recipients per event type from the events table.
 * Used for computing analytics independent of the campaign-level counters.
 */
export async function getStatisticsFromEvents(campaignId) {
  const groups = await prisma.campaignRecipientEvent.groupBy({
    by:    ['event', 'recipientId'],
    where: { campaignId },
  });
  const counts = {};
  for (const g of groups) {
    counts[g.event] = (counts[g.event] || 0) + 1;
  }
  return counts;
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
