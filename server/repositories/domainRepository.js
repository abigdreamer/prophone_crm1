import prisma from '../prisma.js';

export async function findMany(where) {
  return prisma.domain.findMany({ where, orderBy: { created_at: 'desc' } });
}

export async function findById(id) {
  return prisma.domain.findUnique({ where: { id } });
}

export async function findByTenantAndName(prophone_id, domain) {
  return prisma.domain.findFirst({ where: { prophone_id, domain } });
}

export async function findFirstVerified(prophone_id) {
  return prisma.domain.findFirst({ where: { prophone_id, status: 'verified' } });
}

export async function createDomain(data) {
  return prisma.domain.create({ data });
}

export async function updateDomain(id, data) {
  return prisma.domain.update({ where: { id }, data });
}

export async function removeDomain(id) {
  return prisma.domain.delete({ where: { id } });
}
