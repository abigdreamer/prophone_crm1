import prisma from '../lib/prisma.js';
import * as repo from '../repositories/campaignRepository.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION, ACTIVITY_TYPE } from '../constants/index.js';
import { sendSingleEmail } from './EmailService.js';
import { substituteIntoHtml, renderTemplate, applyTracking } from './htmlRenderer.js';
import {
  htmlToPlainText,
  inlineCss,
  injectUnsubUrl,
  buildEmailHeaders,
  buildUnsubUrl,
  generateUnsubToken,
} from './email.js';
import { updateDomainTracking } from './domainService.js';

const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS    = 2000; // 2s between retry attempts for a failed email

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send a single email with up to MAX_SEND_ATTEMPTS attempts.
// Returns { id } on success, null if all attempts fail (contact stays pending for next run).
async function sendOneWithRetry(email) {
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    try {
      const result = await sendSingleEmail(email);
      return result ?? { id: null };
    } catch (err) {
      if (attempt < MAX_SEND_ATTEMPTS) {
        console.warn(`[queue] ${email.to} attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed: ${err.message} — retrying in ${RETRY_DELAY_MS / 1000}s`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`[queue] ${email.to} failed all ${MAX_SEND_ATTEMPTS} attempts: ${err.message} — deferred to next run`);
      }
    }
  }
  return null;
}

const _resendTrackingDisabled = new Set();

async function disableResendDomainTracking(domain) {
  if (!domain?.resendDomainId) return;
  if (_resendTrackingDisabled.has(domain.resendDomainId)) return;
  try {
    await updateDomainTracking(domain.resendDomainId, {
      clickTracking: false, openTracking: false, trackingSubdomain: null,
    });
    _resendTrackingDisabled.add(domain.resendDomainId);
  } catch (err) {
    console.warn('[queue:disableResendTracking]', err.message);
  }
}

// ── Core batch executor — reused by both scheduler and HTTP send ──────────────

export async function executeCampaignBatch(campaignId, { limit = null, queueRunId = null, label = '', sendGapSeconds = 5 } = {}) {
  const campaign = await repo.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  if (!campaign.templateId) throw new Error('Campaign has no template');

  const template  = await templateRepo.findById(campaign.templateId);
  if (!template) throw new Error('Template not found');
  const templateB = campaign.templateIdB ? await templateRepo.findById(campaign.templateIdB) : null;

  let fromEmail = campaign.fromEmail?.trim() || '';
  const clientDomain = await domainRepo.findFirstVerified(campaign.clientId);
  if (!fromEmail) {
    if (clientDomain) {
      fromEmail = clientDomain.defaultFromEmail || `noreply@${clientDomain.domainName}`;
    } else {
      const anyDomain = await domainRepo.findAnyVerified();
      if (anyDomain) {
        fromEmail = anyDomain.defaultFromEmail || `noreply@${anyDomain.domainName}`;
        await disableResendDomainTracking(anyDomain);
      } else {
        fromEmail = process.env.RESEND_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || '';
      }
    }
  }
  await disableResendDomainTracking(clientDomain);
  if (!fromEmail) throw new Error('No sender email configured');

  await repo.resetSkippedToPending(campaignId);

  const allRecipients = await repo.findPendingRecipientsForSend(campaignId, limit || null);
  if (!allRecipients.length) return { sent: 0, skipped: 0, total: 0 };

  const contactIds     = allRecipients.map(r => r.contactId).filter(Boolean);
  const suppressedIds  = await repo.findSuppressedContactIds(contactIds, campaignId);
  const recipients     = allRecipients.filter(r => !suppressedIds.has(r.contactId));
  const suppressed     = allRecipients.filter(r => suppressedIds.has(r.contactId));

  if (suppressed.length) {
    await Promise.all(suppressed.map(r => {
      const reason = suppressedIds.unsubIds?.has(r.contactId)
        ? 'suppressed:unsubscribed' : 'suppressed:bounced';
      return repo.updateRecipientStatus(r.id, 'skipped', reason);
    }));
  }

  if (!recipients.length) return { sent: 0, skipped: suppressed.length, total: allRecipients.length };

  await repo.updateCampaign(campaignId, { status: 'sending', sentAt: new Date() });

  const trackingBase = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  const unsubSecret  = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';
  const sentContactIds = [];
  let totalSent = 0;
  const gapMs = Math.max(0, (sendGapSeconds ?? 5)) * 1000;

  console.log(`[queue:executeBatch] Sending ${recipients.length} contacts one-by-one (gap: ${sendGapSeconds}s each)`);

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    if (!r.contact?.email?.includes('@')) {
      await repo.updateRecipientStatus(r.id, 'skipped', 'no_email');
      continue;
    }

    const isB    = campaign.type === 'ab_test' && r.abVariant === 'B';
    const tmpl   = isB && templateB ? templateB : template;
    const subj   = (isB && campaign.subjectB) ? campaign.subjectB
                   : (campaign.subject || tmpl.subject || tmpl.name);
    const unsubUrl = (trackingBase && unsubSecret)
      ? buildUnsubUrl(trackingBase, r.id, unsubSecret) : null;

    const vars = {
      firstName:  r.contact.firstName || '',
      lastName:   r.contact.lastName  || '',
      fullName:   `${r.contact.firstName || ''} ${r.contact.lastName || ''}`.trim(),
      email:      r.contact.email     || '',
      company:    r.contact.company   || '',
      contact_id: r.id,
      token:      (unsubSecret && r.id) ? generateUnsubToken(r.id, unsubSecret) : '',
    };

    const finalSubject = substituteIntoHtml(subj, vars);
    let html = tmpl.htmlOutput
      ? substituteIntoHtml(tmpl.htmlOutput, vars)
      : renderTemplate(tmpl.body, vars);

    html = inlineCss(html);
    if (trackingBase) html = applyTracking(html, campaignId, r.id, trackingBase);
    if (unsubUrl) html = injectUnsubUrl(html, unsubUrl);

    const text       = htmlToPlainText(html);
    const fromDomain = fromEmail.split('@')[1] || 'mail';
    const headers    = unsubUrl ? buildEmailHeaders(unsubUrl, fromDomain) : undefined;

    const emailPayload = {
      to: r.contact.email, from: fromEmail, fromName: campaign.fromName || '',
      subject: finalSubject, html, text, headers,
    };

    // 3 attempts per lead — if all fail, leave pending for next scheduled run
    const result = await sendOneWithRetry(emailPayload);

    if (result !== null) {
      await markRecipientSentWithRun(r.id, result?.id || null, campaignId, label, queueRunId);
      sentContactIds.push(r.contact.id);
      totalSent++;
      console.log(`[queue] (${i + 1}/${recipients.length}) Sent → ${r.contact.email}`);
    }

    // Gap between sends (skip gap after the last one)
    if (gapMs > 0 && i < recipients.length - 1) {
      await sleep(gapMs);
    }
  }

  await repo.updateCampaign(campaignId, {
    status:    'sent',
    sentCount: { increment: totalSent },
    completedAt: new Date(),
  });

  if (sentContactIds.length) {
    await prisma.activity.createMany({
      data: sentContactIds.map(contactId => ({
        entityType: ENTITY_TYPE.CONTACT,
        entityId:   contactId,
        type:       ACTIVITY_TYPE.EMAIL_SENT,
        note:       `Campaign email sent: "${campaign.name}"`,
        by:         'queue',
      })),
      skipDuplicates: true,
    }).catch(() => {});
  }

  logActivity(ENTITY_TYPE.CAMPAIGN, campaignId, ACTION.SEND, `Queue sent ${totalSent} recipients`, 'queue');

  return { sent: totalSent, skipped: suppressed.length, total: allRecipients.length };
}

async function markRecipientSentWithRun(recipientId, messageId, campaignId, sendLabel, queueRunId) {
  const { randomUUID } = await import('crypto');
  const sendId = randomUUID();
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      status:    'sent',
      messageId: messageId || null,
      sendId,
      sendLabel: sendLabel || '',
      sentAt:    new Date(),
      ...(queueRunId ? { queueRunId } : {}),
    },
  });
  // Log event
  prisma.campaignRecipientEvent.create({
    data: { recipientId, campaignId, sendId, event: 'sent' },
  }).catch(() => {});
}

// ── Queue CRUD ────────────────────────────────────────────────────────────────

function parseTimeToday(sendTime, timezone) {
  // sendTime is "HH:MM" — compute the next occurrence at or after now
  const [hStr, mStr] = sendTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  // Build a date at sendTime today in UTC (we store/schedule in UTC)
  const now = new Date();
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    h, m, 0, 0,
  ));

  // If that time has already passed today, move to tomorrow
  if (candidate <= now) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export async function createQueue(campaignId, clientId, { dailyLimit, sendTime = '09:00', timezone = 'UTC', sendGapSeconds = 5 }) {
  if (!dailyLimit || dailyLimit < 1) throw new Error('dailyLimit must be >= 1');

  // Count pending recipients
  const totalRecipients = await prisma.campaignRecipient.count({
    where: { campaignId, status: 'pending' },
  });

  const firstRunAt   = parseTimeToday(sendTime, timezone);
  const totalDays    = Math.ceil(totalRecipients / dailyLimit);
  const estimatedEnd = addDays(firstRunAt, totalDays - 1);

  const queue = await prisma.campaignQueue.create({
    data: {
      campaignId,
      clientId,
      dailyLimit,
      sendGapSeconds: Math.max(0, sendGapSeconds),
      sendTime,
      timezone,
      status:         'active',
      startedAt:      firstRunAt,
      estimatedEndAt: estimatedEnd,
      totalRecipients,
    },
    include: { runs: true },
  });

  // Create the first run
  await prisma.campaignQueueRun.create({
    data: {
      queueId:     queue.id,
      dayNumber:   1,
      scheduledAt: firstRunAt,
      status:      'pending',
    },
  });

  return prisma.campaignQueue.findUnique({
    where:   { id: queue.id },
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}

export async function getQueue(campaignId) {
  return prisma.campaignQueue.findUnique({
    where:   { campaignId },
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}

export async function updateQueue(campaignId, { dailyLimit, sendTime, timezone, sendGapSeconds }) {
  const queue = await prisma.campaignQueue.findUnique({ where: { campaignId } });
  if (!queue) throw new Error('Queue not found');

  const remaining = await prisma.campaignRecipient.count({
    where: { campaignId, status: 'pending' },
  });

  const updates = {};
  if (dailyLimit != null)      updates.dailyLimit      = dailyLimit;
  if (sendTime != null)        updates.sendTime        = sendTime;
  if (timezone != null)        updates.timezone        = timezone;
  if (sendGapSeconds != null)  updates.sendGapSeconds  = Math.max(0, sendGapSeconds);

  const newLimit = updates.dailyLimit || queue.dailyLimit;
  const newTime  = updates.sendTime   || queue.sendTime;
  const newTz    = updates.timezone   || queue.timezone;

  const nextRun = parseTimeToday(newTime, newTz);
  const totalDays = Math.ceil((queue.totalSent + remaining) / newLimit);
  const completedDays = queue.currentDay;
  const estimatedEnd = addDays(nextRun, Math.max(0, totalDays - completedDays - 1));
  updates.estimatedEndAt = estimatedEnd;

  // Reschedule next pending run
  await prisma.campaignQueueRun.updateMany({
    where:  { queueId: queue.id, status: 'pending' },
    data:   { scheduledAt: nextRun },
  });

  return prisma.campaignQueue.update({
    where:   { id: queue.id },
    data:    updates,
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}

export async function pauseQueue(campaignId) {
  const queue = await prisma.campaignQueue.findUnique({ where: { campaignId } });
  if (!queue) throw new Error('Queue not found');
  return prisma.campaignQueue.update({
    where:   { id: queue.id },
    data:    { status: 'paused' },
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}

export async function resumeQueue(campaignId) {
  const queue = await prisma.campaignQueue.findUnique({ where: { campaignId } });
  if (!queue) throw new Error('Queue not found');

  // Reschedule any pending run that was missed while paused
  const nextRun = parseTimeToday(queue.sendTime, queue.timezone);
  await prisma.campaignQueueRun.updateMany({
    where: { queueId: queue.id, status: 'pending' },
    data:  { scheduledAt: nextRun },
  });

  return prisma.campaignQueue.update({
    where:   { id: queue.id },
    data:    { status: 'active' },
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}

export async function cancelQueue(campaignId) {
  const queue = await prisma.campaignQueue.findUnique({ where: { campaignId } });
  if (!queue) throw new Error('Queue not found');
  return prisma.campaignQueue.update({
    where:   { id: queue.id },
    data:    { status: 'cancelled' },
    include: { runs: { orderBy: { dayNumber: 'asc' } } },
  });
}
