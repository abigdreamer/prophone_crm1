import prisma from '../lib/prisma.js';
import * as campaignRepo from '../repositories/campaignRepository.js';

// 1x1 transparent GIF pixel
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/email/track/open?campaignId=X&recipientId=Y
 * Returns a 1x1 transparent GIF and records an open event.
 */
export const trackOpen = async (req, res) => {
  const { campaignId, recipientId } = req.query;

  // Always return the pixel, even if tracking fails
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  if (campaignId && recipientId) {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
        select: { id: true, campaignId: true, openedAt: true },
      });

      if (recipient && recipient.campaignId === campaignId && !recipient.openedAt) {
        await Promise.all([
          prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: { status: 'opened', openedAt: new Date() },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data: { openedCount: { increment: 1 } },
          }),
          campaignRepo.logEvent(recipientId, campaignId, 'opened'),
        ]);
      }
    } catch (err) {
      console.error('[trackOpen]', err.message);
    }
  }

  res.end(TRANSPARENT_GIF);
};

/**
 * GET /api/email/track/click?campaignId=X&recipientId=Y&url=ENCODED_URL
 * Records a click event and redirects to the original URL.
 */
export const trackClick = async (req, res) => {
  const { campaignId, recipientId, url } = req.query;
  const targetUrl = url || '/';

  if (campaignId && recipientId) {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
        select: { id: true, campaignId: true, clickedAt: true },
      });

      if (recipient && recipient.campaignId === campaignId && !recipient.clickedAt) {
        await Promise.all([
          prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: { status: 'clicked', clickedAt: new Date() },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data: { clickedCount: { increment: 1 } },
          }),
          campaignRepo.logEvent(recipientId, campaignId, 'clicked', { url: targetUrl }),
        ]);
      }
    } catch (err) {
      console.error('[trackClick]', err.message);
    }
  }

  res.redirect(targetUrl);
};

/**
 * GET /api/email/unsubscribe?campaignId=X&recipientId=Y
 * Marks the contact as unsubscribed and returns a confirmation page.
 */
export const unsubscribe = async (req, res) => {
  const { campaignId, recipientId } = req.query;

  let success = false;

  if (campaignId && recipientId) {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
        select: { id: true, campaignId: true, contactId: true },
      });

      if (recipient && recipient.campaignId === campaignId) {
        await Promise.all([
          // Mark contact as globally unsubscribed
          prisma.contact.update({
            where: { id: recipient.contactId },
            data: { isUnsubscribed: true },
          }),
          // Update recipient status
          prisma.campaignRecipient.update({
            where: { id: recipientId },
            data: { status: 'unsubscribed' },
          }),
          // Increment campaign unsubscribe count
          prisma.campaign.update({
            where: { id: campaignId },
            data: { unsubscribedCount: { increment: 1 } },
          }),
          campaignRepo.logEvent(recipientId, campaignId, 'unsubscribed'),
        ]);
        success = true;
      }
    } catch (err) {
      console.error('[unsubscribe]', err.message);
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f4f4f5; color: #18181b; }
    .card { background: #fff; border-radius: 12px; padding: 48px; max-width: 440px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #71717a; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    ${success
      ? '<h1>You\'ve been unsubscribed</h1><p>You will no longer receive marketing emails from us. This may take a few moments to take effect.</p>'
      : '<h1>Something went wrong</h1><p>We couldn\'t process your unsubscribe request. The link may be invalid or expired.</p>'
    }
  </div>
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
};
