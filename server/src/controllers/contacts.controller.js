import prisma from '../lib/prisma.js';
import { skipDups } from '../lib/db-compat.js';

const VALID_POOLS          = ['prospect', 'client'];
const VALID_STAGES         = ['new','contacted','engaged','demo_scheduled','demo_done','proposal_sent','negotiating','customer','lost','churned'];
const VALID_STATUSES       = ['active', 'inactive', 'pending'];
const VALID_ACCOUNT_SIZES  = ['1-5', '6-15', '16-50', '51-200', '200+'];

// Best-effort: extract city from a comma-separated address string.
// Prioritizes well-known US cities for better accuracy.
// Returns empty string if city cannot be determined with confidence.

function extractCity(address) {
  if (!address) return '';

  const parts = address
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  // Common well-known US cities
  const knownCities = new Set([
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Jose',
    'Austin',
    'Jacksonville',
    'Fort Worth',
    'Columbus',
    'Charlotte',
    'San Francisco',
    'Indianapolis',
    'Seattle',
    'Denver',
    'Washington',
    'Boston',
    'El Paso',
    'Nashville',
    'Detroit',
    'Oklahoma City',
    'Portland',
    'Las Vegas',
    'Memphis',
    'Louisville',
    'Baltimore',
    'Milwaukee',
    'Albuquerque',
    'Tucson',
    'Fresno',
    'Sacramento',
    'Mesa',
    'Atlanta',
    'Kansas City',
    'Colorado Springs',
    'Miami',
    'Raleigh',
    'Omaha',
    'Long Beach',
    'Virginia Beach',
    'Oakland',
    'Minneapolis',
    'Tulsa',
    'Arlington',
    'Tampa',
    'New Orleans',
    'Cleveland',
    'Honolulu',
    'Anaheim',
    'Lexington',
    'Stockton',
    'Corpus Christi',
    'Henderson',
    'Riverside',
    'Newark',
    'St. Louis',
    'Pittsburgh',
    'Cincinnati',
    'Anchorage',
    'Orlando',
    'Buffalo',
    'Plano',
    'Irvine'
  ]);

  const skip = [
    /^\d/, // street numbers / unit numbers
    /^(suite|ste|apt|unit|#|floor|fl|bldg|po\s*box)\b/i,
    /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/, // state code ± zip
    /^\d{5}(-\d{4})?$/, // zip code only
    /^USA$/i,
    /^United States$/i,
  ];

  // First: prioritize known cities
  for (const part of parts) {
    if (knownCities.has(part)) {
      return part;
    }
  }

  // Fallback: first valid non-skipped part
  for (const part of parts) {
    if (!skip.some(re => re.test(part))) {
      return part;
    }
  }

  return '';
}

function logClientActivity(entityId, action, performedBy, metadata = {}) {
  return prisma.clientActivity.create({
    data: { entityId, action, performedBy, metadata, ts: new Date() },
  });
}

function formatContact(c) {
  return {
    id:             c.id,
    pool:           c.pool,
    clientId:       c.clientId,
    firstName:      c.firstName,
    lastName:       c.lastName,
    email:          c.email,
    phone:          c.phone,
    company:        c.company,
    title:          c.title,
    website:        c.website,
    address:        c.address,
    city:           c.city,
    trucks:         c.trucks,
    lifecycleStage: c.lifecycleStage,
    leadScore:      c.leadScore,
    status:         c.status,
    source:         c.source,
    campaign:       c.campaign,
    emailsSent:     c.emailsSent,
    emailsOpened:   c.emailsOpened,
    emailsClicked:  c.emailsClicked,
    callsMade:      c.callsMade,
    callsAnswered:  c.callsAnswered,
    lastActivityAt: c.lastActivityAt,
    contractValue:  c.contractValue,
    accountSize:    c.accountSize,
    tags:           c.tags,
    notes:          c.notes,
    ownedBy:        c.ownedBy,
    addedBy:        c.addedBy,
    isCanceled:     c.isCanceled,
    canceledAt:     c.canceledAt,
    canceledBy:     c.canceledBy,
    cancelReason:   c.cancelReason,
    restoredAt:     c.restoredAt,
    restoredBy:     c.restoredBy,
    createdAt:      c.createdAt,
    activities: (c.activities || [])
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map(a => ({ id: a.id, type: a.type, note: a.note, ts: a.ts, by: a.by })),
  };
}

async function listContacts(req, res) {
  const { pool, clientId } = req.query;
  if (pool && !VALID_POOLS.includes(pool)) return res.status(400).json({ error: 'Invalid pool' });

  const where = { isCanceled: false };
  if (pool) where.pool = pool;
  if (pool === 'client' && clientId) where.clientId = clientId;

  const contacts = await prisma.contact.findMany({
    where,
    include: { activities: true },
    orderBy: { lastActivityAt: 'desc' },
  });

  res.json(contacts.map(formatContact));
}

async function getContact(req, res) {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: { activities: true },
  });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(formatContact(contact));
}

async function createContact(req, res) {
  const b = req.body;
  if (!b.firstName) return res.status(400).json({ error: 'firstName is required' });
  if (b.pool && !VALID_POOLS.includes(b.pool))                   return res.status(400).json({ error: 'Invalid pool' });
  if (b.lifecycleStage && !VALID_STAGES.includes(b.lifecycleStage)) return res.status(400).json({ error: 'Invalid lifecycleStage' });
  if (b.status && !VALID_STATUSES.includes(b.status))            return res.status(400).json({ error: 'Invalid status' });
  if (b.accountSize && !VALID_ACCOUNT_SIZES.includes(b.accountSize)) return res.status(400).json({ error: 'Invalid accountSize' });

  const contact = await prisma.contact.create({
    data: {
      pool:           b.pool           || 'prospect',
      clientId:       b.clientId       || null,
      firstName:      b.firstName,
      lastName:       b.lastName       || '',
      email:          b.email          || '',
      phone:          b.phone          || '',
      company:        b.company        || '',
      title:          b.title          || '',
      website:        b.website        || '',
      address:        (b.address       || '').trim(),
      city:           (b.city          || '').trim() || extractCity((b.address || '').trim()),
      trucks:         parseInt(b.trucks)        || 0,
      lifecycleStage: b.lifecycleStage || 'new',
      leadScore:      b.leadScore      || 10,
      status:         b.status         || 'active',
      source:         b.source         || '',
      campaign:       b.campaign       || '',
      contractValue:  parseInt(b.contractValue) || 0,
      accountSize:    b.accountSize    || '1-5',
      tags:           b.tags           || [],
      notes:          b.notes          || '',
      ownedBy:        b.ownedBy        || '',
      addedBy:        b.addedBy        || '',
      lastActivityAt: new Date(),
    },
  });

  if (b.activities && b.activities.length > 0) {
    await prisma.activity.createMany({
      data: b.activities.map(a => ({
        contactId: contact.id,
        type:      a.type,
        note:      a.note || '',
        by:        a.by   || '',
        ts:        a.ts ? new Date(a.ts) : new Date(),
      })),
    });
  }

  const full = await prisma.contact.findUnique({
    where: { id: contact.id },
    include: { activities: true },
  });

  const by = req.user?.name || req.user?.email || 'system';
  logClientActivity(contact.id, 'CREATE', by, {
    name:    `${contact.firstName} ${contact.lastName}`.trim(),
    email:   contact.email,
    company: contact.company,
    pool:    contact.pool,
  }).catch(() => {});

  res.status(201).json(formatContact(full));
}

async function updateContact(req, res) {
  const { id } = req.params;
  const b = req.body;

  if (b.pool && !VALID_POOLS.includes(b.pool))                        return res.status(400).json({ error: 'Invalid pool' });
  if (b.lifecycleStage && !VALID_STAGES.includes(b.lifecycleStage))   return res.status(400).json({ error: 'Invalid lifecycleStage' });
  if (b.status && !VALID_STATUSES.includes(b.status))                 return res.status(400).json({ error: 'Invalid status' });
  if (b.accountSize && !VALID_ACCOUNT_SIZES.includes(b.accountSize))  return res.status(400).json({ error: 'Invalid accountSize' });

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      firstName:      b.firstName      ?? existing.firstName,
      lastName:       b.lastName       ?? existing.lastName,
      email:          b.email          ?? existing.email,
      phone:          b.phone          ?? existing.phone,
      company:        b.company        ?? existing.company,
      title:          b.title          ?? existing.title,
      website:        b.website        ?? existing.website,
      address:        b.address !== undefined ? b.address.trim() : existing.address,
      city:           b.city !== undefined
                        ? b.city
                        : (b.address !== undefined && !existing.city)
                            ? extractCity(b.address.trim())
                            : existing.city,
      trucks:         b.trucks !== undefined ? parseInt(b.trucks) : existing.trucks,
      lifecycleStage: b.lifecycleStage ?? existing.lifecycleStage,
      leadScore:      b.leadScore      ?? existing.leadScore,
      status:         b.status         ?? existing.status,
      source:         b.source         ?? existing.source,
      campaign:       b.campaign       ?? existing.campaign,
      contractValue:  b.contractValue !== undefined ? parseInt(b.contractValue) : existing.contractValue,
      accountSize:    b.accountSize    ?? existing.accountSize,
      tags:           b.tags           ?? existing.tags,
      notes:          b.notes          ?? existing.notes,
      ownedBy:        b.ownedBy        ?? existing.ownedBy,
      lastActivityAt: b.lastActivityAt ? new Date(b.lastActivityAt) : new Date(),
    },
    include: { activities: true },
  });

  // Diff tracked fields and log if anything changed
  const changes = {};
  for (const field of TRACKED_FIELDS) {
    if (b[field] === undefined) continue;
    const oldVal = String(existing[field] ?? '');
    const newVal = String(b[field] ?? '');
    if (oldVal !== newVal) changes[field] = { from: existing[field], to: b[field] };
  }
  if (Object.keys(changes).length > 0) {
    const by = req.user?.name || req.user?.email || 'system';
    logClientActivity(id, 'UPDATE', by, { changes }).catch(() => {});
  }

  res.json(formatContact(updated));
}

async function deleteContact(req, res) {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
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
  const invalid  = [];
  const errors   = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Coerce every cell to string first — Excel can produce numbers for
    // cells that look numeric (zip codes, company IDs, phone numbers, etc.)
    const s = f => String(r[f] ?? '').trim();

    const email = s('email');
    const phone = s('phone');

    if (!email && !phone) {
      invalid.push(i);
      errors.push({ row: i + 1, reason: 'Missing both email and phone' });
      continue;
    }

    let firstName = s('firstName') || s('first_name');
    let lastName  = s('lastName')  || s('last_name');

    // Split "Full Name" into first + last if firstName is missing
    if (!firstName && (s('fullName'))) {
      const full  = s('fullName');
      const space = full.indexOf(' ');
      if (space !== -1) {
        firstName = full.slice(0, space);
        lastName  = lastName || full.slice(space + 1);
      } else {
        firstName = full;
      }
    }

    if (!firstName) {
      invalid.push(i);
      errors.push({ row: i + 1, reason: 'Missing first name' });
      continue;
    }

    const address = s('address');
    const city    = s('city') || extractCity(address);

    const data = {
      pool,
      clientId,
      firstName,
      lastName,
      email,
      phone,
      company:        s('company'),
      title:          s('title'),
      website:        s('website'),
      address,
      city,
      trucks:         parseInt(r.trucks)        || 0,
      contractValue:  parseInt(r.contractValue) || 0,
      lifecycleStage: VALID_STAGES.includes(r.lifecycleStage) ? r.lifecycleStage : 'new',
      leadScore:      10,
      status:         'active',
      source:         s('source'),
      notes:          s('notes'),
      ownedBy:        s('ownedBy')  || currentUserName,
      addedBy:        s('addedBy')  || currentUserName,
      tags:           [],
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
  let updated  = 0;

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
    total:    rows.length,
    imported,
    updated,
    skipped:  skipped + invalid.length,
    invalid:  invalid.length,
    errors,
  });
}

async function getContactClientActivities(req, res) {
  const activities = await prisma.clientActivity.findMany({
    where: { entityId: req.params.id },
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
    include: { activities: true },
    orderBy: { canceledAt: 'desc' },
  });

  res.json(contacts.map(formatContact));
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
      data: { isCanceled: true, status: 'canceled', canceledAt: new Date(), canceledBy: by, cancelReason },
      include: { activities: true },
    }),
    prisma.activity.create({
      data: {
        contactId: id,
        type: 'CANCEL_CONTACT',
        note: cancelReason ? `Contact canceled — ${cancelReason}` : 'Contact canceled',
        by,
        ts: new Date(),
      },
    }),
    prisma.clientActivity.create({
      data: { entityId: id, action: 'CANCEL', performedBy: by, metadata: { reason: cancelReason }, ts: new Date() },
    }),
  ]);

  res.json(formatContact(updated));
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
      data: { isCanceled: false, status: 'active', restoredAt: new Date(), restoredBy: by },
      include: { activities: true },
    }),
    prisma.activity.create({
      data: { contactId: id, type: 'UNCANCEL_CONTACT', note: 'Contact restored', by, ts: new Date() },
    }),
    prisma.clientActivity.create({
      data: { entityId: id, action: 'RESTORE', performedBy: by, metadata: { previousReason: existing.cancelReason }, ts: new Date() },
    }),
  ]);

  res.json(formatContact(updated));
}

export { listContacts, getContact, createContact, updateContact, deleteContact, getContactCounts, importContacts, listCanceledContacts, cancelContact, restoreContact, getContactClientActivities };
