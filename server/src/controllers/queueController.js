import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as queueService from '../services/queueService.js';

export const getQueue = async (req, res) => {
  try {
    const queue = await queueService.getQueue(req.params.id);
    sendSuccess(res, queue || null);
  } catch (err) {
    sendServerError(res, err, 'getQueue');
  }
};

export const createQueue = async (req, res) => {
  const { dailyLimit, sendTime, timezone } = req.body ?? {};
  if (!dailyLimit) return sendError(res, 'dailyLimit is required', 400);
  if (!req.body.clientId) return sendError(res, 'clientId is required', 400);

  try {
    const existing = await queueService.getQueue(req.params.id);
    if (existing && existing.status !== 'cancelled') {
      return sendError(res, 'Campaign already has an active queue. Update or cancel it first.', 409);
    }
    const queue = await queueService.createQueue(req.params.id, req.body.clientId, {
      dailyLimit: parseInt(dailyLimit, 10),
      sendTime:   sendTime || '09:00',
      timezone:   timezone || 'UTC',
    });
    sendSuccess(res, queue, 201);
  } catch (err) {
    sendServerError(res, err, 'createQueue');
  }
};

export const updateQueue = async (req, res) => {
  const { dailyLimit, sendTime, timezone } = req.body ?? {};
  try {
    const queue = await queueService.updateQueue(req.params.id, {
      dailyLimit: dailyLimit ? parseInt(dailyLimit, 10) : undefined,
      sendTime,
      timezone,
    });
    sendSuccess(res, queue);
  } catch (err) {
    if (err.message === 'Queue not found') return sendError(res, err.message, 404);
    sendServerError(res, err, 'updateQueue');
  }
};

export const pauseQueue = async (req, res) => {
  try {
    const queue = await queueService.pauseQueue(req.params.id);
    sendSuccess(res, queue);
  } catch (err) {
    if (err.message === 'Queue not found') return sendError(res, err.message, 404);
    sendServerError(res, err, 'pauseQueue');
  }
};

export const resumeQueue = async (req, res) => {
  try {
    const queue = await queueService.resumeQueue(req.params.id);
    sendSuccess(res, queue);
  } catch (err) {
    if (err.message === 'Queue not found') return sendError(res, err.message, 404);
    sendServerError(res, err, 'resumeQueue');
  }
};

export const cancelQueue = async (req, res) => {
  try {
    const queue = await queueService.cancelQueue(req.params.id);
    sendSuccess(res, queue);
  } catch (err) {
    if (err.message === 'Queue not found') return sendError(res, err.message, 404);
    sendServerError(res, err, 'cancelQueue');
  }
};
