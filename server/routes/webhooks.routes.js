/**
 * Resend webhook handler.
 *
 * Resend uses Svix to sign webhook payloads. Signature verification requires
 * the raw (un-parsed) request body, so this router uses express.raw() instead
 * of express.json(). Set RESEND_WEBHOOK_SECRET in .env to enable verification.
 *
 * Handled event types:
 *   email.sent, email.delivered, email.opened, email.clicked,
 *   email.bounced, email.complained
 */

import { Router }  from 'express';
import { Webhook } from 'svix';
import prisma       from '../prisma.js';

const router = Router();

// Status priority — only advance forward, never regress
const STATUS_PRIORITY = {
  pending:   1,
  queued:    2,
  sent:      3,
  delivered: 4,
  opened:    5,
  clicked:   6,
  bounced:   7,  // terminal but on its own track
  failed:    0,
};

function shouldAdvance(current, next) {
  // bounced always wins; never overwrite bounced with something else
  if (current === 'bounced') return false;
  if (next    === 'bounced') return true;
  return (STATUS_PRIORITY[next] ?? 0) > (STATUS_PRIORITY[current] ?? 0);
}

// Resend/Svix sends raw JSON — use express.raw() for this route only
router.post('/resend', express_raw(), async (req, res) => {
  const rawBody = req.body; // Buffer when using express.raw()

  // Verify signature when secret is configured
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
  const emailId = data?.email_id;

  if (!emailId) {
    // Ignore events without an email ID (e.g. test pings)
    return res.json({ ok: true, skipped: true });
  }

  try {
    const recipient = await prisma.campaign_recipient.findFirst({
      where: { message_id: emailId },
    });

    if (!recipient) {
      // Not from a campaign we sent — ignore silently
      return res.json({ ok: true, skipped: true });
    }

    const now      = new Date();
    const updateData = {};
    let   newStatus = null;

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

    // Write recipient update
    if (Object.keys(updateData).length > 0) {
      await prisma.campaign_recipient.update({
        where: { id: recipient.id },
        data:  updateData,
      });
    }

    // Update campaign aggregate counters and contact engagement — only on first occurrence
    if (advance) {
      await updateCampaignCounter(recipient.campaign_id, newStatus);
      if (recipient.contact_id) {
        await updateContactEngagement(recipient.contact_id, newStatus);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error processing event:', type, err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: increment the right counter on the campaign row
async function updateCampaignCounter(campaignId, status) {
  const field = {
    delivered: null,           // no dedicated column
    opened:    'opened_count',
    clicked:   'clicked_count',
    bounced:   'bounced_count',
  }[status];

  if (!field) return;

  await prisma.campaign.update({
    where: { id: campaignId },
    data:  { [field]: { increment: 1 } },
  }).catch(err => console.error('[Webhook] Campaign counter update failed:', err));
}

// Helper: increment engagement counters on the contact row
async function updateContactEngagement(contactId, status) {
  const field = {
    opened:  'emails_opened',
    clicked: 'emails_clicked',
  }[status];

  if (!field) return;

  await prisma.contact.update({
    where: { id: contactId },
    data:  { [field]: { increment: 1 }, last_activity_at: new Date() },
  }).catch(err => console.error('[Webhook] Contact engagement update failed:', err));
}

// express.raw middleware — defined here so the file is self-contained
function express_raw() {
  return (req, res, next) => {
    let data = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => {
      req.body = Buffer.concat(data);
      next();
    });
    req.on('error', next);
  };
}

export default router;
