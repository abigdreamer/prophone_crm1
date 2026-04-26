import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { sendSingleEmail } from '../services/resendService.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo   from '../repositories/domainRepository.js';

export async function checkSchema(req, res) {
  try {
    await templateRepo.findMany({});
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'checkSchema');
  }
}

export async function listTemplates(req, res) {
  try {
    const rows = await templateRepo.findMany(tenantWhere(req));
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listTemplates');
  }
}

export async function getTemplate(req, res) {
  try {
    const row = await templateRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Template not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'getTemplate');
  }
}

export async function createTemplate(req, res) {
  const { name, subject, json_structure, html_output, status = 'draft' } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid) return sendError(res, 'prophone_id is required to create a template', 400);
  if (!name) return sendError(res, 'name is required', 400);

  try {
    const row = await templateRepo.createTemplate({
      prophone_id:    tid,
      name,
      subject:        subject        || '',
      json_structure: json_structure ?? { version: 1, blocks: [] },
      html_output:    html_output    || '',
      status,
    });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createTemplate');
  }
}

export async function updateTemplate(req, res) {
  try {
    const existing = await templateRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);

    const updates = req.body ?? {};
    const data    = {};
    if (updates.name           !== undefined) data.name           = updates.name;
    if (updates.subject        !== undefined) data.subject        = updates.subject;
    if (updates.json_structure !== undefined) data.json_structure = updates.json_structure;
    if (updates.html_output    !== undefined) data.html_output    = updates.html_output;
    if (updates.status         !== undefined) data.status         = updates.status;

    const row = await templateRepo.updateTemplate(req.params.id, data);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'updateTemplate');
  }
}

export async function deleteTemplate(req, res) {
  try {
    const existing = await templateRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);

    await templateRepo.removeTemplate(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteTemplate');
  }
}

export async function duplicateTemplate(req, res) {
  try {
    const original = await templateRepo.findById(req.params.id);
    if (!original) return sendError(res, 'Template not found', 404);
    if (!canAccessTenant(req, original.prophone_id)) return sendError(res, 'Forbidden', 403);

    const copy = await templateRepo.createTemplate({
      prophone_id:    original.prophone_id,
      name:           `${original.name} (Copy)`,
      subject:        original.subject,
      json_structure: original.json_structure,
      html_output:    original.html_output,
      status:         'draft',
    });
    sendSuccess(res, copy, 201);
  } catch (err) {
    sendServerError(res, err, 'duplicateTemplate');
  }
}

export async function sendTestEmail(req, res) {
  const { email } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 'A valid recipient email is required', 400);
  }

  try {
    const template = await templateRepo.findById(req.params.id);
    if (!template) return sendError(res, 'Template not found', 404);
    if (!canAccessTenant(req, template.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (template.status !== 'published') {
      return sendError(res, 'Only published templates can be sent as test emails', 400);
    }
    if (!template.html_output) {
      return sendError(res, 'Template has no HTML content to send', 400);
    }

    const tid = tenantId(req);
    const verifiedDomain = tid ? await domainRepo.findFirstVerified(tid) : null;
    const fromEmail = verifiedDomain
      ? (verifiedDomain.from_email || `noreply@${verifiedDomain.domain}`)
      : null;

    const result = await sendSingleEmail({
      to:      email,
      from:    fromEmail,
      subject: `[TEST] ${template.subject || template.name}`,
      html:    template.html_output,
    });

    sendSuccess(res, { ok: true, messageId: result?.id });
  } catch (err) {
    sendServerError(res, err, 'sendTestEmail');
  }
}
