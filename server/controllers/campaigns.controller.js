import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { renderTemplate } from '../services/htmlRenderer.js';
import * as campaignRepo from '../repositories/campaignRepository.js';

export async function listCampaigns(req, res) {
  try {
    const rows = await campaignRepo.findMany(tenantWhere(req));
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listCampaigns');
  }
}

export async function getCampaign(req, res) {
  try {
    const row = await campaignRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    const statusCounts = await campaignRepo.groupRecipientsByStatus(row.id);
    const stats = Object.fromEntries(statusCounts.map(s => [s.status, s._count.status]));

    sendSuccess(res, { ...row, recipient_stats: stats });
  } catch (err) {
    sendServerError(res, err, 'getCampaign');
  }
}

export async function createCampaign(req, res) {
  const { name, subject, from_name, from_email, template_id, scheduled_at } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid)  return sendError(res, 'prophone_id is required', 400);
  if (!name) return sendError(res, 'name is required', 400);

  try {
    const row = await campaignRepo.createCampaign({
      prophone_id:  tid,
      name,
      subject:      subject      || '',
      from_name:    from_name    || '',
      from_email:   from_email   || '',
      template_id:  template_id  || null,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
    });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createCampaign');
  }
}

export async function updateCampaign(req, res) {
  try {
    const existing = await campaignRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (existing.status === 'running') {
      return sendError(res, 'Cannot edit a campaign while it is running. Pause it first.', 409);
    }

    const { name, subject, from_name, from_email, template_id, scheduled_at } = req.body ?? {};
    const data = {};
    if (name         !== undefined) data.name         = name;
    if (subject      !== undefined) data.subject      = subject;
    if (from_name    !== undefined) data.from_name    = from_name;
    if (from_email   !== undefined) data.from_email   = from_email;
    if (template_id  !== undefined) data.template_id  = template_id || null;
    if (scheduled_at !== undefined) data.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;

    const row = await campaignRepo.updateCampaign(req.params.id, data);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'updateCampaign');
  }
}

export async function deleteCampaign(req, res) {
  try {
    const existing = await campaignRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (existing.status === 'running') {
      return sendError(res, 'Stop the campaign before deleting it.', 409);
    }

    await campaignRepo.removeCampaign(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteCampaign');
  }
}

export async function addRecipients(req, res) {
  const { contactIds = [] } = req.body ?? {};
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return sendError(res, 'contactIds must be a non-empty array', 400);
  }

  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (campaign.status === 'running') {
      return sendError(res, 'Cannot add recipients to a running campaign.', 409);
    }

    const contacts = await campaignRepo.findContactsByIds(contactIds, campaign.prophone_id);
    if (contacts.length === 0) {
      return sendError(res, 'No valid contacts with email addresses found.', 400);
    }

    const result = await campaignRepo.addRecipients(req.params.id, contacts);
    sendSuccess(res, { added: result.count, total_requested: contacts.length }, 201);
  } catch (err) {
    sendServerError(res, err, 'addRecipients');
  }
}

export async function listRecipients(req, res) {
  const { status, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);

    const { rows, total } = await campaignRepo.findRecipients(req.params.id, {
      status,
      skip,
      limit: Number(limit),
    });

    sendSuccess(res, { data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    sendServerError(res, err, 'listRecipients');
  }
}

export async function removeAllRecipients(req, res) {
  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (campaign.status === 'running') {
      return sendError(res, 'Cannot remove recipients from a running campaign.', 409);
    }

    const { count } = await campaignRepo.removeAllRecipients(req.params.id);
    sendSuccess(res, { removed: count });
  } catch (err) {
    sendServerError(res, err, 'removeAllRecipients');
  }
}

export async function sendCampaign(req, res) {
  const { contactIds } = req.body ?? {};

  try {
    const campaign = await campaignRepo.findByIdFull(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);

    if (['running', 'completed'].includes(campaign.status)) {
      return sendError(res, `Campaign is already ${campaign.status}.`, 409);
    }

    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const contacts = await campaignRepo.findContactsByIds(contactIds, campaign.prophone_id);
      if (contacts.length > 0) {
        await campaignRepo.addRecipients(campaign.id, contacts);
      }
    }

    const pendingCount = await campaignRepo.countPendingRecipients(campaign.id);
    if (pendingCount === 0) {
      return sendError(res, 'No pending recipients found. Add contacts before sending.', 400);
    }
    if (!campaign.subject) return sendError(res, 'Campaign subject is required.', 400);
    if (!campaign.from_email && !process.env.RESEND_FROM_EMAIL) {
      return sendError(res, 'Sender email (from_email) is required.', 400);
    }

    let htmlSnapshot = campaign.html_snapshot;
    if (!htmlSnapshot && campaign.template) {
      htmlSnapshot = renderTemplate(campaign.template.json_structure, {});
    }
    if (!htmlSnapshot) {
      return sendError(res, 'No template or HTML content found for this campaign.', 400);
    }

    const updated = await campaignRepo.updateCampaign(campaign.id, {
      status: 'running',
      html_snapshot: htmlSnapshot,
    });

    sendSuccess(res, {
      ok:            true,
      campaign_id:   updated.id,
      status:        updated.status,
      pending_count: pendingCount,
      message:       `Campaign is running. ${pendingCount} emails queued for delivery.`,
    });
  } catch (err) {
    sendServerError(res, err, 'sendCampaign');
  }
}

export async function pauseCampaign(req, res) {
  try {
    const existing = await campaignRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (existing.status !== 'running') return sendError(res, 'Campaign is not running.', 409);

    const row = await campaignRepo.updateCampaign(req.params.id, { status: 'paused' });
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'pauseCampaign');
  }
}

export async function resumeCampaign(req, res) {
  try {
    const existing = await campaignRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (existing.status !== 'paused') return sendError(res, 'Campaign is not paused.', 409);

    const row = await campaignRepo.updateCampaign(req.params.id, { status: 'running' });
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'resumeCampaign');
  }
}
