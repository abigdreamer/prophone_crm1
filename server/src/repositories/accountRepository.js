import prisma from '../prisma.js';

export async function findAll() {
  return prisma.account.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { leads: true, campaigns: true } } },
  });
}

export async function findById(id) {
  return prisma.account.findUnique({ where: { id } });
}

export async function findByPhoneId(prophone_id) {
  return prisma.account.findUnique({ where: { prophone_id } });
}

export async function createAccount(data) {
  const prophone_id = data.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  return prisma.account.create({ data: { ...data, prophone_id } });
}

export async function updateAccount(id, data) {
  return prisma.account.update({ where: { id }, data });
}

export async function removeAccount(id) {
  return prisma.account.update({ where: { id }, data: { deleted_at: new Date() } });
}
