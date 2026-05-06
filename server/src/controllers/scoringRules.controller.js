import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as repo from '../repositories/scoringRuleRepository.js';

export const listScoringRules = async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const rows = await repo.findMany({ activeOnly });
    sendSuccess(res, rows);
  } catch (err) {
    sendServerError(res, err, 'listScoringRules');
  }
};

export const getScoringRule = async (req, res) => {
  try {
    const row = await repo.findById(req.params.id);
    if (!row) return sendError(res, 'Scoring rule not found', 404);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'getScoringRule');
  }
};

export const createScoringRule = async (req, res) => {
  const { name, description = '', points, event = 'link_click' } = req.body ?? {};

  if (!name)                       return sendError(res, 'name is required', 400);
  if (points === undefined || points === null) return sendError(res, 'points is required', 400);
  if (!Number.isInteger(points))   return sendError(res, 'points must be an integer', 400);

  try {
    const row = await repo.create({ name, description, points, event });
    sendSuccess(res, row, 201);
  } catch (err) {
    sendServerError(res, err, 'createScoringRule');
  }
};

export const updateScoringRule = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Scoring rule not found', 404);

    const { name, description, points, event, isActive } = req.body ?? {};
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (description !== undefined) data.description = description;
    if (event       !== undefined) data.event       = event;
    if (isActive    !== undefined) data.isActive    = Boolean(isActive);
    if (points      !== undefined) {
      if (!Number.isInteger(points)) return sendError(res, 'points must be an integer', 400);
      data.points = points;
    }

    const row = await repo.update(req.params.id, data);
    sendSuccess(res, row);
  } catch (err) {
    sendServerError(res, err, 'updateScoringRule');
  }
};

export const deleteScoringRule = async (req, res) => {
  try {
    const existing = await repo.findById(req.params.id);
    if (!existing) return sendError(res, 'Scoring rule not found', 404);
    await repo.remove(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteScoringRule');
  }
};
