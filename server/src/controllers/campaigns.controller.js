import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as repo from '../repositories/campaignRepository.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

export const listCampaigns = async (req, res) => {
  try {
    const { clientId } = req.query;
    const where = clientId ? { clientId } : {};
    const rows = await repo.findMany(where);
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listCampaigns');
  }
};

export const getCampaign = async (req, res) => {
  try {
    const row = await repo.findById(req.params.id);
    if (!row) return sendError(res, 'Campaign not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'getCampaign');
  }
};

export const createCampaign = async (req, res) => {
  const { name, type = 'regular', clientId, templateId, subject } = req.body ?? {};
  if (!name) return sendError(res, 'name is required', 400);

  try {
    // If templateId provided, pull subject from template if not given
    let resolvedSubject = subject || '';
    if (templateId && !resolvedSubject) {
      const tmpl = await templateRepo.findById(templateId);
      resolvedSubject = tmpl?.subject || '';
    }

    const row = await repo.createCampaign({
      name,
      type,
      status: 'draft',
      clientId:   clientId || null,
      templateId: templateId || null,
      subject:    resolvedSubject,
    });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createCampaign');
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);

    const { name, status, templateId, templateIdB, subject, subjectB, fromName, fromEmail } = req.body ?? {};
    const data = {};
    if (name       !== undefined) data.name       = name;
    if (status     !== undefined) data.status     = status;
    if (templateId !== undefined) data.templateId = templateId;
    if (templateIdB !== undefined) data.templateIdB = templateIdB;
    if (subject    !== undefined) data.subject    = subject;
    if (subjectB   !== undefined) data.subjectB   = subjectB;
    if (fromName   !== undefined) data.fromName   = fromName;
    if (fromEmail  !== undefined) data.fromEmail  = fromEmail;

    const row = await repo.updateCampaign(req.params.id, data);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'updateCampaign');
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (existing.status === 'sending') return sendError(res, 'Cannot delete a campaign that is currently sending', 400);

    await repo.removeCampaign(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteCampaign');
  }
};

// ── Recipients ────────────────────────────────────────────────────────────────

export const listRecipients = async (req, res) => {
  try {
    const { status, variant, search, page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const { rows, total } = await repo.findRecipients(req.params.id, {
      status,
      abVariant: variant,
      search,
      skip,
      limit: take,
    });
    sendSuccess(res, { rows, total, page: parseInt(page, 10) || 1, limit: take });
  } catch (err) {
    sendServerError(res, err, 'listRecipients');
  }
};

export const addRecipients = async (req, res) => {
  const { filter, contactIds } = req.body ?? {};

  try {
    const campaign = await repo.findById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sent') return sendError(res, 'Cannot add recipients to a sent campaign', 400);

    let ids = [];
    if (Array.isArray(contactIds) && contactIds.length) {
      ids = contactIds;
    } else if (filter) {
      const contacts = await repo.getContactsForFilter(campaign.clientId, filter);
      ids = contacts.map(c => c.id);
    }

    if (!ids.length) return sendError(res, 'No contacts matched the filter', 400);

    await repo.addRecipients(req.params.id, ids);

    // For A/B test campaigns, auto-assign variants
    if (campaign.type === 'ab_test') {
      await repo.assignVariants(req.params.id);
    }

    const updated = await repo.findById(req.params.id);
    sendSuccess(res, updated);
  } catch (err) {
    sendServerError(res, err, 'addRecipients');
  }
};

export const previewRecipients = async (req, res) => {
  const { filter, clientId } = req.query;
  try {
    const contacts = await repo.getContactsForFilter(clientId, filter);
    sendSuccess(res, { count: contacts.length, sample: contacts.slice(0, 5) });
  } catch (err) {
    sendServerError(res, err, 'previewRecipients');
  }
};

export const removeRecipients = async (req, res) => {
  try {
    const campaign = await repo.findById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sent') return sendError(res, 'Cannot modify recipients of a sent campaign', 400);

    await repo.removeAllRecipients(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'removeRecipients');
  }
};

// ── Send ──────────────────────────────────────────────────────────────────────

export const sendCampaign = async (req, res) => {
  try {
    const campaign = await repo.findById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);

    if (campaign.status === 'sent') return sendError(res, 'Campaign already sent', 400);
    if (campaign.status === 'sending') return sendError(res, 'Campaign is already sending', 400);

    const pendingCount = await repo.countPendingRecipients(req.params.id);
    if (!pendingCount) return sendError(res, 'No pending recipients', 400);

    // Mark as sending immediately (idempotency guard)
    await repo.updateCampaign(req.params.id, {
      status: 'sending',
      sentAt: new Date(),
    });

    // In a real system this would queue jobs. For now we mark sent immediately.
    await repo.updateCampaign(req.params.id, {
      status:   'sent',
      sentCount: pendingCount,
      completedAt: new Date(),
    });

    const updated = await repo.findById(req.params.id);
    sendSuccess(res, updated);
  } catch (err) {
    sendServerError(res, err, 'sendCampaign');
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getCampaignAnalytics = async (req, res) => {
  try {
    const campaign = await repo.findById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);

    const statusGroups = await repo.groupRecipientsByStatus(req.params.id);
    const counts = {};
    for (const g of statusGroups) counts[g.status] = g._count.status;

    const total      = campaign.recipientsCount || 1;
    const sent       = counts.sent       || campaign.sentCount       || 0;
    const delivered  = counts.delivered  || campaign.deliveredCount  || 0;
    const opened     = counts.opened     || campaign.openedCount     || 0;
    const clicked    = counts.clicked    || campaign.clickedCount    || 0;
    const bounced    = counts.bounced    || campaign.bouncedCount    || 0;
    const unsubbed   = counts.unsubscribed || campaign.unsubscribedCount || 0;

    const base = sent || total;

    sendSuccess(res, {
      totals: { total, sent, delivered, opened, clicked, bounced, unsubscribed: unsubbed },
      rates: {
        openRate:        base ? +(opened  / base * 100).toFixed(1) : 0,
        clickRate:       base ? +(clicked / base * 100).toFixed(1) : 0,
        bounceRate:      base ? +(bounced / base * 100).toFixed(1) : 0,
        deliveryRate:    base ? +(delivered / base * 100).toFixed(1) : 0,
        unsubscribeRate: base ? +(unsubbed / base * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    sendServerError(res, err, 'getCampaignAnalytics');
  }
};

// ── Published templates list (for wizard step 2) ──────────────────────────────

export const listPublishedTemplates = async (req, res) => {
  try {
    const rows = await templateRepo.findMany({ status: 'published' });
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listPublishedTemplates');
  }
};
