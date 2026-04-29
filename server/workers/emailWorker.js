/**
 * Email Worker — DB-backed queue processor.
 *
 * Polls campaign_recipients for pending rows, sends them via Resend in
 * batches of BATCH_SIZE, and writes results back. Runs entirely in the
 * background; the HTTP layer never blocks on it.
 *
 * Status flow:
 *   pending → queued (locked by worker) → sent (Resend accepted)
 *                                       → failed (max retries exceeded)
 * Webhook events advance: sent → delivered → opened / clicked / bounced
 */

import prisma from '../prisma.js';
import { sendBatchEmails } from '../services/resendService.js';
import { substituteIntoHtml, applyTracking } from '../services/htmlRenderer.js';

const BATCH_SIZE   = 50;   // Resend batch limit is 100; use 50 for safety
const MAX_ATTEMPTS = 3;
const POLL_MS      = 5_000; // Poll every 5 seconds

let _timer = null;
let _running = false; // Guard against overlapping poll cycles

async function processBatch() {
  if (_running) return;
  _running = true;

  try {
    // 1. Claim pending recipients — only from actively running campaigns
    const pending = await prisma.campaign_recipient.findMany({
      where: {
        status:   'pending',
        attempts: { lt: MAX_ATTEMPTS },
        campaign: { status: 'running' },
      },
      include: { campaign: { select: { id: true, subject: true, from_name: true, from_email: true, html_snapshot: true, ab_subject_b: true, ab_html_snapshot: true, status: true } } },
      take: BATCH_SIZE,
    });

    if (pending.length === 0) return;

    const ids = pending.map(r => r.id);

    // 2. Lock rows — set to 'queued' so the next poll cycle skips them
    await prisma.campaign_recipient.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'queued' },
    });

    // 3. Build Resend payloads — personalise HTML per recipient
    // Separate out recipients whose campaign has no HTML (can't send — mark failed immediately)
    const noHtml = [];
    const sendable = [];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const r of pending) {
      const isB    = r.ab_variant === 'B' && r.campaign.ab_subject_b;
      const subject = isB ? r.campaign.ab_subject_b : r.campaign.subject;
      const rawHtml = isB ? (r.campaign.ab_html_snapshot || r.campaign.html_snapshot) : r.campaign.html_snapshot;

      if (!rawHtml) {
        noHtml.push(r);
        continue;
      }

      // Resend rejects blank or malformed addresses — fail fast instead of poisoning the whole batch
      if (!r.email || !EMAIL_RE.test(r.email.trim())) {
        await prisma.campaign_recipient.update({
          where: { id: r.id },
          data:  { status: 'failed', error_message: 'Invalid or missing email address', attempts: r.attempts + 1 },
        });
        continue;
      }

      const vars = {
        firstName: r.first_name || 'there',
        lastName:  r.last_name  || '',
        fullName:  (r.first_name || r.last_name)
          ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
          : 'there',
        email:     r.email,
        phone:     r.phone    || '',
        company:   r.company  || '',
        city:      r.city     || '',
        title:     r.title    || '',
      };
      const personalisedHtml    = substituteIntoHtml(rawHtml, vars);
      const personalisedSubject = substituteIntoHtml(subject, vars);
      const appUrl   = process.env.APP_URL || '';
      const finalHtml = appUrl
        ? applyTracking(personalisedHtml, r.campaign_id, r.id, appUrl)
        : personalisedHtml;
      sendable.push({
        recipientId: r.id,
        campaignId:  r.campaign_id,
        to:          r.email,
        from:        r.campaign.from_email,
        fromName:    r.campaign.from_name,
        subject:     personalisedSubject,
        html:        finalHtml,
        _recipient:  r,
      });
    }

    // Mark no-html recipients as permanently failed
    for (const r of noHtml) {
      await prisma.campaign_recipient.update({
        where: { id: r.id },
        data:  { status: 'failed', error_message: 'Campaign has no email template — set a template and resend.', attempts: r.attempts + 1 },
      });
    }

    if (sendable.length === 0) return;

    const payloads = sendable;

    // 4. Send via Resend batch API
    let results = null;
    let batchError = null;

    try {
      results = await sendBatchEmails(payloads);
    } catch (err) {
      batchError = err;
      console.error('[EmailWorker] Batch send failed:', err.message);
    }

    // 5. Update statuses and campaign counters
    const now = new Date();
    const campaignIncrements = {}; // { campaignId: { sent, failed } }

    for (let i = 0; i < sendable.length; i++) {
      const recipient = sendable[i]._recipient;
      const cid = recipient.campaign_id;
      campaignIncrements[cid] ??= { sent: 0, failed: 0 };

      if (batchError) {
        // Entire batch failed — unlock for retry, count the attempt
        const newAttempts = recipient.attempts + 1;
        const isFinal     = newAttempts >= MAX_ATTEMPTS;

        await prisma.campaign_recipient.update({
          where: { id: recipient.id },
          data: {
            status:        isFinal ? 'failed' : 'pending',
            attempts:      newAttempts,
            error_message: batchError.message,
          },
        });

        if (isFinal) campaignIncrements[cid].failed++;
      } else {
        const msgId = results?.[i]?.id ?? '';

        if (msgId) {
          await prisma.campaign_recipient.update({
            where: { id: recipient.id },
            data: {
              status:     'sent',
              message_id: msgId,
              sent_at:    now,
              attempts:   recipient.attempts + 1,
            },
          });
          campaignIncrements[cid].sent++;
        } else {
          // Resend returned no ID for this slot — treat as a transient failure
          const newAttempts = recipient.attempts + 1;
          const isFinal     = newAttempts >= MAX_ATTEMPTS;

          await prisma.campaign_recipient.update({
            where: { id: recipient.id },
            data: {
              status:        isFinal ? 'failed' : 'pending',
              attempts:      newAttempts,
              error_message: 'Resend returned no message ID',
            },
          });

          if (isFinal) campaignIncrements[cid].failed++;
        }
      }
    }

    // 6. Update per-campaign aggregates
    for (const [cid, inc] of Object.entries(campaignIncrements)) {
      const data = {};
      if (inc.sent   > 0) data.sent_count   = { increment: inc.sent };
      if (inc.failed > 0) data.failed_count = { increment: inc.failed };
      if (Object.keys(data).length) {
        await prisma.campaign.update({ where: { id: cid }, data });
      }
    }

    // 7. Mark campaigns as completed if no more pending/queued recipients remain
    const affectedCampaignIds = [...new Set(pending.map(r => r.campaign_id))];
    for (const cid of affectedCampaignIds) {
      const remaining = await prisma.campaign_recipient.count({
        where: { campaign_id: cid, status: { in: ['pending', 'queued'] } },
      });
      if (remaining === 0) {
        await prisma.campaign.update({
          where: { id: cid, status: 'running' },
          data:  { status: 'completed' },
        });
        console.log(`[EmailWorker] Campaign ${cid} completed.`);
      }
    }

    console.log(`[EmailWorker] Processed ${pending.length} recipients.`);
  } catch (err) {
    console.error('[EmailWorker] Unexpected error:', err);
  } finally {
    _running = false;
  }
}

export function startEmailWorker() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EmailWorker] RESEND_API_KEY not set — email worker disabled.');
    return;
  }

  if (_timer) return; // Already started

  console.log(`[EmailWorker] Started (poll interval: ${POLL_MS}ms, batch: ${BATCH_SIZE}).`);
  _timer = setInterval(processBatch, POLL_MS);

  // Run one cycle immediately on startup to drain any leftover queued rows
  // (e.g., after a server restart mid-send)
  setImmediate(async () => {
    // Reset any rows stuck in 'queued' from a previous crashed process
    await prisma.campaign_recipient.updateMany({
      where: { status: 'queued' },
      data:  { status: 'pending' },
    }).catch(err => console.error('[EmailWorker] Reset stuck queued rows failed:', err));

    processBatch();
  });
}

export function stopEmailWorker() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[EmailWorker] Stopped.');
  }
}
