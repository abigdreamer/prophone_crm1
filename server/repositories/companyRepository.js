import prisma from '../prisma.js';

export async function findAll() {
  return prisma.company_profile.findMany({
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { users: true, contacts: true } } },
  });
}

export async function findAllSummary() {
  return prisma.company_profile.findMany({
    select: { id: true, prophone_id: true, name: true, plan: true, city: true, industry: true },
    orderBy: { name: 'asc' },
  });
}

export async function findByPhoneId(prophone_id) {
  return prisma.company_profile.findUnique({ where: { prophone_id } });
}

export async function createCompany(data) {
  return prisma.company_profile.create({ data });
}

export async function updateCompany(prophone_id, data) {
  return prisma.company_profile.update({ where: { prophone_id }, data });
}

export async function removeCompany(prophone_id) {
  return prisma.company_profile.delete({ where: { prophone_id } });
}
