import prisma from '../lib/prisma.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { sendSingleEmail } from '../services/resendService.js';
import { htmlToPlainText } from '../services/email.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo    from '../repositories/domainRepository.js';
import * as linkRepo      from '../repositories/templateLinkRepository.js';
import {
  validateAndSyncLinks,
  extractLinksFromHtml,
} from '../services/templateLinkService.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION } from '../constants/index.js';
import { importHtml as processImport } from '../services/htmlImporter.js';
import { injectUnsubscribeFooter, injectUnsubUrl } from '../services/email.js';

// ── Guard: assert client exists ───────────────────────────────────────────────

async function assertClientOwnership(clientId, res) {
  if (!clientId) {
    sendError(res, 'clientId is required', 400);
    return false;
  }
  const client = await prisma.client.findUnique({
    where:  { id: clientId },
    select: { id: true },
  });
  if (!client) {
    sendError(res, 'Client not found', 404);
    return false;
  }
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveLinks(linksPayload, htmlOutput) {
  if (Array.isArray(linksPayload)) return linksPayload;       // primary path
  return extractLinksFromHtml(htmlOutput);                    // fallback
}

// ── Controllers ───────────────────────────────────────────────────────────────

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
    const { clientId } = req.query;
    const where = clientId ? { clientId } : {};
    const rows = await templateRepo.findMany(where);
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listTemplates');
  }
};

export const getTemplate = async (req, res) => {
  try {
    const row = await templateRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Template not found', 404);

    // Client isolation: if caller supplies clientId, enforce it matches
    const { clientId } = req.query;
    if (clientId && row.clientId !== clientId) {
      return sendError(res, 'Template not found', 404);
    }

    // Attach persisted links to the response
    const links = await linkRepo.findByTemplate(row.id);
    sendSuccess(res, { ...row, links });
  } catch (err) {
    sendServerError(res, err, 'getTemplate');
  }
};

export const createTemplate = async (req, res) => {
  const {
    clientId,
    name,
    subject    = '',
    fromEmail  = '',
    body,
    htmlOutput = '',
    status     = 'draft',
    links: linksPayload,
  } = req.body ?? {};

  if (!name) return sendError(res, 'name is required', 400);

  const clientOk = await assertClientOwnership(clientId, res);
  if (!clientOk) return;

  const resolvedBody = body ?? { version: 1, blocks: [] };
  const resolvedFromEmail = fromEmail || resolvedBody?.from || '';

  try {
    const row = await templateRepo.createTemplate({
      clientId:    clientId ?? null,
      name,
      subject,
      fromEmail:   resolvedFromEmail,
      body:        resolvedBody,
      htmlOutput:  htmlOutput || '',
      trackedLinks: [],
      status,
    });

    // Sync links — use frontend payload or fall back to HTML extraction
    const linkData = resolveLinks(linksPayload, htmlOutput);
    let links = [];
    if (linkData.length) {
      links = await validateAndSyncLinks(row.id, row.clientId, linkData);
    }

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.TEMPLATE, row.id, ACTION.CREATE, `Template created: ${row.name}`, by);

    sendSuccess(res, { ...row, links }, 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    sendServerError(res, err, 'createTemplate');
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const existing = await templateRepo.findById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);

    // Enforce client isolation when clientId is supplied
    const { clientId } = req.body ?? {};
    if (clientId && existing.clientId !== clientId) {
      return sendError(res, 'Template not found', 404);
    }

    const updates = req.body ?? {};
    const data = {};
    if (updates.name        !== undefined) data.name        = updates.name;
    if (updates.subject     !== undefined) data.subject     = updates.subject;
    if (updates.body        !== undefined) data.body        = updates.body;
    if (updates.htmlOutput  !== undefined) data.htmlOutput  = updates.htmlOutput;
    if (updates.status      !== undefined) data.status      = updates.status;
    if (updates.trackedLinks !== undefined) data.trackedLinks = updates.trackedLinks;
    // Persist fromEmail: prefer explicit field, fall back to body.from for HTML templates
    if (updates.fromEmail !== undefined) {
      data.fromEmail = updates.fromEmail;
    } else if (updates.body?.from) {
      data.fromEmail = updates.body.from;
    }

    const row = await templateRepo.updateTemplate(req.params.id, data);

    // Re-sync links only when the caller supplies a links array
    let links = await linkRepo.findByTemplate(row.id);
    if (Array.isArray(updates.links)) {
      links = await validateAndSyncLinks(row.id, row.clientId, updates.links);
    } else if (updates.htmlOutput !== undefined && !Array.isArray(updates.links)) {
      // htmlOutput changed but no links payload — extract from new HTML as fallback
      const extracted = extractLinksFromHtml(updates.htmlOutput);
      if (extracted.length) {
        links = await validateAndSyncLinks(row.id, row.clientId, extracted);
      }
    }

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.TEMPLATE, row.id, ACTION.UPDATE, `Template updated: ${row.name}`, by);

    sendSuccess(res, { ...row, links });
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
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

export const cancelTemplate = async (req, res) => {
  try {
    const existing = await templateRepo.findById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);
    const cancelReason = (req.body?.cancelReason || '').trim();
    const row = await templateRepo.cancelTemplate(req.params.id, cancelReason);
    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.TEMPLATE, row.id, ACTION.CANCEL, cancelReason || 'Template canceled', by);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'cancelTemplate');
  }
};

export const restoreTemplate = async (req, res) => {
  try {
    const existing = await templateRepo.findById(req.params.id);
    if (!existing) return sendError(res, 'Template not found', 404);
    const previousStatus = existing.status === 'canceled' ? 'draft' : existing.status;
    const row = await templateRepo.restoreTemplate(req.params.id, previousStatus);
    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.TEMPLATE, row.id, ACTION.RESTORE, 'Template restored', by);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'restoreTemplate');
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

    // Clone template links to the new template
    const sourceLinks = await linkRepo.findByTemplate(original.id);
    let links = [];
    if (sourceLinks.length) {
      links = await validateAndSyncLinks(
        copy.id,
        copy.clientId,
        sourceLinks.map(l => ({ url: l.url, label: l.label, scoringRuleId: l.scoringRule?.id })),
      );
    }

    sendSuccess(res, { ...copy, links }, 201);
  } catch (err) {
    sendServerError(res, err, 'duplicateTemplate');
  }
};

// ── HTML import — sanitize + validate, no DB write ────────────────────────────
export const importHtml = (req, res) => {
  try {
    const { html, safeMode = false } = req.body ?? {};

    if (!html || typeof html !== 'string' || !html.trim()) {
      return sendError(res, 'html is required', 400);
    }

    const MAX_SIZE = 500 * 1024; // 500 KB hard cap
    if (Buffer.byteLength(html, 'utf8') > MAX_SIZE) {
      return sendError(res, 'HTML is too large (max 500 KB)', 413);
    }

    const result = processImport(html, { safeMode: Boolean(safeMode) });
    sendSuccess(res, result);
  } catch (err) {
    sendServerError(res, err, 'importHtml');
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

    const rawHtml = template.htmlOutput
      .replace(/\{\{INTERACT_URL_[^}]+\}\}/g, '#test-preview')
      .replace(/\{\{[^}]+\}\}/g, '');          // strip any remaining placeholders
    const html = injectUnsubUrl(rawHtml, '#test-unsubscribe');

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
      to:      email,
      from:    fromEmail,
      subject: `[Preview] ${template.subject || template.name}`,
      html,
      text:    htmlToPlainText(rawHtml),
    });

    sendSuccess(res, { ok: true, messageId: result?.id });
  } catch (err) {
    sendServerError(res, err, 'sendTestEmail');
  }
};
