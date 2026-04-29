import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { renderTemplate } from '../services/htmlRenderer.js';
import * as campaignRepo from '../repositories/campaignRepository.js';
import { getEmailStatus } from '../services/resendService.js';
import prisma from '../prisma.js';

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

    // A/B per-variant stats
    let ab_stats = null;
    if (row.ab_subject_b) {
      const variantRows = await campaignRepo.groupRecipientsByVariantAndStatus(row.id);
      ab_stats = { A: {}, B: {} };
      for (const r of variantRows) {
        ab_stats[r.ab_variant] = ab_stats[r.ab_variant] || {};
        ab_stats[r.ab_variant][r.status] = r._count.status;
      }
    }

    sendSuccess(res, { ...row, recipient_stats: stats, ab_stats });
  } catch (err) {
    sendServerError(res, err, 'getCampaign');
  }
}

export async function createCampaign(req, res) {
  const { name, subject, from_name, from_email, template_id, scheduled_at, ab_subject_b, ab_template_id_b } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid)  return sendError(res, 'prophone_id is required', 400);
  if (!name) return sendError(res, 'name is required', 400);

  try {
    const row = await campaignRepo.createCampaign({
      prophone_id:      tid,
      name,
      subject:          subject          || '',
      from_name:        from_name        || '',
      from_email:       from_email       || '',
      template_id:      template_id      || null,
      scheduled_at:     scheduled_at ? new Date(scheduled_at) : null,
      ab_subject_b:     ab_subject_b     || '',
      ab_template_id_b: ab_template_id_b || null,
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

    const { name, subject, from_name, from_email, template_id, scheduled_at, ab_subject_b, ab_template_id_b } = req.body ?? {};
    const data = {};
    if (name             !== undefined) data.name             = name;
    if (subject          !== undefined) data.subject          = subject;
    if (from_name        !== undefined) data.from_name        = from_name;
    if (from_email       !== undefined) data.from_email       = from_email;
    if (template_id      !== undefined) data.template_id      = template_id || null;
    if (scheduled_at     !== undefined) data.scheduled_at     = scheduled_at ? new Date(scheduled_at) : null;
    if (ab_subject_b     !== undefined) data.ab_subject_b     = ab_subject_b || '';
    if (ab_template_id_b !== undefined) data.ab_template_id_b = ab_template_id_b || null;

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
  const { contactIds = [], variant } = req.body ?? {};
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return sendError(res, 'contactIds must be a non-empty array', 400);
  }
  const resolvedVariant = variant === 'A' || variant === 'B' ? variant : null;

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

    const result = await campaignRepo.addRecipients(req.params.id, contacts, resolvedVariant);
    sendSuccess(res, { added: result.count, total_requested: contacts.length }, 201);
  } catch (err) {
    sendServerError(res, err, 'addRecipients');
  }
}

export async function addGroupRecipients(req, res) {
  const { groupId, variant } = req.body ?? {};
  if (!groupId) return sendError(res, 'groupId is required', 400);
  const resolvedVariant = variant === 'A' || variant === 'B' ? variant : null;

  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (campaign.status === 'running') {
      return sendError(res, 'Cannot add recipients to a running campaign.', 409);
    }

    const contacts = await campaignRepo.findContactsByGroup(groupId, campaign.prophone_id);
    if (contacts.length === 0) {
      return sendError(res, 'No contacts with email addresses found in this group.', 400);
    }

    const result = await campaignRepo.addRecipients(req.params.id, contacts, resolvedVariant);
    sendSuccess(res, { added: result.count, total_in_group: contacts.length }, 201);
  } catch (err) {
    sendServerError(res, err, 'addGroupRecipients');
  }
}

export async function listRecipients(req, res) {
  const { status, variant, search, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);

    const { rows, total } = await campaignRepo.findRecipients(req.params.id, {
      status,
      variant: variant === 'A' || variant === 'B' ? variant : undefined,
      search:  search?.trim() || undefined,
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

    // Render variant A HTML
    let htmlSnapshot = campaign.html_snapshot;
    if (!htmlSnapshot && campaign.template) {
      htmlSnapshot = campaign.template.source_type === 'html'
        ? campaign.template.html_output
        : renderTemplate(campaign.template.json_structure, {});
    }
    if (!htmlSnapshot) {
      return sendError(res, 'No template or HTML content found for this campaign.', 400);
    }

    const updateData = { status: 'running', html_snapshot: htmlSnapshot };

    // A/B test: split recipients 50/50 and render variant B HTML
    if (campaign.ab_subject_b) {
      const pendingIds = await campaignRepo.findPendingRecipientIds(campaign.id);
      const half = Math.floor(pendingIds.length / 2);
      if (half > 0) {
        await campaignRepo.assignVariants(campaign.id, pendingIds.slice(half));
      }

      let htmlB = campaign.ab_html_snapshot;
      if (!htmlB) {
        let templateB = campaign.template;
        if (campaign.ab_template_id_b && campaign.ab_template_id_b !== campaign.template_id) {
          const tB = await prisma.email_template.findUnique({ where: { id: campaign.ab_template_id_b } });
          if (tB) templateB = tB;
        }
        if (templateB) {
          htmlB = templateB.source_type === 'html'
            ? templateB.html_output
            : renderTemplate(templateB.json_structure, {});
        }
      }
      updateData.ab_html_snapshot = htmlB || htmlSnapshot;
    }

    const updated = await campaignRepo.updateCampaign(campaign.id, updateData);

    sendSuccess(res, {
      ok:            true,
      campaign_id:   updated.id,
      status:        updated.status,
      pending_count: pendingCount,
      ab_enabled:    !!campaign.ab_subject_b,
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

export async function resendCampaign(req, res) {
  const { statuses } = req.body ?? {};

  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (campaign.status === 'running') return sendError(res, 'Campaign is already running.', 409);

    const RESENDABLE = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'];
    const toReset = (!statuses || statuses.length === 0 || statuses.includes('all'))
      ? RESENDABLE
      : statuses.filter(s => RESENDABLE.includes(s));

    if (toReset.length === 0) return sendError(res, 'No valid statuses selected.', 400);

    // Reset matching recipients — clear all delivery state so the worker picks them up fresh
    const { count } = await prisma.campaign_recipient.updateMany({
      where: { campaign_id: req.params.id, status: { in: toReset } },
      data:  {
        status:        'pending',
        attempts:      0,
        message_id:    '',
        error_message: '',
        sent_at:       null,
        delivered_at:  null,
        opened_at:     null,
        clicked_at:    null,
        bounced_at:    null,
      },
    });

    if (count === 0) return sendError(res, 'No recipients found with the selected statuses.', 400);

    // Recalculate campaign aggregates from remaining non-pending/queued rows
    const groups = await prisma.campaign_recipient.groupBy({
      by:    ['status'],
      where: { campaign_id: req.params.id },
      _count: { status: true },
    });
    const c = Object.fromEntries(groups.map(g => [g.status, g._count.status]));
    const sentStatuses = ['sent', 'delivered', 'opened', 'clicked', 'bounced'];

    await campaignRepo.updateCampaign(req.params.id, {
      status:        'running',
      sent_count:    sentStatuses.reduce((acc, s) => acc + (c[s] || 0), 0),
      opened_count:  (c.opened || 0) + (c.clicked || 0),
      clicked_count: c.clicked  || 0,
      bounced_count: c.bounced  || 0,
      failed_count:  c.failed   || 0,
    });

    sendSuccess(res, {
      ok:      true,
      queued:  count,
      message: `${count} recipient${count === 1 ? '' : 's'} re-queued for delivery.`,
    });
  } catch (err) {
    sendServerError(res, err, 'resendCampaign');
  }
}

// Status priority — higher value wins; bounced is always terminal
const STATUS_PRIORITY = { pending: 1, queued: 2, sent: 3, delivered: 4, opened: 5, clicked: 6, bounced: 7, failed: 0 };

function resendEventToStatus(event) {
  switch (event) {
    case 'delivered':        return 'delivered';
    case 'opened':           return 'opened';
    case 'clicked':          return 'clicked';
    case 'bounced':          return 'bounced';
    case 'complained':       return 'bounced';
    case 'failed':           return 'failed';
    case 'sent':             return 'sent';
    default:                 return null; // delivery_delayed, queued, cancelled — ignore
  }
}

/**
 * Pull latest email statuses from Resend for every sent recipient and update the DB.
 * Works without webhooks — useful for local dev and as a manual refresh.
 */
export async function getRecipientEvents(req, res) {
  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);

    const events = await campaignRepo.getRecipientEvents(req.params.rid);
    sendSuccess(res, events);
  } catch (err) {
    sendServerError(res, err, 'getRecipientEvents');
  }
}

export async function syncCampaign(req, res) {
  try {
    const campaign = await campaignRepo.findTenantById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (!canAccessTenant(req, campaign.prophone_id)) return sendError(res, 'Forbidden', 403);

    // Get all recipients that have a Resend message_id
    const recipients = await prisma.campaign_recipient.findMany({
      where: { campaign_id: campaign.id, message_id: { not: '' } },
      select: { id: true, message_id: true, status: true, campaign_id: true },
    });

    if (recipients.length === 0) {
      return sendSuccess(res, { updated: 0, message: 'No sent recipients to sync.' });
    }

    let updated = 0;
    const now = new Date();

    for (const r of recipients) {
      const result = await getEmailStatus(r.message_id);
      if (!result?.status) continue;

      const newStatus = resendEventToStatus(result.status);
      if (!newStatus) continue;

      const currentPriority = STATUS_PRIORITY[r.status] ?? 0;
      const newPriority     = STATUS_PRIORITY[newStatus] ?? 0;

      // Only advance — never regress (bounced is always terminal)
      if (newPriority <= currentPriority && newStatus !== 'bounced') continue;

      const data = { status: newStatus };
      if (newStatus === 'delivered' && !r.delivered_at) data.delivered_at = now;
      if (newStatus === 'opened'    && !r.opened_at)    data.opened_at    = now;
      if (newStatus === 'clicked'   && !r.clicked_at)   data.clicked_at   = now;
      if (newStatus === 'bounced'   && !r.bounced_at)   data.bounced_at   = now;

      await prisma.campaign_recipient.update({ where: { id: r.id }, data });
      updated++;
    }

    // Recount all campaign aggregates from scratch
    const counts = await prisma.campaign_recipient.groupBy({
      by: ['status'],
      where: { campaign_id: campaign.id },
      _count: { status: true },
    });
    const byStatus = Object.fromEntries(counts.map(c => [c.status, c._count.status]));

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        sent_count:    (byStatus.sent    || 0) + (byStatus.delivered || 0) + (byStatus.opened || 0) + (byStatus.clicked || 0) + (byStatus.bounced || 0),
        opened_count:  (byStatus.opened  || 0) + (byStatus.clicked   || 0),
        clicked_count:  byStatus.clicked  || 0,
        bounced_count:  byStatus.bounced  || 0,
        failed_count:   byStatus.failed   || 0,
      },
    });

    sendSuccess(res, { updated, total_checked: recipients.length });
  } catch (err) {
    sendServerError(res, err, 'syncCampaign');
  }
}
