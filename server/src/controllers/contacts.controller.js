import prisma from '../lib/prisma.js';
import { skipDups } from '../lib/db-compat.js';
import {
  VALID_POOLS, VALID_STAGES, VALID_STATUSES, VALID_ACCOUNT_SIZES,
  DASHBOARD_GROUPS, ACTIVITY_TYPE, ENTITY_TYPE,
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
    orderBy: { createdAt: 'asc' },
  });
}

async function fetchActivitiesBulk(entityIds) {
  if (!entityIds.length) return {};
  const rows = await prisma.activity.findMany({
    where: { entityType: ENTITY_TYPE.CONTACT, entityId: { in: entityIds } },
    orderBy: { createdAt: 'asc' },
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
    leadState: c.leadState ?? 'prospect',
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
    udfValues: c.udfValues ?? {},
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
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(a => ({ id: a.id, type: a.type, note: a.note, createdAt: a.createdAt, by: a.by })),
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

  // Full-text search — fields included are configurable via searchMethods param
  const search = req.query.search?.trim();
  if (search) {
    let sm = {};
    try { sm = req.query.searchMethods ? JSON.parse(req.query.searchMethods) : {}; } catch { /* ignore */ }

    const searchOr = [
      ...(sm.firstName !== false ? [{ firstName: { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.lastName  !== false ? [{ lastName:  { contains: search, mode: 'insensitive' } }] : []),
      // Legacy: if old settings saved "name: true" instead of firstName/lastName, honour it
      ...(sm.name === true && sm.firstName === undefined && sm.lastName === undefined ? [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.email   !== false ? [{ email:   { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.company !== false ? [{ company: { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.phone   !== false ? [{ phone:   { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.city    !== false ? [{ city:    { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.state   !== false ? [{ state:   { contains: search, mode: 'insensitive' } }] : []),
      ...(sm.address !== false ? [{ address: { contains: search, mode: 'insensitive' } }] : []),
    ];

    if (sm.udfs !== false) {
      try {
        const udfMatches = await prisma.$queryRaw`
          SELECT id FROM contacts
          WHERE LOWER(udf_values::text) LIKE ${`%${search.toLowerCase()}%`}
        `;
        if (udfMatches.length > 0) {
          searchOr.push({ id: { in: udfMatches.map(r => r.id) } });
        }
      } catch { /* silent — UDF search degrades gracefully */ }
    }

    if (searchOr.length > 0) where.OR = searchOr;
  }

  // Lifecycle stage filter (comma-separated list)
  const stagesParam = req.query.stages;
  if (stagesParam) {
    const stageList = stagesParam.split(',').filter(Boolean);
    if (stageList.length > 0) where.lifecycleStage = { in: stageList };
  }

  // Lead score range
  const scoreMin = parseInt(req.query.scoreMin);
  const scoreMax = parseInt(req.query.scoreMax);
  if (!isNaN(scoreMin) && scoreMin > 0)   where.leadScore = { ...where.leadScore, gte: scoreMin };
  if (!isNaN(scoreMax) && scoreMax < 100) where.leadScore = { ...where.leadScore, lte: scoreMax };

  // UDF text filters — case-insensitive via raw SQL so values like "towbook" match "Towbook"
  const udfFiltersParam = req.query.udfFilters;
  if (udfFiltersParam) {
    try {
      const udfFilters = JSON.parse(udfFiltersParam);
      for (const [key, val] of Object.entries(udfFilters)) {
        if (val === '' || val == null) continue;
        if (!/^udf_\d+$/.test(key)) continue; // guard against injection
        const pattern = `%${String(val).toLowerCase()}%`;
        const hits = await prisma.$queryRaw`
          SELECT id FROM contacts WHERE LOWER(udf_values->>${key}) LIKE ${pattern}
        `;
        if (!where.AND) where.AND = [];
        where.AND.push({ id: { in: hits.map(r => r.id) } });
      }
    } catch { /* ignore malformed JSON */ }
  }

  // Custom contact-field filters (admin-defined via CustomFilterOption)
  const customFiltersParam = req.query.customFilters;
  if (customFiltersParam) {
    try {
      const customFilters = JSON.parse(customFiltersParam);
      const ALLOWED = new Set([
        'email', 'phone', 'title', 'source', 'campaign', 'state', 'zip',
        'ownedBy', 'addedBy', 'accountSize', 'dispatcherSoftware',
        'trucks', 'contractValue', 'yearsInBusiness', 'serviceAreaMiles', 'leadScore',
      ]);
      for (const [field, val] of Object.entries(customFilters)) {
        if (!ALLOWED.has(field) || val === '' || val == null) continue;
        if (typeof val === 'object' && !Array.isArray(val)) {
          // Number range: { min, max }
          const range = {};
          if (val.min !== '' && val.min != null) range.gte = Number(val.min);
          if (val.max !== '' && val.max != null) range.lte = Number(val.max);
          if (Object.keys(range).length) where[field] = range;
        } else {
          where[field] = { contains: String(val), mode: 'insensitive' };
        }
      }
    } catch { /* ignore malformed JSON */ }
  }

  // Sort — central config; UDF and custom sorts detected by prefix
  const SORT_MAP = {
    recent:       { lastActivityAt: 'desc' },
    old:          { lastActivityAt: 'asc'  },
    score_desc:   { leadScore: 'desc' },
    score_asc:    { leadScore: 'asc'  },
    name_az:      { firstName: 'asc'  },
    name_za:      { firstName: 'desc' },
    company_az:   { company: 'asc'   },
    company_za:   { company: 'desc'  },
    lastname_az:  [{ lastName: 'asc'  }, { firstName: 'asc'  }],
    lastname_za:  [{ lastName: 'desc' }, { firstName: 'desc' }],
    firstname_az: [{ firstName: 'asc'  }, { lastName: 'asc'  }],
    firstname_za: [{ firstName: 'desc' }, { lastName: 'desc' }],
    city_az:      [{ city: 'asc'  }, { state: 'asc'  }],
    city_za:      [{ city: 'desc' }, { state: 'desc' }],
  };
  const CUSTOM_SORT_ALLOWED = new Set([
    'email', 'phone', 'title', 'source', 'campaign', 'state', 'zip',
    'ownedBy', 'addedBy', 'accountSize', 'dispatcherSoftware',
    'trucks', 'contractValue', 'yearsInBusiness', 'serviceAreaMiles', 'leadScore',
    'createdAt', 'lastActivityAt',
  ]);
  const sortBy = req.query.sortBy;
  let orderBy;
  if (sortBy?.startsWith('csort:')) {
    // format: csort:{field}:{dir}
    const [, field, dir] = sortBy.split(':');
    if (CUSTOM_SORT_ALLOWED.has(field) && ['asc', 'desc'].includes(dir)) {
      orderBy = { [field]: dir };
    } else {
      orderBy = { lastActivityAt: 'desc' };
    }
  } else if (sortBy?.startsWith('udf_') && (sortBy.endsWith('_az') || sortBy.endsWith('_za'))) {
    // Prisma can't ORDER BY a JSON path — fetch all matching rows, sort in memory, then slice
    const udfKey = sortBy.slice(0, -3); // e.g. "udf_11_az" → "udf_11"
    const dir    = sortBy.endsWith('_az') ? 1 : -1;
    const allRows = await prisma.contact.findMany({ where, orderBy: { lastActivityAt: 'desc' } });
    allRows.sort((a, b) => {
      const aVal = String(a.udfValues?.[udfKey] ?? '');
      const bVal = String(b.udfValues?.[udfKey] ?? '');
      return dir * aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    });
    const totalCount = allRows.length;
    const paginated  = allRows.slice(skip, skip + limit);
    const actMap     = await fetchActivitiesBulk(paginated.map(c => c.id));
    return res.json({
      data:    paginated.map(c => formatContact({ ...c, activities: actMap[c.id] || [] })),
      total:   totalCount,
      page,
      hasMore: skip + paginated.length < totalCount,
    });
  } else {
    orderBy = SORT_MAP[sortBy] || (status === STATUS.CANCELED ? { canceledAt: 'desc' } : { lastActivityAt: 'desc' });
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy, skip, take: limit }),
    prisma.contact.count({ where }),
  ]);

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
  if (!b.firstName && !b.company) return res.status(400).json({ error: 'firstName or company is required' });
  if (b.pool && !VALID_POOLS.includes(b.pool)) return res.status(400).json({ error: 'Invalid pool' });
  if (b.lifecycleStage && !VALID_STAGES.includes(b.lifecycleStage)) return res.status(400).json({ error: 'Invalid lifecycleStage' });
  if (b.status && !VALID_STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status' });

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
      leadState: b.leadState || 'prospect',
      leadScore: b.leadScore || 10,
      status: b.status || STATUS.ACTIVE,
      source: b.source || '',
      campaign: b.campaign || '',
      contractValue: parseInt(b.contractValue) || 0,
      accountSize: b.accountSize || '1-5',
      description: b.description || '',
      socialLinks: b.socialLinks || {},
      udfValues: b.udfValues || {},
      tags: b.tags || [],
      notes: b.notes || '',
      ownedBy: b.ownedBy || '',
      addedBy: b.addedBy || '',
      lastActivityAt: new Date(),
    },
  });

  const by = req.user?.name || req.user?.email || 'system';

  await prisma.activity.create({
    data: {
      entityType: ENTITY_TYPE.CONTACT,
      entityId:   contact.id,
      type: ACTIVITY_TYPE.CONTACT_CREATED,
      note: `Contact created manually by ${by}`,
      by,
    },
  });

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
      leadState: b.leadState ?? existing.leadState,
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
      udfValues: b.udfValues !== undefined ? b.udfValues : existing.udfValues,
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

  if (Object.keys(changes).length > 0) {
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
  const fullName = req.user?.name || '';
  const currentUserName = fullName.split(' ')[0] || req.user?.email || 'Unknown';

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

  // Return the first non-empty token from a delimiter-separated string.
  // Handles "a@x.com, b@y.com" → "a@x.com" and "555-1234 | 555-5678" → "555-1234".
  const firstToken = (raw, sep) =>
    String(raw ?? '').split(sep).map(v => v.trim()).find(Boolean) ?? '';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Coerce every cell to string first — Excel can produce numbers for
    // cells that look numeric (zip codes, company IDs, phone numbers, etc.)
    const s = f => String(r[f] ?? '').trim();

    // Normalize: if the field contains multiple values, keep only the first one
    const email = firstToken(s('email'), /[,|]/);
    const phone = firstToken(s('phone'), /[,|;]/);

    // Skip records that have no email address — cannot be contacted or de-duplicated
    if (!email) {
      invalid.push(i);
      errors.push({ row: i + 1, reason: 'Missing email address' });
      continue;
    }

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

  // Log a contact_imported activity for each newly inserted contact
  if (imported > 0) {
    const insertedEmails = toInsert.map(d => d.email).filter(Boolean);
    const newContacts = await prisma.contact.findMany({
      where: { pool, clientId, email: { in: insertedEmails } },
      select: { id: true },
    });
    if (newContacts.length) {
      await prisma.activity.createMany({
        data: newContacts.map(c => ({
          entityType: ENTITY_TYPE.CONTACT,
          entityId:   c.id,
          type:       ACTIVITY_TYPE.CONTACT_IMPORTED,
          note:       `Contact imported by ${currentUserName}`,
          by:         currentUserName,
        })),
        skipDuplicates: true,
      });
    }
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
    orderBy: { createdAt: 'desc' },
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

// ── Bulk score recalculation ──────────────────────────────────────────────────
// Recalculates leadScore for every contact using the current formula and
// saves the result. Run once after any formula change to fix stale scores.
async function recalculateAllScores(req, res) {
  const CHUNK = 500;
  let updated = 0;
  let cursor = undefined;

  for (;;) {
    const batch = await prisma.contact.findMany({
      take: CHUNK,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        firstName: true, lastName: true, email: true, phone: true,
        company: true, source: true, title: true, website: true, address: true,
        lifecycleStage: true, status: true, isCanceled: true, lastActivityAt: true,
      },
    });

    if (!batch.length) break;

    await Promise.all(
      batch.map(c =>
        prisma.contact.update({
          where: { id: c.id },
          data:  { leadScore: calculateLeadScore(c) },
        })
      )
    );

    updated += batch.length;
    cursor = batch[batch.length - 1].id;
  }

  res.json({ updated });
}

async function getContactUdfs(req, res) {
  const c = await prisma.contact.findUnique({ where: { id: req.params.id }, select: { udfValues: true } });
  if (!c) return res.status(404).json({ error: 'Contact not found' });
  res.json({ data: c.udfValues ?? {} });
}

async function updateContactUdfs(req, res) {
  const c = await prisma.contact.findUnique({ where: { id: req.params.id }, select: { id: true, udfValues: true } });
  if (!c) return res.status(404).json({ error: 'Contact not found' });
  // Strip any non-UDF keys (e.g. clientId sent from client)
  const values = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => /^udf_\d+$/.test(k))
  );
  const merged = { ...(c.udfValues ?? {}), ...values };
  await prisma.contact.update({ where: { id: req.params.id }, data: { udfValues: merged } });
  res.json({ data: merged });
}

export { listContacts, getContact, createContact, updateContact, deleteContact, getContactCounts, importContacts, listCanceledContacts, cancelContact, restoreContact, getContactClientActivities, getDashboardSummary, recalculateAllScores, getContactUdfs, updateContactUdfs };
