import prisma from '../prisma.js';
import { ieq } from '../lib/db-compat.js';

const USER_SELECT = {
  id: true, email: true, name: true,
  role: true, avatar: true, is_active: true, created_at: true,
};

const SEED_EMAILS = ['admin@geniusai.biz', 'manager@geniusai.biz', 'sales@geniusai.biz'];

export async function findQuickUsers() {
  const users = await prisma.user.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });
  const order = ['admin', 'manager', 'salesperson'];
  return order.map(role => users.find(u => u.role === role)).filter(Boolean);
}

export async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email: ieq(email), is_active: true, deleted_at: null },
  });
}

export async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findMany(where) {
  return prisma.user.findMany({
    where: { ...where, deleted_at: null },
    select:  USER_SELECT,
    orderBy: { created_at: 'asc' },
  });
}

export async function createUser(data) {
  return prisma.user.create({ data, select: USER_SELECT });
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
}

export async function removeUser(id) {
  return prisma.user.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
}
