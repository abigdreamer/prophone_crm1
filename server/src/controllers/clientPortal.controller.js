import prisma from '../lib/prisma.js';

// All handlers in this controller read clientId exclusively from the JWT (req.clientUser.clientId)
// — never from query params — to enforce strict data isolation.

async function getDashboard(req, res) {
  const clientId = req.clientUser.clientId;

  const [
    totalLeads,
    activeLeads,
    campaignStats,
    recentActivities,
    leadsByStage,
  ] = await Promise.all([
    // Total contacts for this client
    prisma.contact.count({ where: { clientId, isCanceled: false } }),

    // Active contacts (active status)
    prisma.contact.count({ where: { clientId, isCanceled: false, status: 'active' } }),

    // Campaign aggregate stats
    prisma.campaign.aggregate({
      where: { clientId, isCanceled: false },
      _count: { id: true },
      _sum: { sentCount: true, openedCount: true, clickedCount: true },
    }),

    // Recent activities
    prisma.activity.findMany({
      where: {
        entityType: 'contact',
        entityId: { in: await prisma.contact.findMany({ where: { clientId }, select: { id: true } }).then(cs => cs.map(c => c.id)) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // Contacts grouped by lifecycle stage
    prisma.contact.groupBy({
      by: ['lifecycleStage'],
      where: { clientId, isCanceled: false },
      _count: { id: true },
    }),
  ]);

  const activeCampaigns = await prisma.campaign.count({
    where: { clientId, isCanceled: false, status: { in: ['sending', 'scheduled'] } },
  });

  res.json({
    totalLeads,
    activeLeads,
    activeCampaigns,
    campaigns: {
      total: campaignStats._count.id,
      sent: campaignStats._sum.sentCount || 0,
      opened: campaignStats._sum.openedCount || 0,
      clicked: campaignStats._sum.clickedCount || 0,
    },
    leadsByStage: leadsByStage.map(s => ({ stage: s.lifecycleStage, count: s._count.id })),
    recentActivity: recentActivities,
  });
}

async function getLeads(req, res) {
  const clientId = req.clientUser.clientId;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const stage = req.query.stage;
  const search = req.query.search;

  const where = { clientId, isCanceled: false };
  if (stage) where.lifecycleStage = stage;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        company: true, title: true, lifecycleStage: true, leadScore: true,
        status: true, source: true, campaign: true, lastActivityAt: true,
        createdAt: true, tags: true,
      },
    }),
    prisma.contact.count({ where }),
  ]);

  res.json({ data, total, page, limit, hasMore: skip + data.length < total });
}

async function getLead(req, res) {
  const clientId = req.clientUser.clientId;
  const { id } = req.params;

  const contact = await prisma.contact.findFirst({
    where: { id, clientId, isCanceled: false },
  });
  if (!contact) return res.status(404).json({ error: 'Lead not found' });

  const activities = await prisma.activity.findMany({
    where: { entityType: 'contact', entityId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ ...contact, activities });
}

async function getCampaigns(req, res) {
  const clientId = req.clientUser.clientId;

  const campaigns = await prisma.campaign.findMany({
    where: { clientId, isCanceled: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, type: true, status: true, subject: true,
      sentAt: true, completedAt: true, recipientsCount: true,
      sentCount: true, deliveredCount: true, openedCount: true,
      clickedCount: true, bouncedCount: true, createdAt: true,
    },
  });

  res.json(campaigns);
}

async function getCampaignDetail(req, res) {
  const clientId = req.clientUser.clientId;
  const { id } = req.params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, clientId, isCanceled: false },
    select: {
      id: true, name: true, type: true, status: true, subject: true,
      fromName: true, fromEmail: true, sentAt: true, completedAt: true,
      recipientsCount: true, sentCount: true, deliveredCount: true,
      openedCount: true, clickedCount: true, bouncedCount: true,
      unsubscribedCount: true, createdAt: true,
    },
  });

  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
}

async function getProfile(req, res) {
  const clientUser = await prisma.clientUser.findUnique({
    where: { id: req.clientUser.userId },
    include: { client: { select: { id: true, name: true, color: true, domain: true, industry: true, plan: true } } },
  });
  if (!clientUser) return res.status(404).json({ error: 'User not found' });
  const { password: _pw, ...safe } = clientUser;
  res.json(safe);
}

async function updateProfile(req, res) {
  const { name, email } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email || null;

  const updated = await prisma.clientUser.update({
    where: { id: req.clientUser.userId },
    data,
    select: { id: true, name: true, email: true, username: true, role: true, clientId: true },
  });
  res.json(updated);
}

export { getDashboard, getLeads, getLead, getCampaigns, getCampaignDetail, getProfile, updateProfile };
