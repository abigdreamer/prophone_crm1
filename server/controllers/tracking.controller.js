import prisma from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Resend's domain-level click_tracking and open_tracking MUST be
// turned OFF in your Resend dashboard (Domains → Configuration tab) for this
// custom tracking to work correctly. Leaving Resend tracking ON causes double-
// wrapping: Resend would re-wrap the already-rewritten tracking URLs, breaking
// all redirects.
// ─────────────────────────────────────────────────────────────────────────────

// 1×1 transparent GIF
const GIF_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// 1×1 transparent PNG
const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

// ── Legacy endpoints (path-param style, /api/track) ───────────────────────────

export async function trackOpen(req, res) {
  res.writeHead(200, {
    'Content-Type':   'image/gif',
    'Content-Length': GIF_PIXEL.length,
    'Cache-Control':  'no-store, no-cache, must-revalidate',
    'Pragma':         'no-cache',
    'Expires':        '0',
  });
  res.end(GIF_PIXEL);

  const { id } = req.params;
  try {
    const r = await prisma.campaign_recipient.findUnique({
      where: { id }, select: { id: true, campaign_id: true, status: true, opened_at: true },
    });
    if (!r || r.opened_at) return;
    await prisma.campaign_recipient.update({
      where: { id },
      data:  { opened_at: new Date(), status: ['sent', 'delivered'].includes(r.status) ? 'opened' : r.status },
    });
    await prisma.campaign.update({ where: { id: r.campaign_id }, data: { opened_count: { increment: 1 } } }).catch(() => {});
  } catch (err) {
    console.error('[Track] open error:', err.message);
  }
}

export async function trackClick(req, res) {
  const { id } = req.params;
  const target  = req.query.u;
  if (!target) return res.status(400).send('Missing url');

  res.redirect(302, target);

  try {
    const r = await prisma.campaign_recipient.findUnique({
      where: { id }, select: { id: true, campaign_id: true, status: true, clicked_at: true },
    });
    if (!r || r.clicked_at) return;
    await prisma.campaign_recipient.update({ where: { id }, data: { clicked_at: new Date(), status: 'clicked' } });
    await prisma.campaign.update({ where: { id: r.campaign_id }, data: { clicked_count: { increment: 1 } } }).catch(() => {});
  } catch (err) {
    console.error('[Track] click error:', err.message);
  }
}

// ── New endpoints (query-param style, /api/email/track) ───────────────────────

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

export async function trackEmailOpen(req, res) {
  // Respond immediately — never block the email client
  res.writeHead(200, {
    'Content-Type':   'image/png',
    'Content-Length': PNG_PIXEL.length,
    'Cache-Control':  'no-store, no-cache, must-revalidate',
    'Pragma':         'no-cache',
    'Expires':        '0',
  });
  res.end(PNG_PIXEL);

  const { campaignId, recipientId } = req.query;
  if (!campaignId || !recipientId) return;

  (async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where:  { id: recipientId },
        select: { id: true, campaign_id: true, status: true, opened_at: true },
      });
      if (!r) return;

      const ua        = req.headers['user-agent'] ?? '';
      const ip        = getClientIp(req);
      const isFirst   = !r.opened_at;

      // Log every open to email_events
      await prisma.email_event.create({
        data: {
          campaign_id:  campaignId,
          recipient_id: recipientId,
          event_type:   'open',
          user_agent:   ua,
          ip_address:   ip,
        },
      });

      // Also log to campaign_recipient_event for full history
      await prisma.campaign_recipient_event.create({
        data: {
          recipient_id: recipientId,
          campaign_id:  campaignId,
          event:        'opened',
          metadata:     { ip, userAgent: ua },
        },
      });

      if (isFirst) {
        await prisma.campaign_recipient.update({
          where: { id: recipientId },
          data:  { opened_at: new Date(), status: ['sent', 'delivered'].includes(r.status) ? 'opened' : r.status },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data:  { opened_count: { increment: 1 } },
        });
      }
    } catch (err) {
      console.error('[EmailTrack] open error:', err.message);
    }
  })();
}

export async function trackEmailClick(req, res) {
  const { campaignId, recipientId, url } = req.query;

  if (!campaignId || !recipientId || !url) {
    return res.status(400).send('Missing required params');
  }

  const decodedUrl = decodeURIComponent(url);
  if (!/^https?:\/\//i.test(decodedUrl)) {
    return res.status(400).send('Invalid url');
  }

  // Always redirect first — DB write must never delay the user
  res.redirect(302, decodedUrl);

  (async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where:  { id: recipientId },
        select: { id: true, campaign_id: true, status: true, clicked_at: true },
      });
      if (!r) return;

      const ua      = req.headers['user-agent'] ?? '';
      const ip      = getClientIp(req);
      const isFirst = !r.clicked_at;

      // Log every click to email_events (url stored per click)
      await prisma.email_event.create({
        data: {
          campaign_id:  campaignId,
          recipient_id: recipientId,
          event_type:   'click',
          url:          decodedUrl,
          user_agent:   ua,
          ip_address:   ip,
        },
      });

      // Also log to campaign_recipient_event for full history
      await prisma.campaign_recipient_event.create({
        data: {
          recipient_id: recipientId,
          campaign_id:  campaignId,
          event:        'clicked',
          metadata:     { ip, userAgent: ua, url: decodedUrl },
        },
      });

      if (isFirst) {
        await prisma.campaign_recipient.update({
          where: { id: recipientId },
          data:  { clicked_at: new Date(), status: 'clicked' },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data:  { clicked_count: { increment: 1 } },
        });
      }
    } catch (err) {
      console.error('[EmailTrack] click error:', err.message);
    }
  })();
}

// ── Stats helper ─────────────────────────────────────────────────────────────

/**
 * Returns open/click stats for a campaign from the email_events table.
 * @param {string} campaignId
 * @returns {{ opens: number, uniqueOpens: number, clicks: number, uniqueClicks: number, ctr: string }}
 */
export async function getCampaignTrackingStats(campaignId) {
  const [opens, clicks] = await Promise.all([
    prisma.email_event.findMany({
      where:  { campaign_id: campaignId, event_type: 'open' },
      select: { recipient_id: true },
    }),
    prisma.email_event.findMany({
      where:  { campaign_id: campaignId, event_type: 'click' },
      select: { recipient_id: true },
    }),
  ]);

  const uniqueOpens  = new Set(opens.map(e => e.recipient_id)).size;
  const uniqueClicks = new Set(clicks.map(e => e.recipient_id)).size;
  const ctr          = uniqueOpens > 0
    ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) + '%'
    : '0%';

  return {
    opens:        opens.length,
    uniqueOpens,
    clicks:       clicks.length,
    uniqueClicks,
    ctr,
  };
}
