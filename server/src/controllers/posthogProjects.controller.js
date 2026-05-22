import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as repo from '../repositories/posthogProjectRepository.js';

export async function listProjects(req, res) {
  try {
    const projects = await repo.findAll();
    sendSuccess(res, projects);
  } catch (err) {
    sendServerError(res, err, 'listProjects');
  }
}

export async function createProject(req, res) {
  const { key, label, domain, project_id, sort_order = 0 } = req.body;
  if (!key || !label || !domain || !project_id) {
    return sendError(res, 'key, label, domain, and project_id are required', 400);
  }
  try {
    const project = await repo.create({
      key: key.trim().toLowerCase(),
      label: label.trim(),
      domain: domain.trim().toLowerCase(),
      project_id: String(project_id).trim(),
      sort_order: Number(sort_order) || 0,
      hidden: false,
    });
    sendSuccess(res, project, 201);
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'A project with that key already exists', 409);
    sendServerError(res, err, 'createProject');
  }
}

export async function updateProject(req, res) {
  const { id } = req.params;
  const { label, domain, project_id, sort_order, hidden } = req.body;
  const data = {};
  if (label      !== undefined) data.label      = label.trim();
  if (domain     !== undefined) data.domain     = domain.trim().toLowerCase();
  if (project_id !== undefined) data.project_id = String(project_id).trim();
  if (sort_order !== undefined) data.sort_order = Number(sort_order) || 0;
  if (hidden     !== undefined) data.hidden     = Boolean(hidden);
  try {
    const project = await repo.update(id, data);
    sendSuccess(res, project);
  } catch (err) {
    if (err.code === 'P2025') return sendError(res, 'Project not found', 404);
    sendServerError(res, err, 'updateProject');
  }
}

export async function deleteProject(req, res) {
  const { id } = req.params;
  try {
    await repo.remove(id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    if (err.code === 'P2025') return sendError(res, 'Project not found', 404);
    sendServerError(res, err, 'deleteProject');
  }
}
