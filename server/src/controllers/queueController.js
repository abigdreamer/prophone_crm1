import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import * as queueService from '../services/queueService.js';
import prisma from '../lib/prisma.js';

export const getQueue = async (req, res) => {
  try {
    const queue = await queueService.getQueue(req.params.id);
    sendSuccess(res, queue || null);
  } catch (err) {
    sendServerError(res, err, 'getQueue');
  }
};

export const createQueue = async (req, res) => {
  const { dailyLimit, sendTime, timezone, sendGapSeconds, sendDays, sendOrderMode } = req.body ?? {};
  if (!dailyLimit) return sendError(res, 'dailyLimit is required', 400);
  if (!req.body.clientId) return sendError(res, 'clientId is required', 400);

  try {
    const existing = await queueService.getQueue(req.params.id);
    if (existing && existing.status !== 'cancelled') {
      return sendError(res, 'Campaign already has an active queue. Update or cancel it first.', 409);
    }
    const queue = await queueService.createQueue(req.params.id, req.body.clientId, {
      dailyLimit:     parseInt(dailyLimit, 10),
      sendTime:       sendTime || '09:00',
      timezone:       timezone || 'UTC',
      sendGapSeconds: sendGapSeconds != null ? parseInt(sendGapSeconds, 10) : 5,
      sendDays:       Array.isArray(sendDays) ? sendDays : null,
      sendOrderMode:  sendOrderMode || 'import_order',
    });
    sendSuccess(res, queue, 201);
  } catch (err) {
    sendServerError(res, err, 'createQueue');
  }
};

export const updateQueue = async (req, res) => {
  const { dailyLimit, sendTime, timezone, sendGapSeconds, sendDays, sendOrderMode } = req.body ?? {};
  try {
    const queue = await queueService.updateQueue(req.params.id, {
      dailyLimit:     dailyLimit != null ? parseInt(dailyLimit, 10) : undefined,
      sendTime,
      timezone,
      sendGapSeconds: sendGapSeconds != null ? parseInt(sendGapSeconds, 10) : undefined,
      sendDays:       Array.isArray(sendDays) ? sendDays : undefined,
      sendOrderMode:  sendOrderMode || undefined,
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

export const getNextRunRecipients = async (req, res) => {
  try {
    const queue = await prisma.campaignQueue.findUnique({
      where: { campaignId: req.params.id },
      include: { runs: { where: { status: 'pending' }, orderBy: { dayNumber: 'asc' }, take: 1 } },
    });
    if (!queue) return sendSuccess(res, { runId: null, scheduledAt: null, contacts: [] });
    const nextRun = queue.runs[0];
    if (!nextRun) return sendSuccess(res, { runId: null, scheduledAt: null, contacts: [] });

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: req.params.id, queueRunId: nextRun.id, status: 'pending' },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true, company: true } } },
      orderBy: [{ sendOrder: 'asc' }, { id: 'asc' }],
    });

    sendSuccess(res, {
      runId:       nextRun.id,
      scheduledAt: nextRun.scheduledAt,
      startedAt:   nextRun.startedAt,
      dayNumber:   nextRun.dayNumber,
      contacts:    recipients.map((r, i) => ({
        recipientId: r.id,
        contactId:   r.contactId,
        name:        [r.contact?.firstName, r.contact?.lastName].filter(Boolean).join(' ') || r.contact?.email || '',
        email:       r.contact?.email || '',
        company:     r.contact?.company || '',
        sendOrder:   r.sendOrder ?? (i + 1),
      })),
    });
  } catch (err) {
    sendServerError(res, err, 'getNextRunRecipients');
  }
};

export const manageNextRunRecipients = async (req, res) => {
  const { action, recipientIds } = req.body ?? {};
  if (!action || !Array.isArray(recipientIds) || !recipientIds.length)
    return sendError(res, 'action and recipientIds[] required', 400);

  try {
    const queue = await prisma.campaignQueue.findUnique({
      where: { campaignId: req.params.id },
      include: { runs: { where: { status: 'pending' }, orderBy: { dayNumber: 'asc' }, take: 1 } },
    });
    if (!queue) return sendError(res, 'Queue not found', 404);
    const nextRun = queue.runs[0];
    if (!nextRun) return sendError(res, 'No pending run found', 404);
    if (nextRun.startedAt) return sendError(res, 'Batch already started — cannot modify', 400);

    if (action === 'remove') {
      await prisma.campaignRecipient.updateMany({
        where: { id: { in: recipientIds }, queueRunId: nextRun.id },
        data:  { queueRunId: null },
      });
    } else if (action === 'move_top' || action === 'move_bottom') {
      const all = await prisma.campaignRecipient.findMany({
        where:   { queueRunId: nextRun.id, status: 'pending' },
        orderBy: [{ sendOrder: 'asc' }, { id: 'asc' }],
        select:  { id: true },
      });
      const selSet = new Set(recipientIds);
      const ordered = action === 'move_top'
        ? [...all.filter(r => selSet.has(r.id)), ...all.filter(r => !selSet.has(r.id))]
        : [...all.filter(r => !selSet.has(r.id)), ...all.filter(r => selSet.has(r.id))];
      await prisma.$transaction(
        ordered.map((r, i) => prisma.campaignRecipient.update({ where: { id: r.id }, data: { sendOrder: i + 1 } }))
      );
    } else {
      return sendError(res, 'Unknown action', 400);
    }

    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'manageNextRunRecipients');
  }
};
