import prisma from '../prisma.js';

export async function findMany(where) {
  return prisma.contact_group.findMany({
    where,
    include: { _count: { select: { contacts: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.contact_group.findUnique({
    where: { id },
    include: { _count: { select: { contacts: true } } },
  });
}

export async function findTenantById(id) {
  return prisma.contact_group.findUnique({ where: { id }, select: { prophone_id: true } });
}

export async function createGroup(data) {
  return prisma.contact_group.create({
    data,
    include: { _count: { select: { contacts: true } } },
  });
}

export async function updateGroup(id, data) {
  return prisma.contact_group.update({
    where: { id },
    data,
    include: { _count: { select: { contacts: true } } },
  });
}

export async function deleteGroup(id) {
  return prisma.contact_group.delete({ where: { id } });
}
