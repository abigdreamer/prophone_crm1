/**
 * tenantWhere(req) — Prisma where-clause fragment for list/read queries.
 *
 * - super_admin: no restriction (returns {}), OR scoped to ?prophone_id= override.
 * - admin/rep:   always scoped to their own prophone_id.
 */
export function tenantWhere(req) {
  if (req.user.role === 'super_admin') {
    return req.query.prophone_id ? { prophone_id: req.query.prophone_id } : {};
  }
  return { prophone_id: req.user.prophone_id };
}

/**
 * tenantId(req) — prophone_id to stamp on a newly created tenant-scoped record.
 *
 * - super_admin: uses req.body.prophone_id (required — super_admin must specify a target tenant).
 * - admin/rep:   always their own prophone_id.
 *
 * Returns null when super_admin provides no target; callers should 400 in that case.
 */
export function tenantId(req) {
  if (req.user.role === 'super_admin') {
    return req.body?.prophone_id ?? null;
  }
  return req.user.prophone_id;
}

/**
 * canAccessTenant(req, recordTenantId) — authorization check for a specific record.
 *
 * - super_admin: always allowed.
 * - admin/rep:   only if their prophone_id matches the record's.
 */
export function canAccessTenant(req, recordTenantId) {
  return req.user.role === 'super_admin' || req.user.prophone_id === recordTenantId;
}
