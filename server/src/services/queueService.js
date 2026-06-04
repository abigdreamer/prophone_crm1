import prisma from '../lib/prisma.js';
import * as repo from '../repositories/campaignRepository.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION, ACTIVITY_TYPE } from '../constants/index.js';
import { sendSingleEmail, getActiveFromDefaults } from './EmailService.js';
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
      console.log(`[queue:send] ✅ to=${email.to} from=${email.from} subject="${email.subject}" messageId=${result?.id ?? 'none'}`);
      return result ?? { id: null };
    } catch (err) {
      if (attempt < MAX_SEND_ATTEMPTS) {
        console.warn(`[queue:send] ⚠️  to=${email.to} attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed: ${err.message} — retrying in ${RETRY_DELAY_MS / 1000}s`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`[queue:send] ❌ to=${email.to} from=${email.from} — all ${MAX_SEND_ATTEMPTS} attempts failed: ${err.message}`);
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
  let fromName  = campaign.fromName?.trim()  || '';

  // Step 1 — campaign-level override already set above.
  // Step 2 — active provider's configured default (verified for the current provider).
  const providerDefaults = await getActiveFromDefaults();
  if (!fromEmail && providerDefaults.fromEmail) {
    fromEmail = providerDefaults.fromEmail;
    if (!fromName) fromName = providerDefaults.fromName;
    console.log(`[queue] fromEmail resolved from provider config (${providerDefaults.provider}): ${fromEmail}`);
  }

  // Step 3 — fall back to app domain registry (Resend-registered domains).
  const clientDomain = await domainRepo.findFirstVerified(campaign.clientId);
  if (!fromEmail) {
    if (clientDomain) {
      fromEmail = clientDomain.defaultFromEmail || `noreply@${clientDomain.domainName}`;
      console.log(`[queue] fromEmail resolved from client domain: ${fromEmail}`);
    } else {
      const anyDomain = await domainRepo.findAnyVerified();
      if (anyDomain) {
        fromEmail = anyDomain.defaultFromEmail || `noreply@${anyDomain.domainName}`;
        await disableResendDomainTracking(anyDomain);
        console.log(`[queue] fromEmail resolved from any domain: ${fromEmail}`);
      } else {
        fromEmail = process.env.RESEND_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || '';
        console.log(`[queue] fromEmail resolved from env vars: ${fromEmail}`);
      }
    }
  }
  await disableResendDomainTracking(clientDomain);
  if (!fromEmail) throw new Error('No sender email configured');
  console.log(`[queue] Campaign ${campaignId} — provider: ${providerDefaults.provider}, from: ${fromEmail}`);

  await repo.resetSkippedToPending(campaignId);

  // If this run was retried (withRetry or orphan recovery), some recipients may have
  // already been sent under this queueRunId. Subtract them so we never exceed the daily limit.
  let effectiveLimit = limit || null;
  if (effectiveLimit && queueRunId) {
    const alreadySentThisRun = await prisma.campaignRecipient.count({
      where: { queueRunId, status: { notIn: ['pending', 'skipped'] } },
    });
    effectiveLimit = Math.max(0, effectiveLimit - alreadySentThisRun);
    if (alreadySentThisRun > 0) {
      console.log(`[queue:executeBatch] ${alreadySentThisRun} already sent for this run — effective limit reduced to ${effectiveLimit}`);
    }
    if (effectiveLimit === 0) {
      console.log(`[queue:executeBatch] Daily limit already reached for run ${queueRunId} — skipping`);
      return { sent: 0, skipped: 0, total: 0 };
    }
  }

  const allRecipients = await repo.findPendingRecipientsForSend(campaignId, effectiveLimit);
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
    status:      'sent',
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
  const now = new Date();
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      status:      'delivered',
      messageId:   messageId || null,
      sendId,
      sendLabel:   sendLabel || '',
      sentAt:      now,
      deliveredAt: now,
      ...(queueRunId ? { queueRunId } : {}),
    },
  });
  // Log sent + delivered events immediately — stats are computed from events, no counters needed
  prisma.campaignRecipientEvent.create({ data: { recipientId, campaignId, sendId, event: 'sent' } }).catch(() => {});
  prisma.campaignRecipientEvent.create({ data: { recipientId, campaignId, sendId, event: 'delivered' } }).catch(() => {});
}

// ── Queue CRUD ────────────────────────────────────────────────────────────────

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeSendDays(sendDays) {
  if (!Array.isArray(sendDays) || !sendDays.length) return ALL_DAYS;
  return sendDays.filter(d => d >= 0 && d <= 6);
}

// Returns next UTC date (starting from "from", offset by ≥1 day) that falls on an allowed day.
function nextAllowedDate(from, sendDays) {
  const allowed = normalizeSendDays(sendDays);
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(from);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    if (allowed.includes(candidate.getUTCDay())) return candidate;
  }
  // Fallback — all days disabled somehow; just go tomorrow
  const fallback = new Date(from);
  fallback.setUTCDate(fallback.getUTCDate() + 1);
  return fallback;
}

function parseTimeOnAllowedDay(sendTime, sendDays) {
  const [hStr, mStr] = sendTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const allowed = normalizeSendDays(sendDays);
  const now = new Date();

  // Try today first; if today is allowed and the time hasn't passed, use it
  if (allowed.includes(now.getUTCDay())) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0, 0,
    ));
    if (candidate > now) return candidate;
  }

  // Advance to the next allowed day
  const next = nextAllowedDate(now, sendDays);
  next.setUTCHours(h, m, 0, 0);
  return next;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export async function createQueue(campaignId, clientId, { dailyLimit, sendTime = '09:00', timezone = 'UTC', sendGapSeconds = 5, sendDays = null }) {
  if (!dailyLimit || dailyLimit < 1) throw new Error('dailyLimit must be >= 1');

  const normalizedDays = normalizeSendDays(sendDays);

  // Count pending recipients
  const totalRecipients = await prisma.campaignRecipient.count({
    where: { campaignId, status: 'pending' },
  });

  const firstRunAt   = parseTimeOnAllowedDay(sendTime, normalizedDays);
  const totalDays    = Math.ceil(totalRecipients / dailyLimit);
  const estimatedEnd = addDays(firstRunAt, totalDays - 1);

  const queue = await prisma.campaignQueue.create({
    data: {
      campaignId,
      clientId,
      dailyLimit,
      sendGapSeconds: Math.max(0, sendGapSeconds),
      sendTime,
      sendDays:       normalizedDays,
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

export async function updateQueue(campaignId, { dailyLimit, sendTime, timezone, sendGapSeconds, sendDays }) {
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
  if (sendDays != null)        updates.sendDays        = normalizeSendDays(sendDays);

  const newLimit   = updates.dailyLimit || queue.dailyLimit;
  const newTime    = updates.sendTime   || queue.sendTime;
  const newTz      = updates.timezone   || queue.timezone;
  const newDays    = updates.sendDays   || normalizeSendDays(queue.sendDays);

  const nextRun = parseTimeOnAllowedDay(newTime, newDays);
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

  const sendDays = normalizeSendDays(queue.sendDays);
  const nextRun  = parseTimeOnAllowedDay(queue.sendTime, sendDays);
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
