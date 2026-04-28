/**
 * Resend webhook handler.
 *
 * Resend uses Svix to sign webhook payloads. Signature verification requires
 * the raw (un-parsed) request body, so this router uses express.raw() instead
 * of express.json(). Set RESEND_WEBHOOK_SECRET in .env to enable verification.
 *
 * Handled event types:
 *   email.sent, email.delivered, email.opened, email.clicked,
 *   email.bounced, email.complained, domain.record.verified
 */

import { Router }  from 'express';
import { Webhook } from 'svix';
import prisma       from '../prisma.js';
import { shouldAdvance } from '../utils/emailStatusUtils.js';
import * as domainRepo   from '../repositories/domainRepository.js';
import { push as ssePush } from '../services/sseService.js';
import { logEvent } from '../repositories/campaignRepository.js';

const router = Router();

router.post('/resend', express_raw(), async (req, res) => {
  const rawBody = req.body;

  if (process.env.RESEND_WEBHOOK_SECRET) {
    try {
      const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
      wh.verify(rawBody, {
        'svix-id':        req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      });
    } catch {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const { type, data } = event;

  try {
    if (type === 'domain.record.verified') {
      return await handleDomainVerified(data, res);
    }
    return await handleEmailEvent(type, data, res);
  } catch (err) {
    console.error('[Webhook] Error processing event:', type, err);
    res.status(500).json({ error: err.message });
  }
});

async function handleDomainVerified(data, res) {
  const resendDomainId = data?.id;
  if (!resendDomainId) return res.json({ ok: true, skipped: true });

  const domain = await domainRepo.findByResendId(resendDomainId);
  if (!domain) return res.json({ ok: true, skipped: true });

  await domainRepo.updateDomain(domain.id, { status: 'verified', verified_at: new Date() });
  ssePush(domain.prophone_id, 'domain_update', { domain_id: domain.id, status: 'verified' });
  return res.json({ ok: true });
}

async function handleEmailEvent(type, data, res) {
  const emailId = data?.email_id;
  if (!emailId) return res.json({ ok: true, skipped: true });

  const recipient = await prisma.campaign_recipient.findFirst({
    where: { message_id: emailId },
  });
  if (!recipient) return res.json({ ok: true, skipped: true });

  const now        = new Date();
  const updateData = {};
  let   newStatus  = null;

  switch (type) {
    case 'email.sent':
      newStatus = 'sent';
      if (!recipient.sent_at) updateData.sent_at = now;
      break;
    case 'email.delivered':
      newStatus = 'delivered';
      if (!recipient.delivered_at) updateData.delivered_at = now;
      break;
    case 'email.opened':
      newStatus = 'opened';
      if (!recipient.opened_at) updateData.opened_at = now;
      break;
    case 'email.clicked':
      newStatus = 'clicked';
      if (!recipient.clicked_at) updateData.clicked_at = now;
      break;
    case 'email.bounced':
    case 'email.complained':
      newStatus = 'bounced';
      if (!recipient.bounced_at) updateData.bounced_at = now;
      break;
    default:
      return res.json({ ok: true, skipped: true });
  }

  const advance = shouldAdvance(recipient.status, newStatus);
  if (advance) updateData.status = newStatus;

  if (Object.keys(updateData).length > 0) {
    await prisma.campaign_recipient.update({ where: { id: recipient.id }, data: updateData });
  }

  // Always log the raw event for history (even if status doesn't advance)
  await logEvent(recipient.id, recipient.campaign_id, newStatus, { resend_event: type });

  if (advance) {
    await updateCampaignCounter(recipient.campaign_id, newStatus);
    if (recipient.contact_id) {
      await updateContactEngagement(recipient.contact_id, newStatus);
    }

    // Push real-time update to any open browser tab for this tenant
    const campaignRow = await prisma.campaign.findUnique({
      where:  { id: recipient.campaign_id },
      select: { prophone_id: true, sent_count: true, opened_count: true, clicked_count: true, bounced_count: true, failed_count: true },
    });
    if (campaignRow) {
      ssePush(campaignRow.prophone_id, 'campaign_update', {
        campaign_id:   recipient.campaign_id,
        sent_count:    campaignRow.sent_count,
        opened_count:  campaignRow.opened_count,
        clicked_count: campaignRow.clicked_count,
        bounced_count: campaignRow.bounced_count,
        failed_count:  campaignRow.failed_count,
      });
    }
  }

  res.json({ ok: true });
}

async function updateCampaignCounter(campaignId, status) {
  const field = { opened: 'opened_count', clicked: 'clicked_count', bounced: 'bounced_count' }[status];
  if (!field) return;
  await prisma.campaign.update({
    where: { id: campaignId },
    data:  { [field]: { increment: 1 } },
  }).catch(err => console.error('[Webhook] Campaign counter update failed:', err));
}

async function updateContactEngagement(contactId, status) {
  const field = { opened: 'emails_opened', clicked: 'emails_clicked' }[status];
  if (!field) return;
  await prisma.contact.update({
    where: { id: contactId },
    data:  { [field]: { increment: 1 }, last_activity_at: new Date() },
  }).catch(err => console.error('[Webhook] Contact engagement update failed:', err));
}

function express_raw() {
  return (req, res, next) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  ()    => { req.body = Buffer.concat(chunks); next(); });
    req.on('error', next);
  };
}

export default router;
