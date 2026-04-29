import prisma from '../prisma.js';

// NOTE: Resend domain-level click_tracking and open_tracking MUST be OFF in
// your Resend dashboard (Domains → Configuration) — otherwise Resend re-wraps
// already-rewritten tracking URLs and all redirects break.

const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

// ── /api/email/track/open ─────────────────────────────────────────────────────

export async function trackEmailOpen(req, res) {
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

  setImmediate(async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where:  { id: recipientId },
        select: { id: true, campaign_id: true, status: true, opened_at: true },
      });
      if (!r) return;

      const ua      = req.headers['user-agent'] ?? '';
      const ip      = getClientIp(req);
      const isFirst = !r.opened_at;
      const now     = new Date();

      const writes = [
        prisma.email_event.create({
          data: { campaign_id: campaignId, recipient_id: recipientId, event_type: 'open', user_agent: ua, ip_address: ip },
        }),
        prisma.campaign_recipient_event.create({
          data: { recipient_id: recipientId, campaign_id: campaignId, event: 'opened', metadata: { ip, userAgent: ua } },
        }),
      ];

      if (isFirst) {
        writes.push(
          prisma.campaign_recipient.update({
            where: { id: recipientId },
            data:  { opened_at: now, status: ['sent', 'delivered'].includes(r.status) ? 'opened' : r.status },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data:  { opened_count: { increment: 1 } },
          }),
        );
      }

      await Promise.all(writes);
    } catch (err) {
      console.error('[Track] open error:', err.message);
    }
  });
}

// ── /api/email/track/click ────────────────────────────────────────────────────

export async function trackEmailClick(req, res) {
  const { campaignId, recipientId, url } = req.query;

  if (!campaignId || !recipientId || !url) {
    return res.status(400).send('Missing params');
  }

  const decodedUrl = decodeURIComponent(url);
  if (!/^https?:\/\//i.test(decodedUrl)) {
    return res.status(400).send('Invalid url');
  }

  res.redirect(302, decodedUrl);

  setImmediate(async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where:  { id: recipientId },
        select: { id: true, campaign_id: true, status: true, clicked_at: true, opened_at: true },
      });
      if (!r) return;

      const ua      = req.headers['user-agent'] ?? '';
      const ip      = getClientIp(req);
      const isFirst = !r.clicked_at;
      const now     = new Date();

      const writes = [
        prisma.email_event.create({
          data: { campaign_id: campaignId, recipient_id: recipientId, event_type: 'click', url: decodedUrl, user_agent: ua, ip_address: ip },
        }),
      ];

      if (isFirst) {
        const recipientData = { clicked_at: now, status: 'clicked' };
        const campaignData  = { clicked_count: { increment: 1 } };

        // A click always implies an open — record it if not already opened
        if (!r.opened_at) {
          recipientData.opened_at = now;
          campaignData.opened_count = { increment: 1 };
          writes.push(
            prisma.email_event.create({
              data: { campaign_id: campaignId, recipient_id: recipientId, event_type: 'open', user_agent: ua, ip_address: ip },
            }),
            prisma.campaign_recipient_event.create({
              data: { recipient_id: recipientId, campaign_id: campaignId, event: 'opened', metadata: { ip, userAgent: ua, implicit: true } },
            }),
          );
        }

        writes.push(
          prisma.campaign_recipient.update({
            where: { id: recipientId },
            data:  recipientData,
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data:  campaignData,
          }),
          prisma.campaign_recipient_event.create({
            data: { recipient_id: recipientId, campaign_id: campaignId, event: 'clicked', metadata: { url: decodedUrl, ip, userAgent: ua } },
          }),
        );
      }

      await Promise.all(writes);
    } catch (err) {
      console.error('[Track] click error:', err.message);
    }
  });
}

// ── Legacy endpoints (/api/track/o/:id  /api/track/c/:id) ────────────────────
// These handle tracking pixels/links embedded in emails sent before the new
// /api/email/track system was deployed.

const GIF_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

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
  setImmediate(async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where: { id }, select: { id: true, campaign_id: true, status: true, opened_at: true },
      });
      if (!r || r.opened_at) return;
      await Promise.all([
        prisma.campaign_recipient.update({
          where: { id },
          data:  { opened_at: new Date(), status: ['sent', 'delivered'].includes(r.status) ? 'opened' : r.status },
        }),
        prisma.campaign.update({ where: { id: r.campaign_id }, data: { opened_count: { increment: 1 } } }),
      ]);
    } catch (err) {
      console.error('[Track] legacy open error:', err.message);
    }
  });
}

export async function trackClick(req, res) {
  const { id } = req.params;
  const target  = req.query.u;
  if (!target) return res.status(400).send('Missing url');

  res.redirect(302, target);

  setImmediate(async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where: { id }, select: { id: true, campaign_id: true, status: true, clicked_at: true, opened_at: true },
      });
      if (!r || r.clicked_at) return;

      const recipientData = { clicked_at: new Date(), status: 'clicked' };
      const campaignData  = { clicked_count: { increment: 1 } };

      if (!r.opened_at) {
        recipientData.opened_at = new Date();
        campaignData.opened_count = { increment: 1 };
      }

      await Promise.all([
        prisma.campaign_recipient.update({ where: { id }, data: recipientData }),
        prisma.campaign.update({ where: { id: r.campaign_id }, data: campaignData }),
      ]);
    } catch (err) {
      console.error('[Track] legacy click error:', err.message);
    }
  });
}

// ── Stats helper ──────────────────────────────────────────────────────────────

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
  const ctr = uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) + '%' : '0%';

  return { opens: opens.length, uniqueOpens, clicks: clicks.length, uniqueClicks, ctr };
}
