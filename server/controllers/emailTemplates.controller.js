import prisma from '../prisma.js';
import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';

export async function checkSchema(req, res) {
  try {
    await prisma.email_template.findFirst({ select: { id: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, reason: 'unknown', message: err.message });
  }
}

export async function listTemplates(req, res) {
  try {
    const rows = await prisma.email_template.findMany({
      where: tenantWhere(req),
      select: { id: true, name: true, subject: true, status: true, prophone_id: true, created_at: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTemplate(req, res) {
  try {
    const row = await prisma.email_template.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Template not found' });
    if (!canAccessTenant(req, row.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createTemplate(req, res) {
  const { name, subject, json_structure, html_output, status = 'draft' } = req.body;
  const tid = tenantId(req);
  if (!tid) {
    return res.status(400).json({ error: 'prophone_id is required to create a template' });
  }

  try {
    const row = await prisma.email_template.create({
      data: {
        prophone_id:    tid,
        name,
        subject:        subject || '',
        json_structure: json_structure ?? { version: 1, blocks: [] },
        html_output:    html_output || '',
        status,
      },
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateTemplate(req, res) {
  try {
    const existing = await prisma.email_template.findUnique({ where: { id: req.params.id }, select: { prophone_id: true } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    if (!canAccessTenant(req, existing.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    const updates = req.body;
    const data = {};
    if (updates.name           !== undefined) data.name           = updates.name;
    if (updates.subject        !== undefined) data.subject        = updates.subject;
    if (updates.json_structure !== undefined) data.json_structure = updates.json_structure;
    if (updates.html_output    !== undefined) data.html_output    = updates.html_output;
    if (updates.status         !== undefined) data.status         = updates.status;

    const row = await prisma.email_template.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteTemplate(req, res) {
  try {
    const existing = await prisma.email_template.findUnique({ where: { id: req.params.id }, select: { prophone_id: true } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    if (!canAccessTenant(req, existing.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.email_template.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function duplicateTemplate(req, res) {
  try {
    const original = await prisma.email_template.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Template not found' });
    if (!canAccessTenant(req, original.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    const copy = await prisma.email_template.create({
      data: {
        prophone_id:    original.prophone_id,
        name:           `${original.name} (Copy)`,
        subject:        original.subject,
        json_structure: original.json_structure,
        html_output:    original.html_output,
        status:         'draft',
      },
    });
    res.status(201).json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
