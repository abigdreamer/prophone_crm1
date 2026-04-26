import { tenantWhere, tenantId, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as groupRepo from '../repositories/groupRepository.js';

function toGroup(row) {
  return {
    id:           row.id,
    prophone_id:  row.prophone_id,
    name:         row.name,
    createdBy:    row.created_by,
    createdAt:    row.created_at,
    contactCount: row._count?.contacts ?? 0,
  };
}

export async function listGroups(req, res) {
  try {
    const rows = await groupRepo.findMany(tenantWhere(req));
    sendSuccess(res, rows.map(toGroup));
  } catch (err) {
    sendServerError(res, err, 'listGroups');
  }
}

export async function createGroup(req, res) {
  const { name } = req.body ?? {};
  if (!name?.trim()) return sendError(res, 'Group name is required', 400);

  const tid = tenantId(req);
  if (!tid) return sendError(res, 'prophone_id is required', 400);

  try {
    const row = await groupRepo.createGroup({
      prophone_id: tid,
      name:        name.trim(),
      created_by:  req.user?.name || '',
    });
    sendSuccess(res, toGroup(row), 201);
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'A group with this name already exists', 409);
    sendServerError(res, err, 'createGroup');
  }
}

export async function updateGroup(req, res) {
  const { name } = req.body ?? {};
  if (!name?.trim()) return sendError(res, 'Group name is required', 400);

  try {
    const existing = await groupRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Group not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);

    const row = await groupRepo.updateGroup(req.params.id, { name: name.trim() });
    sendSuccess(res, toGroup(row));
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'A group with this name already exists', 409);
    sendServerError(res, err, 'updateGroup');
  }
}

export async function deleteGroup(req, res) {
  try {
    const existing = await groupRepo.findTenantById(req.params.id);
    if (!existing) return sendError(res, 'Group not found', 404);
    if (!canAccessTenant(req, existing.prophone_id)) return sendError(res, 'Forbidden', 403);

    await groupRepo.deleteGroup(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteGroup');
  }
}
