/**
 * Public redirect endpoint: GET /api/tl/:id?cid=<contactId>
 *
 * Flow:
 *   1. Resolve TemplateLink + its ScoringRule and parent template's clientId.
 *   2. Validate the link's URL is safe (must start with http/https).
 *   3. Award scoring points to the contact (if contactId provided and valid).
 *   4. 302-redirect to the original URL.
 *
 * Error policy: on any failure, redirect to APP_BASE_URL — never return a 5xx
 * from a URL embedded in a sent email.
 */

import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as linkRepo from '../repositories/templateLinkRepository.js';
import { applyLinkScore } from '../services/templateLinkService.js';

const SAFE_URL_RE = /^https?:\/\//i;
const FALLBACK    = (process.env.APP_BASE_URL || '').replace(/\/$/, '') || '/';

// ── Public redirect (no auth) ─────────────────────────────────────────────────

export const redirectTemplateLink = async (req, res) => {
  try {
    const link = await linkRepo.findByIdWithTemplate(req.params.id);
    if (!link || !SAFE_URL_RE.test(link.url)) return res.redirect(302, FALLBACK);

    // Score asynchronously — redirect is never blocked on DB work
    const contactId = typeof req.query.cid === 'string' ? req.query.cid.trim() : null;
    if (contactId) {
      applyLinkScore(link, contactId).catch(err =>
        console.error('[templateLinks] applyLinkScore:', err.message),
      );
    }

    return res.redirect(302, link.url);
  } catch (err) {
    console.error('[redirectTemplateLink]', err.message);
    return res.redirect(302, FALLBACK);
  }
};

// ── Authenticated: list links for a template ──────────────────────────────────

export const getTemplateLinks = async (req, res) => {
  try {
    const { templateId, clientId } = req.query;
    if (!templateId) return sendError(res, 'templateId is required', 400);
    if (!clientId)   return sendError(res, 'clientId is required',   400);

    const links = await linkRepo.findByTemplate(templateId);
    // Strict client isolation: only return links owned by this client
    sendSuccess(res, links.filter(l => l.clientId === clientId));
  } catch (err) {
    sendServerError(res, err, 'getTemplateLinks');
  }
};
