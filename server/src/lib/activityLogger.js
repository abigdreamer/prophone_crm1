import prisma from './prisma.js';

export function logActivity(entityType, entityId, type, note = '', by = '') {
  return prisma.activity.create({
    data: { entityType, entityId, type, note, by, ts: new Date() },
  }).catch(() => {});
}
