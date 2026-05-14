import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as repo from '../repositories/campaignRepository.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION } from '../constants/index.js';
import { sendBatch as sendBatchEmails } from '../services/emailProvider/index.js';
import { substituteIntoHtml, renderTemplate, applyTracking } from '../services/htmlRenderer.js';
import {
  htmlToPlainText,
  injectUnsubscribeFooter,
  buildEmailHeaders,
  buildUnsubUrl,
} from '../services/email.js';

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
  const {
    name, type = 'regular', clientId, templateId, templateIdB,
    subject, subjectB, fromName, fromEmail,
  } = req.body ?? {};
  if (!name) return sendError(res, 'name is required', 400);

  try {
    let resolvedSubject = subject || '';
    if (templateId && !resolvedSubject) {
      const tmpl = await templateRepo.findById(templateId);
      resolvedSubject = tmpl?.subject || '';
    }

    const row = await repo.createCampaign({
      name, type, status: 'draft',
      clientId:    clientId    || null,
      templateId:  templateId  || null,
      templateIdB: templateIdB || null,
      subject:     resolvedSubject,
      subjectB:    subjectB  || '',
      fromName:    fromName  || '',
      fromEmail:   fromEmail || '',
    });

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, row.id, ACTION.CREATE, `Campaign created: ${row.name}`, by);

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
    if (name        !== undefined) data.name        = name;
    if (status      !== undefined) data.status      = status;
    if (templateId  !== undefined) data.templateId  = templateId;
    if (templateIdB !== undefined) data.templateIdB = templateIdB;
    if (subject     !== undefined) data.subject     = subject;
    if (subjectB    !== undefined) data.subjectB    = subjectB;
    if (fromName    !== undefined) data.fromName    = fromName;
    if (fromEmail   !== undefined) data.fromEmail   = fromEmail;

    const row = await repo.updateCampaign(req.params.id, data);

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, row.id, ACTION.UPDATE, `Campaign updated: ${row.name}`, by);

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

export const cancelCampaign = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    if (existing.status === 'sending') return sendError(res, 'Cannot cancel a campaign that is currently sending', 400);
    const cancelReason = (req.body?.cancelReason || '').trim();
    const row = await repo.cancelCampaign(req.params.id, cancelReason);
    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, row.id, ACTION.CANCEL, cancelReason || 'Campaign canceled', by);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'cancelCampaign');
  }
};

export const restoreCampaign = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Campaign not found', 404);
    const row = await repo.restoreCampaign(req.params.id);
    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, row.id, ACTION.RESTORE, 'Campaign restored', by);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'restoreCampaign');
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
  const { filter } = req.query;
  try {
    // Always derive clientId from the campaign record — never trust the request
    const campaign = await repo.findById(req.params.id);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    const contacts = await repo.getContactsForFilter(campaign.clientId, filter);
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

const SEND_BATCH_SIZE = 100;

export const sendCampaign = async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sent')    return sendError(res, 'Campaign already sent', 400);
    if (campaign.status === 'sending') return sendError(res, 'Campaign is already sending', 400);
    if (!campaign.templateId)          return sendError(res, 'Campaign has no template selected', 400);

    // Fetch template(s)
    const template = await templateRepo.findById(campaign.templateId);
    if (!template) return sendError(res, 'Template not found — it may have been deleted', 404);

    const templateB = campaign.templateIdB
      ? await templateRepo.findById(campaign.templateIdB)
      : null;

    // Resolve sender address: campaign field → verified client domain → env fallback
    let fromEmail = campaign.fromEmail?.trim() || '';
    if (!fromEmail) {
      const clientDomain = await domainRepo.findFirstVerified(campaign.clientId);
      if (clientDomain) {
        fromEmail = clientDomain.defaultFromEmail || `noreply@${clientDomain.domainName}`;
      } else {
        const anyDomain = await domainRepo.findAnyVerified();
        fromEmail = anyDomain
          ? (anyDomain.defaultFromEmail || `noreply@${anyDomain.domainName}`)
          : (process.env.RESEND_FROM_EMAIL || '');
      }
    }
    if (!fromEmail) {
      return sendError(res, 'No sender email configured. Add a verified domain or set RESEND_FROM_EMAIL.', 400);
    }

    // Load all pending recipients with contact data (no pagination — need all for send)
    const allRecipients = await repo.findPendingRecipientsForSend(campaignId);
    if (!allRecipients.length) return sendError(res, 'No pending recipients', 400);

    // Suppress contacts that have previously bounced or unsubscribed
    const contactIds = allRecipients.map(r => r.contactId).filter(Boolean);
    const suppressedIds = await repo.findSuppressedContactIds(contactIds);
    const recipients = allRecipients.filter(r => !suppressedIds.has(r.contactId));

    if (!recipients.length) return sendError(res, 'All recipients are suppressed (previously bounced or unsubscribed)', 400);

    // Idempotency: mark as sending before we start
    await repo.updateCampaign(campaignId, { status: 'sending', sentAt: new Date() });

    const trackingBase  = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
    const unsubSecret   = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';
    let totalSent = 0;

    if (!trackingBase) {
      console.warn('[sendCampaign] APP_BASE_URL not set — open/click tracking disabled');
    }

    for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
      const batch = recipients.slice(i, i + SEND_BATCH_SIZE);

      // Build email payload — filter out contacts with no email address
      const emails = batch
        .filter(r => r.contact?.email?.includes('@'))
        .map(r => {
          const isB   = campaign.type === 'ab_test' && r.abVariant === 'B';
          const tmpl  = isB && templateB ? templateB : template;
          const subj  = (isB && campaign.subjectB) ? campaign.subjectB
                        : (campaign.subject || tmpl.subject || tmpl.name);

          const vars = {
            firstName: r.contact.firstName || '',
            lastName:  r.contact.lastName  || '',
            fullName:  `${r.contact.firstName || ''} ${r.contact.lastName || ''}`.trim(),
            email:     r.contact.email     || '',
            company:   r.contact.company   || '',
          };

          // Prefer stored HTML snapshot; fall back to server-side render
          let html = tmpl.htmlOutput
            ? substituteIntoHtml(tmpl.htmlOutput, vars)
            : renderTemplate(tmpl.body, vars);

          if (trackingBase) {
            html = applyTracking(html, campaignId, r.id, trackingBase);
          }

          // Unsubscribe URL (per-recipient HMAC token — requires secret)
          const unsubUrl = (trackingBase && unsubSecret)
            ? buildUnsubUrl(trackingBase, r.id, unsubSecret)
            : null;
          if (unsubUrl) html = injectUnsubscribeFooter(html, unsubUrl);

          const text    = htmlToPlainText(html);
          const headers = unsubUrl ? buildEmailHeaders(unsubUrl) : undefined;

          return {
            _recipientId: r.id,
            to:           r.contact.email,
            from:         fromEmail,
            fromName:     campaign.fromName || '',
            subject:      subj,
            html,
            text,
            headers,
          };
        });

      if (!emails.length) continue;

      try {
        const results = await sendBatchEmails(emails);

        await Promise.all(emails.map((e, j) =>
          repo.markRecipientSent(e._recipientId, results[j]?.id || null),
        ));

        totalSent += emails.length;
      } catch (batchErr) {
        // Log but continue with remaining batches; partial sends still count
        console.error(`[sendCampaign] batch ${Math.floor(i / SEND_BATCH_SIZE) + 1} error:`, batchErr.message);
      }
    }

    await repo.updateCampaign(campaignId, {
      status:      'sent',
      sentCount:   totalSent,
      completedAt: new Date(),
    });

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, campaignId, ACTION.SEND, `Campaign sent to ${totalSent} recipients`, by);

    sendSuccess(res, await repo.findById(campaignId));
  } catch (err) {
    await repo.updateCampaign(campaignId, { status: 'draft' }).catch(() => {});
    sendServerError(res, err, 'sendCampaign');
  }
};

// ── Resend ────────────────────────────────────────────────────────────────────

const VALID_RESEND_STATUSES = ['pending', 'sent', 'delivered', 'bounced'];

export const resendCampaign = async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sending') return sendError(res, 'Campaign is currently sending', 400);
    if (!campaign.templateId) return sendError(res, 'Campaign has no template selected', 400);

    // Which recipient statuses to resend to
    const raw = req.body?.recipientStatuses;
    const statuses = Array.isArray(raw)
      ? raw.filter(s => VALID_RESEND_STATUSES.includes(s))
      : ['bounced'];
    if (!statuses.length) return sendError(res, 'No valid recipient statuses provided', 400);

    // Reset matching recipients back to pending
    const { count } = await repo.resetRecipientsForResend(campaignId, statuses);
    if (!count) return sendError(res, 'No recipients matched the selected filter', 400);

    const template = await templateRepo.findById(campaign.templateId);
    if (!template) return sendError(res, 'Template not found — it may have been deleted', 404);

    const templateB = campaign.templateIdB
      ? await templateRepo.findById(campaign.templateIdB)
      : null;

    let fromEmail = campaign.fromEmail?.trim() || '';
    if (!fromEmail) {
      const clientDomain = await domainRepo.findFirstVerified(campaign.clientId);
      if (clientDomain) {
        fromEmail = clientDomain.defaultFromEmail || `noreply@${clientDomain.domainName}`;
      } else {
        const anyDomain = await domainRepo.findAnyVerified();
        fromEmail = anyDomain
          ? (anyDomain.defaultFromEmail || `noreply@${anyDomain.domainName}`)
          : (process.env.RESEND_FROM_EMAIL || '');
      }
    }
    if (!fromEmail) {
      return sendError(res, 'No sender email configured. Add a verified domain or set RESEND_FROM_EMAIL.', 400);
    }

    await repo.updateCampaign(campaignId, { status: 'sending' });

    const allRecipients = await repo.findPendingRecipientsForSend(campaignId);
    const contactIds = allRecipients.map(r => r.contactId).filter(Boolean);
    const suppressedIds = await repo.findSuppressedContactIds(contactIds);
    const recipients = allRecipients.filter(r => !suppressedIds.has(r.contactId));

    const trackingBase = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
    const unsubSecret  = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';
    let totalSent = 0;

    for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
      const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
      const emails = batch
        .filter(r => r.contact?.email?.includes('@'))
        .map(r => {
          const isB  = campaign.type === 'ab_test' && r.abVariant === 'B';
          const tmpl = isB && templateB ? templateB : template;
          const subj = (isB && campaign.subjectB) ? campaign.subjectB
                       : (campaign.subject || tmpl.subject || tmpl.name);

          const vars = {
            firstName: r.contact.firstName || '',
            lastName:  r.contact.lastName  || '',
            fullName:  `${r.contact.firstName || ''} ${r.contact.lastName || ''}`.trim(),
            email:     r.contact.email     || '',
            company:   r.contact.company   || '',
          };

          let html = tmpl.htmlOutput
            ? substituteIntoHtml(tmpl.htmlOutput, vars)
            : renderTemplate(tmpl.body, vars);

          if (trackingBase) html = applyTracking(html, campaignId, r.id, trackingBase);

          const unsubUrl = (trackingBase && unsubSecret)
            ? buildUnsubUrl(trackingBase, r.id, unsubSecret)
            : null;
          if (unsubUrl) html = injectUnsubscribeFooter(html, unsubUrl);

          const text    = htmlToPlainText(html);
          const headers = unsubUrl ? buildEmailHeaders(unsubUrl) : undefined;

          return { _recipientId: r.id, to: r.contact.email, from: fromEmail, fromName: campaign.fromName || '', subject: subj, html, text, headers };
        });

      if (!emails.length) continue;
      try {
        const results = await sendBatchEmails(emails);
        await Promise.all(emails.map((e, j) =>
          repo.markRecipientSent(e._recipientId, results[j]?.id || null),
        ));
        totalSent += emails.length;
      } catch (batchErr) {
        console.error(`[resendCampaign] batch error:`, batchErr.message);
      }
    }

    await repo.updateCampaign(campaignId, { status: 'sent', sentCount: (campaign.sentCount || 0) + totalSent });

    sendSuccess(res, await repo.findById(campaignId));
  } catch (err) {
    await repo.updateCampaign(campaignId, { status: 'sent' }).catch(() => {});
    sendServerError(res, err, 'resendCampaign');
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

// ── Duplicate campaign ────────────────────────────────────────────────────────

export const duplicateCampaign = async (req, res) => {
  try {
    const src = await repo.findById(req.params.id);
    if (!src) return sendError(res, 'Campaign not found', 404);

    const copy = await repo.createCampaign({
      name:        src.name + ' (Copy)',
      type:        src.type,
      clientId:    src.clientId,
      templateId:  src.templateId,
      templateIdB: src.templateIdB,
      subject:     src.subject,
      subjectB:    src.subjectB,
      fromName:    src.fromName,
      fromEmail:   src.fromEmail,
      status:      'draft',
    });

    const result = await repo.findById(copy.id);
    sendSuccess(res, result);
  } catch (err) {
    sendServerError(res, err, 'duplicateCampaign');
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
