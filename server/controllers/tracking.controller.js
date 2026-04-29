import prisma from '../prisma.js';

// 1×1 transparent GIF — kept for legacy /api/track/o/:id route
const GIF_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// 1×1 transparent PNG — used by new /email/track/open endpoint
const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

// ── Legacy endpoints (path-param style) ──────────────────────────────────────

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
    const r = await prisma.campaign_recipient.findUnique({ where: { id }, select: { id: true, campaign_id: true, status: true, opened_at: true } });
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
  const { id }  = req.params;
  const target  = req.query.u;
  if (!target) return res.status(400).send('Missing url');

  res.redirect(302, target);

  try {
    const r = await prisma.campaign_recipient.findUnique({ where: { id }, select: { id: true, campaign_id: true, status: true, clicked_at: true } });
    if (!r || r.clicked_at) return;
    await prisma.campaign_recipient.update({ where: { id }, data: { clicked_at: new Date(), status: 'clicked' } });
    await prisma.campaign.update({ where: { id: r.campaign_id }, data: { clicked_count: { increment: 1 } } }).catch(() => {});
  } catch (err) {
    console.error('[Track] click error:', err.message);
  }
}

// ── New endpoints (query-param style, with event logging) ────────────────────

export async function trackEmailOpen(req, res) {
  // Always respond immediately — DB work is fire-and-forget
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

      const isFirstOpen = !r.opened_at;

      // Always log the event (every open, not just first)
      await prisma.campaign_recipient_event.create({
        data: {
          recipient_id: recipientId,
          campaign_id:  campaignId,
          event:        'opened',
          metadata:     { ip: req.ip, userAgent: req.headers['user-agent'] ?? '' },
        },
      });

      if (isFirstOpen) {
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

  console.log('[EmailTrack/click] incoming —', { campaignId, recipientId, url: url?.slice(0, 80) });

  if (!campaignId || !recipientId || !url) {
    console.warn('[EmailTrack/click] 400 — missing params:', { campaignId: !!campaignId, recipientId: !!recipientId, url: !!url });
    return res.status(400).send('Missing required params');
  }

  const decodedUrl = decodeURIComponent(url);
  if (!/^https?:\/\//i.test(decodedUrl)) {
    console.warn('[EmailTrack/click] 400 — invalid url:', decodedUrl.slice(0, 80));
    return res.status(400).send('Invalid url');
  }

  // Always redirect first — never block the recipient on a DB error
  res.redirect(302, decodedUrl);
  console.log('[EmailTrack/click] 302 → redirected to', decodedUrl.slice(0, 80));

  (async () => {
    try {
      const r = await prisma.campaign_recipient.findUnique({
        where:  { id: recipientId },
        select: { id: true, campaign_id: true, status: true, clicked_at: true },
      });

      if (!r) {
        console.warn('[EmailTrack/click] recipient not found:', recipientId);
        return;
      }

      console.log('[EmailTrack/click] recipient found — status:', r.status, '| clicked_at:', r.clicked_at ?? 'null (first click)');

      const isFirstClick = !r.clicked_at;

      const event = await prisma.campaign_recipient_event.create({
        data: {
          recipient_id: recipientId,
          campaign_id:  campaignId,
          event:        'clicked',
          metadata:     { ip: req.ip, userAgent: req.headers['user-agent'] ?? '', url: decodedUrl },
        },
      });
      console.log('[EmailTrack/click] event logged — event.id:', event.id);

      if (isFirstClick) {
        await prisma.campaign_recipient.update({
          where: { id: recipientId },
          data:  { clicked_at: new Date(), status: 'clicked' },
        });
        console.log('[EmailTrack/click] campaign_recipient.clicked_at set');

        await prisma.campaign.update({
          where: { id: campaignId },
          data:  { clicked_count: { increment: 1 } },
        });
        console.log('[EmailTrack/click] campaign.clicked_count incremented');
      } else {
        console.log('[EmailTrack/click] repeat click — counts not incremented');
      }
    } catch (err) {
      console.error('[EmailTrack/click] DB error:', err.message, err.stack?.split('\n')[1]);
    }
  })();
}
