/**
 * WebhookService — unified event processing for Resend and Brevo webhooks.
 *
 * Normalizes provider-specific event names into the canonical set:
 *   SENT | DELIVERED | OPENED | CLICKED | BOUNCED | FAILED | COMPLAINED | UNSUBSCRIBED
 *
 * On each event:
 *   1. Writes a row to email_events (audit trail)
 *   2. Updates CampaignRecipient status + timestamps (de-duplicated)
 *   3. Increments Campaign counters atomically
 */

import crypto from 'crypto';
import prisma  from '../../lib/prisma.js';
import { getWebhookSecret } from '../settings/SettingsService.js';

// ── Canonical event values ────────────────────────────────────────────────────

export const EMAIL_EVENTS = {
  SENT:         'SENT',
  DELIVERED:    'DELIVERED',
  OPENED:       'OPENED',
  CLICKED:      'CLICKED',
  BOUNCED:      'BOUNCED',
  FAILED:       'FAILED',
  COMPLAINED:   'COMPLAINED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
};

// ── Provider event maps ───────────────────────────────────────────────────────

const RESEND_MAP = {
  'email.sent':       EMAIL_EVENTS.SENT,
  'email.delivered':  EMAIL_EVENTS.DELIVERED,
  'email.opened':     EMAIL_EVENTS.OPENED,
  'email.clicked':    EMAIL_EVENTS.CLICKED,
  'email.bounced':    EMAIL_EVENTS.BOUNCED,
  'email.failed':     EMAIL_EVENTS.FAILED,
  'email.complained': EMAIL_EVENTS.COMPLAINED,
};

const BREVO_MAP = {
  request:       EMAIL_EVENTS.SENT,
  delivered:     EMAIL_EVENTS.DELIVERED,
  opened:        EMAIL_EVENTS.OPENED,
  unique_open:   EMAIL_EVENTS.OPENED,
  click:         EMAIL_EVENTS.CLICKED,
  hard_bounce:   EMAIL_EVENTS.BOUNCED,
  soft_bounce:   EMAIL_EVENTS.BOUNCED,
  error:         EMAIL_EVENTS.FAILED,
  deferred:      EMAIL_EVENTS.FAILED,
  invalid_email: EMAIL_EVENTS.FAILED,
  spam:          EMAIL_EVENTS.COMPLAINED,
  complaint:     EMAIL_EVENTS.COMPLAINED,
  unsubscribed:  EMAIL_EVENTS.UNSUBSCRIBED,
};

// ── Signature validation ──────────────────────────────────────────────────────

export async function validateResendSignature(rawBody, headers) {
  const secret = await getWebhookSecret('resend');
  if (!secret) return true; // no secret configured → accept (dev mode)

  const msgId        = headers['svix-id'];
  const msgTimestamp = headers['svix-timestamp'];
  const msgSignature = headers['svix-signature'];

  if (!msgId || !msgTimestamp || !msgSignature) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(msgTimestamp, 10)) > 300) return false;

  const toSign   = `${msgId}.${msgTimestamp}.${rawBody.toString()}`;
  const keyBytes = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const computed = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');
  const sigs     = msgSignature.split(' ').map(s => s.replace(/^v\d+,/, ''));
  return sigs.includes(computed);
}

export async function validateBrevoToken(queryToken) {
  const secret = await getWebhookSecret('brevo');
  if (!secret) return true; // no secret → accept (dev mode)
  return queryToken === secret;
}

// ── Core event applier ────────────────────────────────────────────────────────

// Mapping from canonical event → recipient status + campaign counter increment
const STATUS_RANK = { pending: 0, sent: 1, SENT: 1, delivered: 2, DELIVERED: 2, opened: 3, OPENED: 3, clicked: 4, CLICKED: 4 };

async function applyCanonicalEvent(providerMessageId, canonicalEvent, provider, recipientEmail, metadata) {
  // 1. Write to email_events table
  await prisma.emailEvent.create({
    data: {
      id:                crypto.randomUUID(),
      providerMessageId,
      recipientEmail:    recipientEmail || '',
      provider,
      event:             canonicalEvent,
      metadata:          metadata || null,
    },
  }).catch(() => {}); // best-effort; never block on audit log failure

  // 2. Find CampaignRecipient by message ID
  const recipient = await prisma.campaignRecipient.findFirst({
    where:  { messageId: providerMessageId },
    select: { id: true, campaignId: true, status: true, openedAt: true, clickedAt: true, bouncedAt: true },
  });
  if (!recipient) return; // message not tracked in our system

  // 3. Update email_events row with IDs now that we have them
  await prisma.emailEvent.updateMany({
    where: { providerMessageId, campaignId: null },
    data:  { campaignId: recipient.campaignId, recipientId: recipient.id },
  }).catch(() => {});

  const recipientData = {};
  const campaignData  = {};
  const now = new Date();

  switch (canonicalEvent) {
    case EMAIL_EVENTS.DELIVERED:
      if ((STATUS_RANK[recipient.status] ?? 0) >= STATUS_RANK.DELIVERED) return;
      recipientData.status = 'delivered';
      campaignData.deliveredCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.OPENED:
      if (recipient.openedAt) return; // de-dup
      recipientData.status   = 'opened';
      recipientData.openedAt = now;
      campaignData.openedCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.CLICKED:
      if (recipient.clickedAt) return; // de-dup
      recipientData.status    = 'clicked';
      recipientData.clickedAt = now;
      campaignData.clickedCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.BOUNCED:
      if (recipient.bouncedAt) return; // de-dup
      recipientData.status    = 'bounced';
      recipientData.bouncedAt = now;
      campaignData.bouncedCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.FAILED:
      recipientData.status = 'bounced'; // treat failed as bounced for suppression
      campaignData.bouncedCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.COMPLAINED:
      recipientData.status = 'unsubscribed';
      campaignData.unsubscribedCount = { increment: 1 };
      break;
    case EMAIL_EVENTS.UNSUBSCRIBED:
      recipientData.status = 'unsubscribed';
      campaignData.unsubscribedCount = { increment: 1 };
      break;
    default:
      return; // SENT — no status change needed, already marked on send
  }

  if (!Object.keys(recipientData).length) return;

  await Promise.all([
    prisma.campaignRecipient.update({ where: { id: recipient.id }, data: recipientData }),
    prisma.campaign.update({ where: { id: recipient.campaignId }, data: campaignData }),
  ]).catch(e => console.error('[webhook] DB update error:', e.message));
}

// ── Resend event handler ──────────────────────────────────────────────────────

export async function processResendEvent(event) {
  const type = event?.type;

  // Domain lifecycle events
  if (type === 'domain.verified' || type === 'domain.failed') {
    const domainId = event?.data?.id;
    if (domainId) {
      const status = type === 'domain.verified' ? 'verified' : 'failed';
      await prisma.domain.updateMany({
        where: { OR: [{ providerDomainId: domainId }, { resendDomainId: domainId }] },
        data:  { status },
      }).catch(() => {});
    }
    return;
  }

  const canonicalEvent = RESEND_MAP[type];
  if (!canonicalEvent) return;

  const messageId = event?.data?.email_id;
  if (!messageId) return;

  await applyCanonicalEvent(messageId, canonicalEvent, 'resend', event?.data?.to, { raw: type });
}

// ── Brevo event handler ───────────────────────────────────────────────────────

export async function processBrevoEvent(event) {
  const type      = event?.event;
  const messageId = event?.['message-id'] || event?.messageId;

  const canonicalEvent = BREVO_MAP[type];
  if (!canonicalEvent || !messageId) return;

  await applyCanonicalEvent(messageId, canonicalEvent, 'brevo', event?.email, { raw: type, subject: event?.subject });
}
