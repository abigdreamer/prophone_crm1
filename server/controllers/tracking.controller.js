import prisma from '../prisma.js';

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function trackOpen(req, res) {
  res.writeHead(200, {
    'Content-Type':  'image/gif',
    'Content-Length': PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma':        'no-cache',
    'Expires':       '0',
  });
  res.end(PIXEL);

  const { id } = req.params;
  try {
    const r = await prisma.campaign_recipient.findUnique({ where: { id }, select: { id: true, campaign_id: true, status: true, opened_at: true } });
    if (!r || r.opened_at) return; // already recorded
    await prisma.campaign_recipient.update({
      where: { id },
      data:  { opened_at: new Date(), status: ['sent','delivered'].includes(r.status) ? 'opened' : r.status },
    });
    await prisma.campaign.update({
      where: { id: r.campaign_id },
      data:  { opened_count: { increment: 1 } },
    }).catch(() => {});
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
    await prisma.campaign_recipient.update({
      where: { id },
      data:  { clicked_at: new Date(), status: 'clicked' },
    });
    await prisma.campaign.update({
      where: { id: r.campaign_id },
      data:  { clicked_count: { increment: 1 } },
    }).catch(() => {});
  } catch (err) {
    console.error('[Track] click error:', err.message);
  }
}
