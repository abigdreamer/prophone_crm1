import prisma from '../lib/prisma.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as repo from '../repositories/campaignRepository.js';
import * as templateRepo from '../repositories/emailTemplateRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION, ACTIVITY_TYPE } from '../constants/index.js';
import { sendBatchEmails } from '../services/resendService.js';
import { substituteIntoHtml, renderTemplate, applyTracking } from '../services/htmlRenderer.js';
import {
  htmlToPlainText,
  injectUnsubscribeFooter,
  buildEmailHeaders,
  buildUnsubUrl,
} from '../services/email.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

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

const SEND_BATCH_SIZE  = 100;
const BATCH_DELAY_MS   = parseInt(process.env.CAMPAIGN_BATCH_DELAY_MS || '0', 10);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const sendCampaign = async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sending') return sendError(res, 'Campaign is already sending', 400);
    if (!campaign.templateId)          return sendError(res, 'Campaign has no template selected', 400);

    const sendLimit = req.body?.limit ? parseInt(req.body.limit, 10) : null;

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

    // Load pending recipients — apply optional cap so large lists can be sent in batches over time
    const allRecipients = await repo.findPendingRecipientsForSend(campaignId, sendLimit || null);
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

    const sentContactIds = [];

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
          repo.markRecipientSent(e._recipientId, results[j]?.id || null, campaignId),
        ));

        batch.filter(r => r.contact?.email?.includes('@') && r.contact?.id)
          .forEach(r => sentContactIds.push(r.contact.id));

        totalSent += emails.length;
      } catch (batchErr) {
        console.error(`[sendCampaign] batch ${Math.floor(i / SEND_BATCH_SIZE) + 1} error:`, batchErr.message);
      }

      // Rate-limit: pause between batches to avoid triggering spam filters
      if (BATCH_DELAY_MS > 0 && i + SEND_BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    await repo.updateCampaign(campaignId, {
      status:      'sent',
      sentCount:   { increment: totalSent },
      completedAt: new Date(),
    });

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, campaignId, ACTION.SEND, `Campaign sent to ${totalSent} recipients`, by);

    // Log email_sent activity per contact
    if (sentContactIds.length) {
      await prisma.activity.createMany({
        data: sentContactIds.map(contactId => ({
          entityType: ENTITY_TYPE.CONTACT,
          entityId:   contactId,
          type:       ACTIVITY_TYPE.EMAIL_SENT,
          note:       `Campaign email sent: "${campaign.name}"`,
          by,
        })),
        skipDuplicates: true,
      });
    }

    sendSuccess(res, await repo.findById(campaignId));
  } catch (err) {
    await repo.updateCampaign(campaignId, { status: 'draft' }).catch(() => {});
    sendServerError(res, err, 'sendCampaign');
  }
};

// ── Send to specific contacts (single or bulk quick-send) ─────────────────────

export const sendToContacts = async (req, res) => {
  const campaignId = req.params.id;
  const { contactIds, domainFilter } = req.body ?? {};

  if (!Array.isArray(contactIds) || !contactIds.length) {
    return sendError(res, 'contactIds array is required', 400);
  }

  let previousStatus = 'draft';

  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    previousStatus = campaign.status ?? 'draft';
    if (!campaign.templateId)           return sendError(res, 'Campaign has no template selected', 400);
    if (campaign.status === 'sending')  return sendError(res, 'Campaign is currently sending', 400);

    const template = await templateRepo.findById(campaign.templateId);
    if (!template) return sendError(res, 'Template not found — it may have been deleted', 404);

    // Resolve from-email
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

    // Fetch contacts — skip canceled, require email
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, isCanceled: false },
      select: { id: true, firstName: true, lastName: true, email: true, company: true },
    });

    // Apply optional domain filter (@gmail.com, @yahoo.com, etc.)
    const domains = Array.isArray(domainFilter) && domainFilter.length
      ? domainFilter.map(d => d.toLowerCase().replace(/^@/, ''))
      : null;

    let filtered = contacts.filter(c => c.email?.includes('@'));
    if (domains) {
      filtered = filtered.filter(c => {
        const emailDomain = c.email.split('@')[1]?.toLowerCase();
        return domains.includes(emailDomain);
      });
    }

    // Deduplicate by lowercased email address
    const seen = new Set();
    const deduped = filtered.filter(c => {
      const key = c.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!deduped.length) {
      return sendError(res, 'No eligible contacts match the selected filters', 400);
    }

    // Suppress previously bounced / unsubscribed contacts
    const dedupedIds = deduped.map(c => c.id);
    const suppressedIds = await repo.findSuppressedContactIds(dedupedIds);
    const toSend = deduped.filter(c => !suppressedIds.has(c.id));

    if (!toSend.length) {
      return sendError(res, 'All matched contacts are suppressed (bounced or unsubscribed)', 400);
    }

    // Only create recipient rows for contacts not already in the campaign.
    // Never reset contacts who have already received the email (item 6).
    await repo.addRecipients(campaignId, toSend.map(c => c.id));

    // Fetch the pending recipient rows for these contacts
    const pendingRecipients = await repo.findPendingRecipientsForContacts(campaignId, toSend.map(c => c.id));

    // Mark as sending before we start (same pattern as sendCampaign)
    await repo.updateCampaign(campaignId, {
      status:  'sending',
      sentAt:  campaign.sentAt || new Date(),
    });

    const trackingBase = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
    const unsubSecret  = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';
    let totalSent = 0;
    const sentContactIdsQuick = [];

    for (let i = 0; i < pendingRecipients.length; i += SEND_BATCH_SIZE) {
      const batch = pendingRecipients.slice(i, i + SEND_BATCH_SIZE);

      const emails = batch
        .filter(r => r.contact?.email?.includes('@'))
        .map(r => {
          const vars = {
            firstName: r.contact.firstName || '',
            lastName:  r.contact.lastName  || '',
            fullName:  `${r.contact.firstName || ''} ${r.contact.lastName || ''}`.trim(),
            email:     r.contact.email     || '',
            company:   r.contact.company   || '',
          };

          let html = template.htmlOutput
            ? substituteIntoHtml(template.htmlOutput, vars)
            : renderTemplate(template.body, vars);

          if (trackingBase) html = applyTracking(html, campaignId, r.id, trackingBase);

          const unsubUrl = (trackingBase && unsubSecret)
            ? buildUnsubUrl(trackingBase, r.id, unsubSecret)
            : null;
          if (unsubUrl) html = injectUnsubscribeFooter(html, unsubUrl);

          const text    = htmlToPlainText(html);
          const headers = unsubUrl ? buildEmailHeaders(unsubUrl) : undefined;

          return {
            _recipientId: r.id,
            to:       r.contact.email,
            from:     fromEmail,
            fromName: campaign.fromName || '',
            subject:  campaign.subject || template.subject || template.name,
            html, text, headers,
          };
        });

      if (!emails.length) continue;

      try {
        const results = await sendBatchEmails(emails);
        await Promise.all(emails.map((e, j) =>
          repo.markRecipientSent(e._recipientId, results[j]?.id || null, campaignId),
        ));
        batch.filter(r => r.contact?.email?.includes('@') && r.contact?.id)
          .forEach(r => sentContactIdsQuick.push(r.contact.id));
        totalSent += emails.length;
      } catch (batchErr) {
        console.error('[sendToContacts] batch error:', batchErr.message);
      }

      if (BATCH_DELAY_MS > 0 && i + SEND_BATCH_SIZE < pendingRecipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Mark sent — same fields as sendCampaign so the campaigns list shows correct status/stats
    await repo.updateCampaign(campaignId, {
      status:      'sent',
      sentCount:   { increment: totalSent },
      completedAt: new Date(),
    });

    const by = req.user?.name || req.user?.email || 'system';
    logActivity(ENTITY_TYPE.CAMPAIGN, campaignId, ACTION.SEND,
      `Quick-sent to ${totalSent} contact${totalSent !== 1 ? 's' : ''}`, by);

    // Log email_sent activity per contact
    if (sentContactIdsQuick.length) {
      await prisma.activity.createMany({
        data: sentContactIdsQuick.map(contactId => ({
          entityType: ENTITY_TYPE.CONTACT,
          entityId:   contactId,
          type:       ACTIVITY_TYPE.EMAIL_SENT,
          note:       `Campaign email sent: "${campaign.name}"`,
          by,
        })),
        skipDuplicates: true,
      });
    }

    sendSuccess(res, {
      sent:    totalSent,
      skipped: contactIds.length - totalSent,
      total:   contactIds.length,
    });
  } catch (err) {
    // Roll back to previous status so the campaign isn't stuck in 'sending'
    await repo.updateCampaign(campaignId, { status: previousStatus ?? 'draft' }).catch(() => {});
    sendServerError(res, err, 'sendToContacts');
  }
};

// ── Resend ────────────────────────────────────────────────────────────────────

// 'sent' and 'delivered' = received but did not open (non-openers).
// 'bounced' and 'pending' are also valid resend targets when explicitly requested.
const VALID_RESEND_STATUSES = ['pending', 'sent', 'delivered', 'bounced'];

export const resendCampaign = async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);
    if (campaign.status === 'sending') return sendError(res, 'Campaign is currently sending', 400);
    if (!campaign.templateId) return sendError(res, 'Campaign has no template selected', 400);

    // Which recipient statuses to resend to.
    // Default: 'sent' + 'delivered' = contacts who received but did not open.
    // Resend never adds new contacts — only retargets existing recipients.
    const raw = req.body?.recipientStatuses;
    const statuses = Array.isArray(raw)
      ? raw.filter(s => VALID_RESEND_STATUSES.includes(s))
      : ['sent', 'delivered'];
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
          repo.markRecipientSent(e._recipientId, results[j]?.id || null, campaignId),
        ));
        totalSent += emails.length;
      } catch (batchErr) {
        console.error(`[resendCampaign] batch error:`, batchErr.message);
      }

      if (BATCH_DELAY_MS > 0 && i + SEND_BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    await repo.updateCampaign(campaignId, { status: 'sent', sentCount: { increment: totalSent } });

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

    const [statusGroups, sends, eventStats] = await Promise.all([
      repo.groupRecipientsByStatus(req.params.id),
      repo.getSendAnalytics(req.params.id),
      repo.getStatisticsFromEvents(req.params.id),
    ]);

    const counts = {};
    for (const g of statusGroups) counts[g.status] = g._count.status;

    const total     = campaign.recipientsCount || 1;
    // Primary: event-based counts (unique recipient per event type — most accurate).
    // Fallback: campaign-level counters → status-group counts for legacy data pre-events.
    const sent      = eventStats.sent         || campaign.sentCount         || counts.sent          || 0;
    const delivered = eventStats.delivered    || campaign.deliveredCount    || counts.delivered     || 0;
    const opened    = eventStats.opened       || campaign.openedCount       || counts.opened        || 0;
    const clicked   = eventStats.clicked      || campaign.clickedCount      || counts.clicked       || 0;
    const bounced   = eventStats.bounced      || campaign.bouncedCount      || counts.bounced       || 0;
    const unsubbed  = eventStats.unsubscribed || campaign.unsubscribedCount || counts.unsubscribed  || 0;

    const base = sent || total;

    // Per-send aggregates (unique opens and total opens grouped by send_id)
    const totalUniqueOpens = sends.reduce((n, s) => n + s.uniqueOpen,  0);
    const totalRawOpens    = sends.reduce((n, s) => n + s.totalOpen,   0);
    const totalRawClicks   = sends.reduce((n, s) => n + s.totalClicks, 0);

    sendSuccess(res, {
      totals: { total, sent, delivered, opened, clicked, bounced, unsubscribed: unsubbed },
      rates: {
        openRate:        base ? +(opened  / base * 100).toFixed(1) : 0,
        clickRate:       base ? +(clicked / base * 100).toFixed(1) : 0,
        bounceRate:      base ? +(bounced / base * 100).toFixed(1) : 0,
        deliveryRate:    base ? +(delivered / base * 100).toFixed(1) : 0,
        unsubscribeRate: base ? +(unsubbed / base * 100).toFixed(1) : 0,
      },
      // Per-send breakdown: each entry is one send instance for one contact
      sends,
      sendSummary: {
        totalSends:       sends.length,
        totalUniqueOpens,
        totalRawOpens,
        totalRawClicks,
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

// ── Export ────────────────────────────────────────────────────────────────────

export const exportCampaign = async (req, res) => {
  const { format = 'excel', sheets = '' } = req.query;
  const campaignId = req.params.id;

  try {
    const campaign = await repo.findById(campaignId);
    if (!campaign) return sendError(res, 'Campaign not found', 404);

    const [eventStats, { rows: allRecipients }] = await Promise.all([
      repo.getStatisticsFromEvents(campaignId),
      repo.findRecipients(campaignId, { limit: 10000 }),
    ]);

    const sent      = eventStats.sent         || campaign.sentCount         || 0;
    const delivered = eventStats.delivered    || campaign.deliveredCount    || 0;
    const opened    = eventStats.opened       || campaign.openedCount       || 0;
    const clicked   = eventStats.clicked      || campaign.clickedCount      || 0;
    const bounced   = eventStats.bounced      || campaign.bouncedCount      || 0;
    const unsubbed  = eventStats.unsubscribed || campaign.unsubscribedCount || 0;

    const base = sent || 1;
    const stats = {
      sent, delivered, opened, clicked, bounced, unsubscribed: unsubbed,
      openRate:    +((opened  / base) * 100).toFixed(1),
      clickRate:   +((clicked / base) * 100).toFixed(1),
      bounceRate:  +((bounced / base) * 100).toFixed(1),
    };

    const filename = campaign.name.replace(/[^a-z0-9]/gi, '_');

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER', bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      doc.pipe(res);

      // Header bar
      doc.rect(0, 0, 612, 72).fillColor('#0f0f13').fill();
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('ProPhone', 50, 20);
      doc.fillColor('#a855f7').fontSize(9).font('Helvetica').text('CRM — Campaign Report', 50, 46);
      doc.fillColor('#cccccc').fontSize(13).font('Helvetica-Bold')
        .text(campaign.name, 200, 28, { width: 362, align: 'right' });

      let y = 90;

      // Campaign metadata
      const metaRows = [
        ['Subject',   campaign.subject || '—'],
        ['From',      (campaign.fromName ? campaign.fromName + ' ' : '') + `<${campaign.fromEmail || '—'}>`],
        ['Template',  campaign.template?.name || '—'],
        ['Status',    (campaign.status || '—').toUpperCase()],
        ['Sent At',   campaign.sentAt     ? new Date(campaign.sentAt).toLocaleString()     : '—'],
        ['Completed', campaign.completedAt ? new Date(campaign.completedAt).toLocaleString() : '—'],
      ];
      for (const [label, value] of metaRows) {
        doc.fillColor('#888888').fontSize(9).font('Helvetica').text(label + ':', 50, y, { width: 90 });
        doc.fillColor('#222222').fontSize(9).font('Helvetica').text(value, 145, y, { width: 417 });
        y += 17;
      }

      y += 8;
      doc.moveTo(50, y).lineTo(562, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
      y += 18;

      // Stats grid (3 columns)
      doc.fillColor('#222222').fontSize(12).font('Helvetica-Bold').text('Campaign Summary', 50, y);
      y += 16;

      const statBoxes = [
        { label: 'Sent',         value: stats.sent,          rate: null },
        { label: 'Delivered',    value: stats.delivered,     rate: null },
        { label: 'Opened',       value: stats.opened,        rate: `${stats.openRate}%`   },
        { label: 'Clicked',      value: stats.clicked,       rate: `${stats.clickRate}%`  },
        { label: 'Bounced',      value: stats.bounced,       rate: `${stats.bounceRate}%` },
        { label: 'Unsubscribed', value: stats.unsubscribed,  rate: null },
      ];
      const COLS = 3, BOX_W = 162, BOX_H = 54, GAP_X = 5, GAP_Y = 8;
      statBoxes.forEach((s, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const bx = 50 + col * (BOX_W + GAP_X);
        const by = y + row * (BOX_H + GAP_Y);
        doc.rect(bx, by, BOX_W, BOX_H).fillColor('#f5f5f5').fill();
        doc.rect(bx, by, BOX_W, BOX_H).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
        doc.fillColor('#888888').fontSize(7).font('Helvetica').text(s.label.toUpperCase(), bx + 10, by + 9);
        doc.fillColor('#111111').fontSize(18).font('Helvetica-Bold').text(String(s.value), bx + 10, by + 20);
        if (s.rate) doc.fillColor('#666666').fontSize(8).font('Helvetica').text(s.rate, bx + BOX_W - 38, by + 9);
      });
      y += Math.ceil(statBoxes.length / COLS) * (BOX_H + GAP_Y) + 12;

      doc.moveTo(50, y).lineTo(562, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
      y += 16;

      // Recipients table
      doc.fillColor('#222222').fontSize(12).font('Helvetica-Bold')
        .text(`Recipients (${allRecipients.length})`, 50, y);
      y += 16;

      const TABLE_COLS = [
        { label: 'NAME',   x: 50,  w: 112 },
        { label: 'EMAIL',  x: 167, w: 178 },
        { label: 'STATUS', x: 350, w: 68  },
        { label: 'STAGE',  x: 423, w: 68  },
        { label: 'OPENED', x: 496, w: 66  },
      ];

      const drawTableHeader = (startY) => {
        doc.rect(50, startY, 512, 16).fillColor('#2d2d2d').fill();
        doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
        for (const c of TABLE_COLS) doc.text(c.label, c.x + 4, startY + 5, { width: c.w - 4 });
        return startY + 18;
      };

      y = drawTableHeader(y);
      doc.fontSize(7.5).font('Helvetica');
      let rowIdx = 0;
      for (const r of allRecipients) {
        if (y > 720) { doc.addPage(); y = drawTableHeader(50); doc.fontSize(7.5).font('Helvetica'); }
        if (rowIdx % 2 === 0) doc.rect(50, y - 1, 512, 13).fillColor('#f9f9f9').fill();
        doc.fillColor('#222222');
        const name    = (`${r.contact?.firstName || ''} ${r.contact?.lastName || ''}`.trim() || '—').slice(0, 19);
        const email   = (r.contact?.email || '—').slice(0, 28);
        const status  = (r.status || '—');
        const stage   = (r.contact?.lifecycleStage || '—').slice(0, 11);
        const opened  = r.openedAt ? new Date(r.openedAt).toLocaleDateString() : '—';
        doc.text(name,   54,  y + 2, { width: 108 });
        doc.text(email,  171, y + 2, { width: 174 });
        doc.text(status, 354, y + 2, { width: 64 });
        doc.text(stage,  427, y + 2, { width: 64 });
        doc.text(opened, 500, y + 2, { width: 62 });
        y += 13;
        rowIdx++;
      }

      // Footer on every page
      const range = doc.bufferedPageRange();
      const generatedAt = new Date().toLocaleString();
      for (let p = 0; p < range.count; p++) {
        doc.switchToPage(range.start + p);
        doc.fillColor('#aaaaaa').fontSize(7).font('Helvetica')
          .text(`ProPhone CRM  ·  Generated ${generatedAt}  ·  Page ${p + 1} of ${range.count}`,
            50, 770, { width: 512, align: 'center' });
      }

      doc.end();
      return;
    }

    // ── Excel ────────────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // Summary sheet (always included)
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['ProPhone CRM — Campaign Report'],
      [],
      ['Campaign Name', campaign.name],
      ['Status',        campaign.status],
      ['Subject',       campaign.subject || ''],
      ['From',          (campaign.fromName ? campaign.fromName + ' ' : '') + `<${campaign.fromEmail || ''}>`],
      ['Template',      campaign.template?.name || ''],
      ['Sent At',       campaign.sentAt     ? new Date(campaign.sentAt).toLocaleString()     : ''],
      ['Completed At',  campaign.completedAt ? new Date(campaign.completedAt).toLocaleString() : ''],
      [],
      ['Metric',        'Count', 'Rate'],
      ['Sent',          stats.sent,          ''],
      ['Delivered',     stats.delivered,     ''],
      ['Opened',        stats.opened,        `${stats.openRate}%`],
      ['Clicked',       stats.clicked,       `${stats.clickRate}%`],
      ['Bounced',       stats.bounced,       `${stats.bounceRate}%`],
      ['Unsubscribed',  stats.unsubscribed,  ''],
      [],
      ['Report generated', new Date().toLocaleString()],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const toRow = (r) => ({
      'First Name':    r.contact?.firstName        || '',
      'Last Name':     r.contact?.lastName         || '',
      'Email':         r.contact?.email            || '',
      'Company':       r.contact?.company          || '',
      'Stage':         r.contact?.lifecycleStage   || '',
      'Status':        r.status                    || '',
      'Sent At':       r.sentAt    ? new Date(r.sentAt).toLocaleString()    : '',
      'Opened At':     r.openedAt  ? new Date(r.openedAt).toLocaleString()  : '',
      'Clicked At':    r.clickedAt ? new Date(r.clickedAt).toLocaleString() : '',
      'Bounced At':    r.bouncedAt ? new Date(r.bouncedAt).toLocaleString() : '',
      'Unsubscribed At': r.unsubscribedAt ? new Date(r.unsubscribedAt).toLocaleString() : '',
    });

    const SHEET_DEFS = {
      all:          { label: 'All Recipients', filter: () => true },
      sent:         { label: 'Sent',           filter: r => r.status === 'sent' },
      delivered:    { label: 'Delivered',      filter: r => r.status === 'delivered' },
      opened:       { label: 'Opened',         filter: r => r.status === 'opened' },
      clicked:      { label: 'Clicked',        filter: r => r.status === 'clicked' },
      bounced:      { label: 'Bounced',        filter: r => r.status === 'bounced' },
      unsubscribed: { label: 'Unsubscribed',   filter: r => r.status === 'unsubscribed' },
    };

    const requestedSheets = sheets
      ? sheets.split(',').map(s => s.trim().toLowerCase()).filter(s => SHEET_DEFS[s])
      : ['all'];

    for (const key of requestedSheets) {
      const def = SHEET_DEFS[key];
      const rows = allRecipients.filter(def.filter).map(toRow);
      const sheet = XLSX.utils.json_to_sheet(
        rows.length ? rows : [{ Note: 'No recipients in this category' }],
      );
      XLSX.utils.book_append_sheet(wb, sheet, def.label);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    sendServerError(res, err, 'exportCampaign');
  }
};

// ── Published templates list (for wizard step 2) ──────────────────────────────

export const listPublishedTemplates = async (req, res) => {
  try {
    const { clientId } = req.query;
    const where = { status: 'published' };
    if (clientId) where.clientId = clientId;
    const rows = await templateRepo.findMany(where);
    // Backfill fromEmail from body.from for legacy templates saved before the column existed
    const enriched = rows.map(t => ({
      ...t,
      fromEmail: t.fromEmail || (typeof t.body === 'object' ? t.body?.from : null) || '',
    }));
    sendSuccess(res, enriched);
  } catch (err) {
    sendServerError(res, err, 'listPublishedTemplates');
  }
};
