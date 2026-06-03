import prisma from '../lib/prisma.js';

const VALID_TYPES = ['TEXT', 'DROPDOWN', 'CHECKBOX', 'NUMBER', 'DATE'];

async function listUdfs(req, res) {
  const cid = req.query.clientId;
  const clientId = cid !== undefined ? (cid || null) : null;
  const udfs = await prisma.userDefinedField.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ data: udfs });
}

async function createUdf(req, res) {
  const { label, type = 'TEXT', options = [], displayOrder = 0, clientId = null } = req.body;

  if (!label?.trim()) return res.status(400).json({ error: 'label is required' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });

  const existing = await prisma.userDefinedField.findMany({ select: { sortKey: true } });
  const usedNums = existing
    .map(u => u.sortKey.match(/^udf_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  let next = 1;
  while (usedNums.includes(next)) next++;
  const sortKey = `udf_${next}`;

  const udf = await prisma.userDefinedField.create({
    data: { clientId: clientId || null, label: label.trim(), type, options, sortKey, displayOrder },
  });
  res.status(201).json({ data: udf });
}

async function updateUdf(req, res) {
  const { id } = req.params;
  const { label, type, options, isActive, displayOrder } = req.body;

  const existing = await prisma.userDefinedField.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'UDF not found' });

  const data = {};
  if (label !== undefined)        data.label        = label.trim();
  if (type !== undefined)         data.type         = type;
  if (options !== undefined)      data.options      = options;
  if (isActive !== undefined)     data.isActive     = isActive;
  if (displayOrder !== undefined) data.displayOrder = displayOrder;

  const udf = await prisma.userDefinedField.update({ where: { id }, data });
  res.json({ data: udf });
}

async function deleteUdf(req, res) {
  const { id } = req.params;
  const existing = await prisma.userDefinedField.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'UDF not found' });

  await prisma.userDefinedField.delete({ where: { id } });
  res.json({ success: true });
}

async function listUdfValues(req, res) {
  const cid = req.query.clientId;
  const clientId = cid !== undefined ? (cid || null) : null;
  const { fieldKey = '', search = '' } = req.query;

  if (!/^udf_\d+$/.test(fieldKey)) {
    return res.status(400).json({ error: 'Invalid fieldKey' });
  }

  const pattern = `%${search.toLowerCase()}%`;
  let rows = [];
  try {
    if (clientId) {
      rows = search
        ? await prisma.$queryRaw`SELECT DISTINCT udf_values->>${fieldKey} AS value FROM contacts WHERE client_id = ${clientId} AND udf_values->>${fieldKey} IS NOT NULL AND udf_values->>${fieldKey} != '' AND LOWER(udf_values->>${fieldKey}) LIKE ${pattern} ORDER BY value LIMIT 50`
        : await prisma.$queryRaw`SELECT DISTINCT udf_values->>${fieldKey} AS value FROM contacts WHERE client_id = ${clientId} AND udf_values->>${fieldKey} IS NOT NULL AND udf_values->>${fieldKey} != '' ORDER BY value LIMIT 50`;
    } else {
      rows = search
        ? await prisma.$queryRaw`SELECT DISTINCT udf_values->>${fieldKey} AS value FROM contacts WHERE client_id IS NULL AND udf_values->>${fieldKey} IS NOT NULL AND udf_values->>${fieldKey} != '' AND LOWER(udf_values->>${fieldKey}) LIKE ${pattern} ORDER BY value LIMIT 50`
        : await prisma.$queryRaw`SELECT DISTINCT udf_values->>${fieldKey} AS value FROM contacts WHERE client_id IS NULL AND udf_values->>${fieldKey} IS NOT NULL AND udf_values->>${fieldKey} != '' ORDER BY value LIMIT 50`;
    }
  } catch { /* silent */ }

  res.json({ data: rows.map(r => r.value).filter(Boolean) });
}

// Deletes duplicate UDFs (same clientId+label), keeps oldest.
// Also resets isActive=false on any still-default-named Usrdefine\d+ fields.
async function cleanupUdfs(req, res) {
  const cid = req.body?.clientId;
  const clientId = cid !== undefined ? (cid || null) : null;

  const all = await prisma.userDefinedField.findMany({
    where: { clientId },
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Map(); // label -> keep id
  const toDelete = [];
  for (const udf of all) {
    if (seen.has(udf.label)) {
      toDelete.push(udf.id);
    } else {
      seen.set(udf.label, udf.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.userDefinedField.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Set isActive=false on any still-default-named fields
  const defaultPattern = /^Usrdefine\d+$/i;
  const remaining = await prisma.userDefinedField.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const defaultIds = remaining.filter(u => defaultPattern.test(u.label) && u.isActive).map(u => u.id);
  if (defaultIds.length > 0) {
    await prisma.userDefinedField.updateMany({ where: { id: { in: defaultIds } }, data: { isActive: false } });
  }

  const final = await prisma.userDefinedField.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ data: final, deleted: toDelete.length });
}

// Atomically seeds 5 default UDFs if none exist for this clientId.
async function seedUdfs(req, res) {
  const cid = req.body?.clientId;
  const clientId = cid !== undefined ? (cid || null) : null;

  await prisma.$transaction(async (tx) => {
    const count = await tx.userDefinedField.count({ where: { clientId } });
    if (count > 0) return;

    const defaults = ['Usrdefine1', 'Usrdefine2', 'Usrdefine3', 'Usrdefine4', 'Usrdefine5'];
    for (const [i, label] of defaults.entries()) {
      const existing = await tx.userDefinedField.findMany({ select: { sortKey: true } });
      const usedNums = existing.map(u => u.sortKey.match(/^udf_(\d+)$/)?.[1]).filter(Boolean).map(Number);
      let next = 1;
      while (usedNums.includes(next)) next++;
      await tx.userDefinedField.create({
        data: { clientId, label, type: 'TEXT', options: [], sortKey: `udf_${next}`, displayOrder: i, isActive: false },
      });
    }
  });

  const udfs = await prisma.userDefinedField.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ data: udfs });
}

export { listUdfs, createUdf, updateUdf, deleteUdf, listUdfValues, cleanupUdfs, seedUdfs };
