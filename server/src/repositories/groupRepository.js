import prisma from '../prisma.js';

export async function findMany({ account_id } = {}) {
  return prisma.lead_group.findMany({
    where: account_id ? { account_id } : {},
    include: { _count: { select: { leads: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.lead_group.findUnique({
    where:   { id },
    include: { _count: { select: { leads: true } } },
  });
}

export async function createGroup(data) {
  return prisma.lead_group.create({
    data,
    include: { _count: { select: { leads: true } } },
  });
}

export async function updateGroup(id, data) {
  return prisma.lead_group.update({
    where:   { id },
    data,
    include: { _count: { select: { leads: true } } },
  });
}

export async function deleteGroup(id) {
  return prisma.lead_group.delete({ where: { id } });
}
