import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { sendSingleEmail } from '../services/resendService.js';
import { htmlToPlainText } from '../services/htmlRenderer.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';

export const checkSchema = async (req, res) => {
  try {
    await templateRepo.findMany({});
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'checkSchema');
  }
};

export const listTemplates = async (req, res) => {
  try {
    const rows = await templateRepo.findMany({});
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listTemplates');
  }
};

export const getTemplate = async (req, res) => {
  try {
    const row = await templateRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Template not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'getTemplate');
  }
};

export const createTemplate = async (req, res) => {
  const {
    name,
    subject,
    body,
    htmlOutput,
    status = 'draft'
  } = req.body ?? {};

  if (!name) return sendError(res, 'name is required', 400);

  try {
    const row = await templateRepo.createTemplate({
      name,
      subject: subject || '',
      body: body ?? { version: 1, blocks: [] },
      htmlOutput: htmlOutput || '',
      trackedLinks: [],
      status,
    });

    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createTemplate');
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const existing = await templateRepo.findById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);

    const updates = req.body ?? {};
    const data = {};

    if (updates.name !== undefined)         data.name         = updates.name;
    if (updates.subject !== undefined)      data.subject      = updates.subject;
    if (updates.body !== undefined)         data.body         = updates.body;
    if (updates.htmlOutput !== undefined)   data.htmlOutput   = updates.htmlOutput;
    if (updates.status !== undefined)       data.status       = updates.status;
    if (updates.trackedLinks !== undefined) data.trackedLinks = updates.trackedLinks;

    const row = await templateRepo.updateTemplate(req.params.id, data);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'updateTemplate');
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const existing = await templateRepo.findById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);

    await templateRepo.removeTemplate(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteTemplate');
  }
};

export const duplicateTemplate = async (req, res) => {
  try {
    const original = await templateRepo.findById(req.params.id);
    if (!original) return sendError(res, 'Template not found', 404);

    const copy = await templateRepo.createTemplate({
      name:         `${original.name} (Copy)`,
      subject:      original.subject,
      body:         original.body,
      htmlOutput:   original.htmlOutput,
      trackedLinks: original.trackedLinks || [],
      status:       'draft',
      clientId:     original.clientId,
    });

    sendSuccess(res, copy, 201);
  } catch (err) {
    sendServerError(res, err, 'duplicateTemplate');
  }
};

export const sendTestEmail = async (req, res) => {
  const { email } = req.body ?? {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 'A valid recipient email is required', 400);
  }

  try {
    const template = await templateRepo.findById(req.params.id);
    if (!template) return sendError(res, 'Template not found', 404);

    if (!template.htmlOutput) {
      return sendError(res, 'Template has no HTML output. Open it in the builder and save it first.', 400);
    }

    // Replace interactive placeholders with a visible test note
    const html = template.htmlOutput.replace(
      /\{\{INTERACT_URL_[^}]+\}\}/g,
      '#test-preview'
    );

    // Try client-scoped domain → any verified domain → RESEND_FROM_EMAIL env
    let fromEmail = null;

    const clientDomain = await domainRepo.findFirstVerified(template.clientId ?? null);
    if (clientDomain) {
      fromEmail = clientDomain.defaultFromEmail || `noreply@${clientDomain.domainName}`;
    } else {
      const anyDomain = await domainRepo.findAnyVerified();
      if (anyDomain) {
        fromEmail = anyDomain.defaultFromEmail || `noreply@${anyDomain.domainName}`;
      } else if (process.env.RESEND_FROM_EMAIL) {
        fromEmail = process.env.RESEND_FROM_EMAIL;
      } else {
        return sendError(res, 'No verified sending domain found. Verify a domain in Domains first.', 400);
      }
    }

    const result = await sendSingleEmail({
      to:       email,
      from:     fromEmail,
      subject:  `[TEST] ${template.subject || template.name}`,
      html,
      text:     htmlToPlainText(html),
      reply_to: fromEmail,
    });

    sendSuccess(res, { ok: true, messageId: result?.id });
  } catch (err) {
    sendServerError(res, err, 'sendTestEmail');
  }
};
