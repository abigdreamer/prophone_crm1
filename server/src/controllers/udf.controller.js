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

export { listUdfs, createUdf, updateUdf, deleteUdf };
