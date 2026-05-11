import prisma from '../lib/prisma.js';
import { skipDups } from '../lib/db-compat.js';
import {
  VALID_POOLS, VALID_STAGES, VALID_STATUSES, VALID_ACCOUNT_SIZES,
  DASHBOARD_GROUPS, ACTIVITY_TYPE, ACTION, ENTITY_TYPE,
  STAGE, STATUS, POOL,
  TRACKED_CONTACT_FIELDS,
} from '../constants/index.js';
import { logActivity } from '../lib/activityLogger.js';

function normaliseDomain(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

async function fetchActivities(entityId) {
  return prisma.activity.findMany({
    where: { entityType: ENTITY_TYPE.CONTACT, entityId },
    orderBy: { ts: 'asc' },
  });
}

async function fetchActivitiesBulk(entityIds) {
  if (!entityIds.length) return {};
  const rows = await prisma.activity.findMany({
    where: { entityType: ENTITY_TYPE.CONTACT, entityId: { in: entityIds } },
    orderBy: { ts: 'asc' },
  });
  const map = {};
  for (const r of rows) {
    if (!map[r.entityId]) map[r.entityId] = [];
    map[r.entityId].push(r);
  }
  return map;
}

function formatContact(c) {
  return {
    id: c.id,
    pool: c.pool,
    clientId: c.clientId,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    company: c.company,
    title: c.title,
    website: c.website,
    address: c.address,
    city: c.city,
    trucks: c.trucks,
    lifecycleStage: c.lifecycleStage,
    leadScore: c.leadScore,
    status: c.status,
    source: c.source,
    campaign: c.campaign,
    emailsSent: c.emailsSent,
    emailsOpened: c.emailsOpened,
    emailsClicked: c.emailsClicked,
    callsMade: c.callsMade,
    callsAnswered: c.callsAnswered,
    lastActivityAt: c.lastActivityAt,
    contractValue: c.contractValue,
    accountSize: c.accountSize,
    description: c.description,
    socialLinks: c.socialLinks ?? {},
    tags: c.tags,
    notes: c.notes,
    ownedBy: c.ownedBy,
    addedBy: c.addedBy,
    isCanceled: c.isCanceled,
    canceledAt: c.canceledAt,
    canceledBy: c.canceledBy,
    cancelReason: c.cancelReason,
    restoredAt: c.restoredAt,
    restoredBy: c.restoredBy,
    createdAt: c.createdAt,
    activities: (c.activities || [])
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map(a => ({ id: a.id, type: a.type, note: a.note, ts: a.ts, by: a.by })),
  };
}

async function listContacts(req, res) {
  const { pool, clientId, status } = req.query;

  if (pool && !VALID_POOLS.includes(pool)) {
    return res.status(400).json({ error: 'Invalid pool' });
  }

  const where = {};

  if (pool) where.pool = pool;
  if (pool === 'client' && clientId) where.clientId = clientId;

  const isAllStatus = !status || status === 'all';

  if (!isAllStatus) {
    const isCanceled = status === STATUS.CANCELED;

    if (isCanceled) {
      where.isCanceled = true;
    } else if (VALID_STATUSES.includes(status)) {
      where.status = status;
      where.isCanceled = false;
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: status === STATUS.CANCELED
      ? { canceledAt: 'desc' }
      : { lastActivityAt: 'desc' },
  });

  const actMap = await fetchActivitiesBulk(contacts.map(c => c.id));
  res.json(contacts.map(c => formatContact({ ...c, activities: actMap[c.id] || [] })));
}

async function getContact(req, res) {
  const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const activities = await fetchActivities(contact.id);
  res.json(formatContact({ ...contact, activities }));
}

async function createContact(req, res) {
  const b = req.body;
  if (!b.firstName) return res.status(400).json({ error: 'firstName is required' });
  if (b.pool && !VALID_POOLS.includes(b.pool)) return res.status(400).json({ error: 'Invalid pool' });
  if (b.lifecycleStage && !VALID_STAGES.includes(b.lifecycleStage)) return res.status(400).json({ error: 'Invalid lifecycleStage' });
  if (b.status && !VALID_STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status' });
  if (b.accountSize && !VALID_ACCOUNT_SIZES.includes(b.accountSize)) return res.status(400).json({ error: 'Invalid accountSize' });

  const contact = await prisma.contact.create({
    data: {
      pool: b.pool || POOL.PROSPECT,
      clientId: b.clientId || null,
      firstName: b.firstName,
      lastName: b.lastName || '',
      email: b.email || '',
      phone: b.phone || '',
      company: b.company || '',
      title: b.title || '',
      website: b.website || '',
      address: (b.address || '').trim(),
      trucks: parseInt(b.trucks) || 0,
      lifecycleStage: b.lifecycleStage || STAGE.NEW,
      leadScore: b.leadScore || 10,
      status: b.status || STATUS.ACTIVE,
      source: b.source || '',
      campaign: b.campaign || '',
      contractValue: parseInt(b.contractValue) || 0,
      accountSize: b.accountSize || '1-5',
      description: b.description || '',
      socialLinks: b.socialLinks || {},
      tags: b.tags || [],
      notes: b.notes || '',
      ownedBy: b.ownedBy || '',
      addedBy: b.addedBy || '',
      lastActivityAt: new Date(),
    },
  });

  const by = req.user?.name || req.user?.email || 'system';

  if (b.activities && b.activities.length > 0) {
    await prisma.activity.createMany({
      data: b.activities.map(a => ({
        entityType: ENTITY_TYPE.CONTACT,
        entityId:   contact.id,
        type: a.type,
        note: a.note || '',
        by: a.by || '',
        ts: a.ts ? new Date(a.ts) : new Date(),
      })),
    });
  }

  logActivity(ENTITY_TYPE.CONTACT, contact.id, ACTION.CREATE, `Contact created: ${contact.firstName} ${contact.lastName}`.trim(), by);

  const activities = await fetchActivities(contact.id);
  res.status(201).json(formatContact({ ...contact, activities }));
}

async function updateContact(req, res) {
  const { id } = req.params;
  const b = req.body;

  if (b.pool && !VALID_POOLS.includes(b.pool)) {
    return res.status(400).json({ error: "Invalid pool" });
  }

  if (b.lifecycleStage && !VALID_STAGES.includes(b.lifecycleStage)) {
    return res.status(400).json({ error: "Invalid lifecycleStage" });
  }

  if (b.status && !VALID_STATUSES.includes(b.status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (b.accountSize && !VALID_ACCOUNT_SIZES.includes(b.accountSize)) {
    return res.status(400).json({ error: "Invalid accountSize" });
  }

  const existing = await prisma.contact.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const isBecomingCustomer =
    b.lifecycleStage === STAGE.CUSTOMER &&
    existing.lifecycleStage !== STAGE.CUSTOMER;

  if (isBecomingCustomer && !["admin", "manager"].includes(req.user?.role)) {
    return res.status(403).json({
      error: "Only managers and admins can turn a lead into a customer",
    });
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      firstName: b.firstName ?? existing.firstName,
      lastName: b.lastName ?? existing.lastName,
      email: b.email ?? existing.email,
      phone: b.phone ?? existing.phone,
      company: b.company ?? existing.company,
      title: b.title ?? existing.title,
      website: b.website ?? existing.website,
      address: b.address !== undefined ? b.address.trim() : existing.address,
      trucks: b.trucks !== undefined ? parseInt(b.trucks) : existing.trucks,
      lifecycleStage: b.lifecycleStage ?? existing.lifecycleStage,
      leadScore: b.leadScore ?? existing.leadScore,
      status: b.status ?? existing.status,
      source: b.source ?? existing.source,
      campaign: b.campaign ?? existing.campaign,
      contractValue:
        b.contractValue !== undefined
          ? parseInt(b.contractValue)
          : existing.contractValue,
      accountSize: b.accountSize ?? existing.accountSize,
      description: b.description !== undefined ? b.description : existing.description,
      socialLinks: b.socialLinks !== undefined ? b.socialLinks : existing.socialLinks,
      tags: b.tags ?? existing.tags,
      notes: b.notes ?? existing.notes,
      ownedBy: b.ownedBy ?? existing.ownedBy,
      lastActivityAt: new Date(),
    },
  });

  const changes = {};
  for (const field of TRACKED_CONTACT_FIELDS) {
    if (b[field] === undefined) continue;

    const oldVal = String(existing[field] ?? "");
    const newVal = String(b[field] ?? "");

    if (oldVal !== newVal) {
      changes[field] = { from: existing[field], to: b[field] };
    }
  }

  const by = req.user?.name || req.user?.email || "system";

  if (changes.lifecycleStage !== undefined) {
    logActivity(
      ENTITY_TYPE.CONTACT, id, ACTIVITY_TYPE.STAGE_CHANGED,
      `Stage: ${existing.lifecycleStage} → ${b.lifecycleStage}`,
      by,
    );
  } else if (Object.keys(changes).length > 0) {
    logActivity(ENTITY_TYPE.CONTACT, id, ACTIVITY_TYPE.LEAD_UPDATED, 'Contact updated', by);
  }

  const activities = await fetchActivities(id);
  res.json(formatContact({ ...updated, activities }));
}

async function deleteContact(req, res) {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  await prisma.activity.deleteMany({ where: { entityType: ENTITY_TYPE.CONTACT, entityId: req.params.id } });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

async function getContactCounts(req, res) {
  const rows = await prisma.contact.groupBy({
    by: ['pool', 'clientId'],
    _count: { _all: true },
  });

  let prospect = 0;
  const clients = {};
  for (const row of rows) {
    if (row.pool === 'prospect') {
      prospect += row._count._all;
    } else if (row.pool === 'client' && row.clientId) {
      clients[row.clientId] = (clients[row.clientId] || 0) + row._count._all;
    }
  }

  res.json({ prospect, clients });
}

// ── Bulk import ───────────────────────────────────────────────────────────────
const CHUNK = 500;

async function importContacts(req, res) {
  const { rows, clientId, pool = 'client', duplicateAction = 'ignore' } = req.body;
  const currentUserName = req.user?.name || 'import';

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows array is required' });
  }
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  // Pre-fetch existing emails for this client to speed up duplicate check
  const existingRecords = await prisma.contact.findMany({
    where: { pool, clientId },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(
    existingRecords.filter(r => r.email).map(r => [r.email.toLowerCase().trim(), r.id])
  );

  const toInsert = [];
  const toUpdate = [];
  const invalid = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Coerce every cell to string first — Excel can produce numbers for
    // cells that look numeric (zip codes, company IDs, phone numbers, etc.)
    const s = f => String(r[f] ?? '').trim();

    const email = s('email');
    const phone = s('phone');

    // if (!email && !phone) {
    //   invalid.push(i);
    //   errors.push({ row: i + 1, reason: 'Missing both email and phone' });
    //   continue;
    // }

    let firstName = s('firstName') || s('first_name');
    let lastName = s('lastName') || s('last_name');

    // Split "Full Name" into first + last if firstName is missing
    if (!firstName && (s('fullName'))) {
      const full = s('fullName');
      const space = full.indexOf(' ');
      if (space !== -1) {
        firstName = full.slice(0, space);
        lastName = lastName || full.slice(space + 1);
      } else {
        firstName = full;
      }
    }

    // if (!firstName) {
    //   invalid.push(i);
    //   errors.push({ row: i + 1, reason: 'Missing first name' });
    //   continue;
    // }

    const address = s('address');

    const socialLinks = {};
    for (const k of ['facebook','instagram','linkedin','twitter','youtube','yelp','pinterest','tiktok']) {
      const v = s(k) || s(`social_${k}`) || String(r.socialLinks?.[k] ?? '').trim();
      if (v) socialLinks[k] = v;
    }

    const data = {
      pool,
      clientId,
      firstName,
      lastName,
      email,
      phone,
      company: s('company'),
      title: s('title'),
      website: normaliseDomain(s('website')),
      address,
      description: s('description'),
      socialLinks,
      trucks: parseInt(r.trucks) || 0,
      contractValue: parseInt(r.contractValue) || 0,
      lifecycleStage: VALID_STAGES.includes(r.lifecycleStage) ? r.lifecycleStage : STAGE.NEW,
      leadScore: 10,
      status: STATUS.ACTIVE,
      source: s('source'),
      notes: s('notes'),
      ownedBy: s('ownedBy') || currentUserName,
      addedBy: s('addedBy') || currentUserName,
      tags: [],
      lastActivityAt: new Date(),
    };

    const key = email ? email.toLowerCase() : null;
    if (key && existingByEmail.has(key)) {
      if (duplicateAction === 'update') {
        toUpdate.push({ id: existingByEmail.get(key), data });
      }
      // duplicateAction === 'ignore': skip silently
      continue;
    }

    toInsert.push(data);
    if (key) existingByEmail.set(key, '__pending__');
  }

  let imported = 0;
  let updated = 0;

  // Chunked inserts
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    await prisma.contact.createMany({ data: chunk, ...skipDups });
    imported += chunk.length;
  }

  // Chunked updates
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(({ id, data }) =>
        prisma.contact.update({ where: { id }, data })
      )
    );
    updated += chunk.length;
  }

  const skipped = rows.length - imported - updated - invalid.length;

  res.json({
    total: rows.length,
    imported,
    updated,
    skipped: skipped + invalid.length,
    invalid: invalid.length,
    errors,
  });
}

async function getContactClientActivities(req, res) {
  const activities = await prisma.activity.findMany({
    where: { entityType: ENTITY_TYPE.CONTACT, entityId: req.params.id },
    orderBy: { ts: 'desc' },
  });
  res.json(activities);
}

async function listCanceledContacts(req, res) {
  const { pool, clientId } = req.query;
  if (pool && !VALID_POOLS.includes(pool)) return res.status(400).json({ error: 'Invalid pool' });

  const where = { isCanceled: true };
  if (pool) where.pool = pool;
  if (pool === 'client' && clientId) where.clientId = clientId;

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { canceledAt: 'desc' },
  });

  const actMap = await fetchActivitiesBulk(contacts.map(c => c.id));
  res.json(contacts.map(c => formatContact({ ...c, activities: actMap[c.id] || [] })));
}

async function cancelContact(req, res) {
  const { id } = req.params;
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  if (existing.isCanceled) return res.status(400).json({ error: 'Contact is already canceled' });

  const by = req.user?.name || req.user?.email || 'system';
  const cancelReason = (req.body?.cancelReason || '').trim();

  const [updated] = await prisma.$transaction([
    prisma.contact.update({
      where: { id },
      data: { isCanceled: true, status: STATUS.CANCELED, canceledAt: new Date(), canceledBy: by, cancelReason },
    }),
    prisma.activity.create({
      data: {
        entityType: ENTITY_TYPE.CONTACT,
        entityId:   id,
        type: ACTIVITY_TYPE.CANCEL_CONTACT,
        note: cancelReason ? `Contact canceled — ${cancelReason}` : 'Contact canceled',
        by,
      },
    }),
  ]);

  const activities = await fetchActivities(id);
  res.json(formatContact({ ...updated, activities }));
}

async function restoreContact(req, res) {
  const { id } = req.params;
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  if (!existing.isCanceled) return res.status(400).json({ error: 'Contact is not canceled' });

  const by = req.user?.name || req.user?.email || 'system';

  const [updated] = await prisma.$transaction([
    prisma.contact.update({
      where: { id },
      data: { isCanceled: false, status: STATUS.ACTIVE, restoredAt: new Date(), restoredBy: by },
    }),
    prisma.activity.create({
      data: { entityType: ENTITY_TYPE.CONTACT, entityId: id, type: ACTIVITY_TYPE.UNCANCEL_CONTACT, note: 'Contact restored', by },
    }),
  ]);

  const activities = await fetchActivities(id);
  res.json(formatContact({ ...updated, activities }));
}

async function getDashboardSummary(req, res) {
  const { pool, clientId } = req.query;
  if (pool && !VALID_POOLS.includes(pool)) return res.status(400).json({ error: 'Invalid pool' });

  const where = { isCanceled: false };
  if (pool) where.pool = pool;
  if (pool === 'client' && clientId) where.clientId = clientId;

  const [stageCounts, recentContacts] = await Promise.all([
    prisma.contact.groupBy({ by: ['lifecycleStage'], where, _count: { _all: true } }),
    prisma.contact.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      take: 3,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, company: true,
        lifecycleStage: true, lastActivityAt: true, leadScore: true,
      },
    }),
  ]);

  const stageMap = {};
  for (const row of stageCounts) stageMap[row.lifecycleStage] = row._count._all;

  const get = (...stages) => stages.reduce((sum, s) => sum + (stageMap[s] || 0), 0);

  const counts = {
    prospects: get(...DASHBOARD_GROUPS.prospects),
    leads: get(...DASHBOARD_GROUPS.leads),
    warm: get(...DASHBOARD_GROUPS.warm),
    hot: get(...DASHBOARD_GROUPS.hot),
    customer: get(...DASHBOARD_GROUPS.customer),
    backburner: 0,
    lost: get(...DASHBOARD_GROUPS.lost),
  };

  res.json({ counts, recentContacts });
}

export { listContacts, getContact, createContact, updateContact, deleteContact, getContactCounts, importContacts, listCanceledContacts, cancelContact, restoreContact, getContactClientActivities, getDashboardSummary };
