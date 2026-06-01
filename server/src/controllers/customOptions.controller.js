import prisma from '../lib/prisma.js';

export const CUSTOM_SORTABLE_FIELDS = new Set([
  'email', 'phone', 'title', 'source', 'campaign', 'state', 'zip',
  'ownedBy', 'addedBy', 'accountSize', 'dispatcherSoftware',
  'trucks', 'contractValue', 'yearsInBusiness', 'serviceAreaMiles', 'leadScore',
  'lifecycleStage', 'status',
  'createdAt', 'lastActivityAt',
]);

export const CUSTOM_FILTERABLE_FIELDS = new Set([
  'email', 'phone', 'title', 'source', 'campaign', 'state', 'zip',
  'ownedBy', 'addedBy', 'accountSize', 'dispatcherSoftware',
  'trucks', 'contractValue', 'yearsInBusiness', 'serviceAreaMiles', 'leadScore',
  'lifecycleStage', 'status',
]);

function parseClientId(raw) {
  return raw !== undefined ? (raw || null) : null;
}

// ── Custom Sort Options ──────────────────────────────────────────────────────

export async function listCustomSorts(req, res) {
  const clientId = parseClientId(req.query.clientId);
  const data = await prisma.customSortOption.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ data });
}

export async function createCustomSort(req, res) {
  const { label, contactField, direction = 'asc', displayOrder = 0, clientId = null } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label is required' });
  if (!CUSTOM_SORTABLE_FIELDS.has(contactField)) return res.status(400).json({ error: 'invalid contactField' });
  if (!['asc', 'desc'].includes(direction)) return res.status(400).json({ error: 'direction must be asc or desc' });
  const sortValue = `csort:${contactField}:${direction}`;
  const data = await prisma.customSortOption.create({
    data: { clientId: clientId || null, label: label.trim(), contactField, direction, sortValue, displayOrder },
  });
  res.status(201).json({ data });
}

export async function updateCustomSort(req, res) {
  const { id } = req.params;
  const existing = await prisma.customSortOption.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const patch = {};
  const { label, contactField, direction, isActive, displayOrder } = req.body;
  if (label !== undefined) patch.label = label.trim();
  if (contactField !== undefined) {
    if (!CUSTOM_SORTABLE_FIELDS.has(contactField)) return res.status(400).json({ error: 'invalid contactField' });
    patch.contactField = contactField;
    patch.sortValue = `csort:${contactField}:${direction ?? existing.direction}`;
  }
  if (direction !== undefined) {
    patch.direction = direction;
    if (!patch.sortValue && !existing.isBuiltIn) patch.sortValue = `csort:${contactField ?? existing.contactField}:${direction}`;
  }
  if (isActive !== undefined) patch.isActive = isActive;
  if (displayOrder !== undefined) patch.displayOrder = displayOrder;
  const data = await prisma.customSortOption.update({ where: { id }, data: patch });
  res.json({ data });
}

export async function deleteCustomSort(req, res) {
  const { id } = req.params;
  await prisma.customSortOption.delete({ where: { id } });
  res.json({ success: true });
}

// ── Custom Filter Options ────────────────────────────────────────────────────

export async function listCustomFilters(req, res) {
  const clientId = parseClientId(req.query.clientId);
  const data = await prisma.customFilterOption.findMany({
    where: { clientId },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ data });
}

export async function createCustomFilter(req, res) {
  const { label, contactField, filterType = 'TEXT', options = [], displayOrder = 0, clientId = null } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label is required' });
  if (!CUSTOM_FILTERABLE_FIELDS.has(contactField)) return res.status(400).json({ error: 'invalid contactField' });
  const data = await prisma.customFilterOption.create({
    data: { clientId: clientId || null, label: label.trim(), contactField, filterType, options, displayOrder },
  });
  res.status(201).json({ data });
}

export async function updateCustomFilter(req, res) {
  const { id } = req.params;
  const existing = await prisma.customFilterOption.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const patch = {};
  const { label, contactField, filterType, options, isActive, displayOrder } = req.body;
  if (label !== undefined) patch.label = label.trim();
  if (contactField !== undefined) {
    if (!CUSTOM_FILTERABLE_FIELDS.has(contactField)) return res.status(400).json({ error: 'invalid contactField' });
    patch.contactField = contactField;
  }
  if (filterType !== undefined) patch.filterType = filterType;
  if (options !== undefined) patch.options = options;
  if (isActive !== undefined) patch.isActive = isActive;
  if (displayOrder !== undefined) patch.displayOrder = displayOrder;
  const data = await prisma.customFilterOption.update({ where: { id }, data: patch });
  res.json({ data });
}

export async function deleteCustomFilter(req, res) {
  const { id } = req.params;
  await prisma.customFilterOption.delete({ where: { id } });
  res.json({ success: true });
}
