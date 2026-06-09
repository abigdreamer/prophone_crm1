import prisma from '../lib/prisma.js';
import { generateCommentDraft } from '../services/claudeService.js';

// ── Monitors ──────────────────────────────────────────────────────────────

export async function listMonitors(req, res) {
  const clientId = req.query.clientId;
  const where = clientId ? { clientId } : {};
  const monitors = await prisma.redditMonitor.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(monitors);
}

export async function createMonitor(req, res) {
  const { clientId, subreddit, keywords, pollIntervalSec } = req.body;
  if (!clientId || !subreddit || !keywords?.length) {
    return res.status(400).json({ error: 'clientId, subreddit, and keywords are required' });
  }
  const cleanSub = subreddit.replace(/^r\//, '').trim();
  if (/\s/.test(cleanSub)) {
    return res.status(400).json({ error: 'Subreddit name cannot contain spaces. Enter one subreddit at a time (e.g. "trucking", not "tow truck software").' });
  }
  const monitor = await prisma.redditMonitor.create({
    data: {
      clientId,
      subreddit: cleanSub,
      keywords,
      pollIntervalSec: pollIntervalSec || 60,
    },
  });
  res.status(201).json(monitor);
}

export async function updateMonitor(req, res) {
  const { id } = req.params;
  const { subreddit, keywords, isActive, pollIntervalSec } = req.body;
  const data = {};
  if (subreddit !== undefined) data.subreddit = subreddit.replace(/^r\//, '').trim();
  if (keywords !== undefined) data.keywords = keywords;
  if (isActive !== undefined) data.isActive = isActive;
  if (pollIntervalSec !== undefined) data.pollIntervalSec = pollIntervalSec;

  const monitor = await prisma.redditMonitor.update({ where: { id }, data });
  res.json(monitor);
}

export async function deleteMonitor(req, res) {
  const { id } = req.params;
  await prisma.redditMonitor.delete({ where: { id } });
  res.json({ success: true });
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function listPosts(req, res) {
  const { clientId, status, monitorId, filterIds, limit = '50', offset = '0' } = req.query;
  const where = {};
  if (clientId) where.clientId = clientId;
  if (status && status !== 'all') where.status = status;
  if (monitorId) where.monitorId = monitorId;

  // Apply saved filters (OR logic)
  if (filterIds) {
    const ids = filterIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      const filters = await prisma.redditPostFilter.findMany({ where: { id: { in: ids } } });
      const orConditions = [];
      for (const f of filters) {
        const cond = {};
        if (f.keywords && f.keywords.length > 0) {
          cond.OR = f.keywords.map(kw => ({
            OR: [
              { title: { contains: kw, mode: 'insensitive' } },
              { body: { contains: kw, mode: 'insensitive' } },
              { matchedKeywords: { has: kw } },
            ],
          }));
        }
        const dateRange = resolveDateRange(f.datePreset, f.dateFrom, f.dateTo);
        if (dateRange) cond.redditCreatedAt = dateRange;
        if (Object.keys(cond).length > 0) orConditions.push(cond);
      }
      if (orConditions.length > 0) {
        where.AND = [...(where.AND || []), { OR: orConditions }];
      }
    }
  }

  const [posts, total] = await Promise.all([
    prisma.redditPost.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: { monitor: { select: { subreddit: true, keywords: true } } },
    }),
    prisma.redditPost.count({ where }),
  ]);

  res.json({ posts, total });
}

export async function generateDraft(req, res) {
  const { id } = req.params;
  const post = await prisma.redditPost.findUnique({ where: { id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const client = await prisma.client.findUnique({ where: { id: post.clientId } });
  const draft = await generateCommentDraft(post, {
    companyName: client?.name || 'ProPhone',
    industry: client?.industry || 'towing/roadside assistance',
  });

  const updated = await prisma.redditPost.update({
    where: { id },
    data: {
      aiDraft: draft,
      status: 'drafted',
      draftedAt: new Date(),
    },
  });

  await prisma.redditPostEvent.create({
    data: { postId: id, event: 'draft_generated' },
  });

  res.json(updated);
}

export async function updatePost(req, res) {
  const { id } = req.params;
  const { status, postedComment } = req.body;
  const data = {};

  if (status === 'posted') {
    data.status = 'posted';
    data.postedAt = new Date();
    if (postedComment) data.postedComment = postedComment;
  } else if (status === 'dismissed') {
    data.status = 'dismissed';
    data.dismissedAt = new Date();
  } else if (status) {
    data.status = status;
  }

  const updated = await prisma.redditPost.update({ where: { id }, data });

  if (status === 'posted' || status === 'dismissed') {
    await prisma.redditPostEvent.create({
      data: { postId: id, event: status },
    });
  }

  res.json(updated);
}

// ── Filters ───────────────────────────────────────────────────────────────

function resolveDateRange(preset, from, to) {
  if (preset === 'custom') {
    return {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const now = new Date();
  const ranges = {
    last_week: 7,
    last_month: 30,
    last_year: 365,
  };
  const days = ranges[preset];
  if (!days) return null;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { gte: start, lte: now };
}

export async function listFilters(req, res) {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  const filters = await prisma.redditPostFilter.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(filters);
}

export async function createFilter(req, res) {
  const { clientId, name, keywords, datePreset, dateFrom, dateTo } = req.body;
  if (!clientId || !name) return res.status(400).json({ error: 'clientId and name are required' });
  const filter = await prisma.redditPostFilter.create({
    data: {
      clientId,
      name,
      keywords: keywords || [],
      datePreset: datePreset || null,
      dateFrom: dateFrom ? new Date(dateFrom) : null,
      dateTo: dateTo ? new Date(dateTo) : null,
    },
  });
  res.status(201).json(filter);
}

export async function updateFilter(req, res) {
  const { id } = req.params;
  const { name, keywords, datePreset, dateFrom, dateTo } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (keywords !== undefined) data.keywords = keywords;
  if (datePreset !== undefined) data.datePreset = datePreset || null;
  if (dateFrom !== undefined) data.dateFrom = dateFrom ? new Date(dateFrom) : null;
  if (dateTo !== undefined) data.dateTo = dateTo ? new Date(dateTo) : null;
  const filter = await prisma.redditPostFilter.update({ where: { id }, data });
  res.json(filter);
}

export async function deleteFilter(req, res) {
  const { id } = req.params;
  await prisma.redditPostFilter.delete({ where: { id } });
  res.json({ success: true });
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function getStats(req, res) {
  const { clientId } = req.query;
  const where = clientId ? { clientId } : {};

  const [monitors, totalPosts, drafted, posted] = await Promise.all([
    prisma.redditMonitor.count({ where: { ...where, isActive: true } }),
    prisma.redditPost.count({ where }),
    prisma.redditPost.count({ where: { ...where, status: 'drafted' } }),
    prisma.redditPost.count({ where: { ...where, status: 'posted' } }),
  ]);

  res.json({
    activeMonitors: monitors,
    totalPosts,
    draftsReady: drafted,
    posted,
  });
}
