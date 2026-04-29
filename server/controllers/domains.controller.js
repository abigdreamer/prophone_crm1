import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as domainSvc  from '../services/domainService.js';
import * as domainRepo from '../repositories/domainRepository.js';

function cleanDomainInput(raw) {
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
}

export async function listDomains(req, res) {
  try {
    const rows = await domainRepo.findMany(tenantWhere(req));
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listDomains');
  }
}

export async function getDomain(req, res) {
  try {
    const row = await domainRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Domain not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'getDomain');
  }
}

export async function createDomain(req, res) {
  const { domain } = req.body ?? {};
  const tid = tenantId(req);
  if (!tid)    return sendError(res, 'prophone_id is required', 400);
  if (!domain) return sendError(res, 'domain is required', 400);

  const cleanDomain = cleanDomainInput(domain);

  const existing = await domainRepo.findByTenantAndName(tid, cleanDomain);
  if (existing) return sendError(res, 'Domain already added', 409);

  try {
    const resendDomain = await domainSvc.registerDomain(cleanDomain);

    const row = await domainRepo.createDomain({
      prophone_id:      tid,
      domain:           cleanDomain,
      resend_domain_id: resendDomain.id,
      status:           resendDomain.status,
      dns_records:      resendDomain.dns_records,
      region:           resendDomain.region,
      verified_at:      resendDomain.status === 'verified' ? new Date() : null,
    });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createDomain');
  }
}

export async function updateDomain(req, res) {
  try {
    const row = await domainRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Domain not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    const { from_email } = req.body ?? {};
    const data = {};
    if (from_email !== undefined) {
      if (from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
        return sendError(res, 'Invalid email address', 400);
      }
      data.from_email = from_email;
    }

    const updated = await domainRepo.updateDomain(req.params.id, data);
    sendSuccess(res, updated);
  } catch (err) {
    sendServerError(res, err, 'updateDomain');
  }
}

export async function verifyDomain(req, res) {
  try {
    const row = await domainRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Domain not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    const result = await domainSvc.checkDomainVerification(row.resend_domain_id, row.domain);

    // Persist recovered IDs / DNS records if the service had to auto-recover
    if (result.recovered) {
      await domainRepo.updateDomain(req.params.id, {
        resend_domain_id: result.recovered.id,
        dns_records:      result.recovered.dns_records ?? row.dns_records,
        region:           result.recovered.region      ?? row.region,
      });
    }

    const verified_at = result.status === 'verified' ? new Date() : (row.verified_at ?? null);
    const updated = await domainRepo.updateDomain(req.params.id, {
      status:      result.status,
      verified_at,
      dns_records: result.dns_records ?? row.dns_records,
    });

    sendSuccess(res, updated);
  } catch (err) {
    sendServerError(res, err, 'verifyDomain');
  }
}

export async function patchDomainTracking(req, res) {
  try {
    const row = await domainRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Domain not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    const { open_tracking, click_tracking, tls } = req.body ?? {};
    const data = {};

    if (open_tracking  !== undefined) data.open_tracking  = Boolean(open_tracking);
    if (click_tracking !== undefined) data.click_tracking = Boolean(click_tracking);
    if (tls !== undefined) {
      if (!['opportunistic', 'enforced'].includes(tls)) return sendError(res, 'Invalid TLS value — must be opportunistic or enforced', 400);
      data.tls = tls;
    }

    if (Object.keys(data).length === 0) return sendError(res, 'No fields to update', 400);

    if (row.resend_domain_id) {
      try {
        await domainSvc.updateDomainTracking(row.resend_domain_id, {
          openTracking:  data.open_tracking,
          clickTracking: data.click_tracking,
          tls:           data.tls,
        });
      } catch (err) {
        console.warn('[domains] Resend tracking update failed (continuing local save):', err.message);
      }
    }

    const updated = await domainRepo.updateDomain(req.params.id, data);
    sendSuccess(res, updated);
  } catch (err) {
    sendServerError(res, err, 'patchDomainTracking');
  }
}

export async function deleteDomain(req, res) {
  try {
    const row = await domainRepo.findById(req.params.id);
    if (!row) return sendError(res, 'Domain not found', 404);
    if (!canAccessTenant(req, row.prophone_id)) return sendError(res, 'Forbidden', 403);

    await domainSvc.removeDomain(row.resend_domain_id, row.domain);
    await domainRepo.removeDomain(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteDomain');
  }
}
