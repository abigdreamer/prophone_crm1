import prisma from '../prisma.js';

const ACTIVITY_SELECT = { id: true, type: true, note: true, by: true, ts: true };

export async function findMany(where) {
  return prisma.contact.findMany({
    where,
    include: { activities: { select: ACTIVITY_SELECT } },
    orderBy: { last_activity_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.contact.findUnique({
    where:   { id },
    include: { activities: { select: ACTIVITY_SELECT } },
  });
}

export async function findTenantById(id) {
  return prisma.contact.findUnique({ where: { id }, select: { prophone_id: true } });
}

export async function createContact(data, initialActivities = []) {
  return prisma.contact.create({
    data: {
      ...data,
      activities: initialActivities.length > 0 ? {
        create: initialActivities.map(a => ({
          type: a.type,
          note: a.note || '',
          by:   a.by   || '',
          ts:   a.ts ? new Date(a.ts) : new Date(),
        })),
      } : undefined,
    },
    include: { activities: { select: ACTIVITY_SELECT } },
  });
}

export async function updateContact(id, data) {
  return prisma.contact.update({
    where:   { id },
    data,
    include: { activities: { select: ACTIVITY_SELECT } },
  });
}

export async function addActivity(contactId, activityData) {
  await prisma.activity.create({
    data: {
      contact_id: contactId,
      type:       activityData.type,
      note:       activityData.note || '',
      by:         activityData.by   || '',
      ts:         activityData.ts ? new Date(activityData.ts) : new Date(),
    },
  });
  await prisma.contact.update({
    where: { id: contactId },
    data:  { last_activity_at: new Date() },
  });
}
