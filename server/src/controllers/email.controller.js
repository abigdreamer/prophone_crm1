import prisma from '../lib/prisma.js';
import { verifyUnsubToken } from '../services/email.js';
import * as repo from '../repositories/campaignRepository.js';
import { tracking } from '../config/tracking.js';

const UNSUB_SECRET = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';

async function withRetry(fn, maxRetries = tracking.maxRetries, delayMs = tracking.retryDelayMs) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export async function trackOpen(req, res) {
  const { recipientId } = req.query;
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(PIXEL);
  if (recipientId) {
    withRetry(() => repo.applyTrackingEvent(recipientId, 'opened'))
      .catch(err => console.error('[trackOpen] failed after retries:', err.message));
  }
}

export async function trackClick(req, res) {
  const { recipientId, url } = req.query;
  if (recipientId) {
    withRetry(() => repo.applyTrackingEvent(recipientId, 'clicked'))
      .catch(err => console.error('[trackClick] failed after retries:', err.message));
  }
  // req.query values are already URL-decoded by Express — do NOT call
  // decodeURIComponent again or percent-encoded chars in the destination
  // URL (e.g. %20 in a path) will be decoded a second time and break the redirect.
  const destination = url || '/';
  try {
    const parsed = new URL(destination);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    res.redirect(302, destination);
  } catch {
    res.redirect(302, '/');
  }
}

export async function handleUnsubscribe(req, res) {
  const { rid, tok } = req.query;

  if (!rid || !tok || !verifyUnsubToken(rid, tok, UNSUB_SECRET)) {
    return res.status(400).send(unsubPage('Invalid or expired unsubscribe link.', false));
  }

  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where:  { id: rid },
      select: { id: true, campaignId: true, status: true, contactId: true },
    });

    if (!recipient) {
      return res.status(404).send(unsubPage('Recipient not found.', false));
    }

    // Mark recipient as unsubscribed
    await Promise.all([
      prisma.campaignRecipient.update({
        where: { id: rid },
        data:  { status: 'unsubscribed' },
      }),
      prisma.campaign.update({
        where: { id: recipient.campaignId },
        data:  { unsubscribedCount: { increment: 1 } },
      }),
    ]);

    res.send(unsubPage('You have been unsubscribed successfully.', true));
  } catch (err) {
    console.error('[handleUnsubscribe]', err);
    res.status(500).send(unsubPage('Something went wrong. Please try again.', false));
  }
}

// One-click POST handler (RFC 8058 List-Unsubscribe-Post)
export async function handleUnsubscribePost(req, res) {
  const { rid, tok } = req.query;
  if (!rid || !tok || !verifyUnsubToken(rid, tok, UNSUB_SECRET)) {
    return res.status(400).json({ error: 'invalid token' });
  }
  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where:  { id: rid },
      select: { id: true, campaignId: true },
    });
    if (!recipient) return res.status(404).json({ error: 'not found' });

    await Promise.all([
      prisma.campaignRecipient.update({ where: { id: rid }, data: { status: 'unsubscribed' } }),
      prisma.campaign.update({ where: { id: recipient.campaignId }, data: { unsubscribedCount: { increment: 1 } } }),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server error' });
  }
}

function unsubPage(message, success) {
  const color = success ? '#15803d' : '#b91c1c';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${success ? 'Unsubscribed' : 'Error'}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:Arial,sans-serif;background:#f4f4f4;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.box{background:#fff;border-radius:10px;padding:40px 48px;max-width:400px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.10);}
h2{color:${color};margin:0 0 12px;}p{color:#6b7280;margin:0;font-size:14px;}</style>
</head><body><div class="box"><h2>${success ? '✓ Unsubscribed' : '⚠ Error'}</h2><p>${message}</p></div></body></html>`;
}
