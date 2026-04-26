/**
 * tenantWhere(req) — Prisma where-clause fragment for list/read queries.
 *
 * - super_admin with active_company (JWT prophone_id): scoped to that company.
 * - super_admin without active_company: unrestricted (returns {}).
 *   Legacy ?prophone_id= query param still accepted as fallback.
 * - admin/manager/accountant/rep: always scoped to their own prophone_id.
 */
export function tenantWhere(req) {
  if (req.user.role === 'super_admin') {
    const pid = req.user.prophone_id || req.query.prophone_id || null;
    return pid ? { prophone_id: pid } : {};
  }
  return { prophone_id: req.user.prophone_id };
}

/**
 * tenantId(req) — prophone_id to stamp on a newly created tenant-scoped record.
 *
 * - super_admin with active_company: uses JWT prophone_id automatically.
 * - super_admin without active_company: falls back to req.body.prophone_id.
 * - admin/manager/accountant/rep: always their own prophone_id.
 *
 * Returns null when super_admin has no context; callers should 400 in that case.
 */
export function tenantId(req) {
  if (req.user.role === 'super_admin') {
    return req.user.prophone_id || req.body?.prophone_id || null;
  }
  return req.user.prophone_id;
}

/**
 * canAccessTenant(req, recordTenantId) — authorization check for a specific record.
 *
 * - super_admin with active_company: restricted to that company only.
 * - super_admin without active_company: unrestricted (legacy mode).
 * - all other roles: only own company.
 */
export function canAccessTenant(req, recordTenantId) {
  if (req.user.role === 'super_admin') {
    if (req.user.prophone_id) return req.user.prophone_id === recordTenantId;
    return true;
  }
  return req.user.prophone_id === recordTenantId;
}

// Roles that are always company-scoped (cannot be ungated super_admin)
export const COMPANY_ROLES = ['admin', 'manager', 'accountant', 'rep'];

// All valid roles
export const VALID_ROLES = ['super_admin', ...COMPANY_ROLES];
