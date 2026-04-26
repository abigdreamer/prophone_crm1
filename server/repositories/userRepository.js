import prisma from '../prisma.js';

const USER_SELECT = {
  id: true, prophone_id: true, email: true, name: true,
  role: true, avatar: true, color: true, created_at: true,
};

export async function findQuickUsers() {
  const roles = ['super_admin', 'admin', 'manager'];
  const results = await Promise.all(
    roles.map(role =>
      prisma.user.findFirst({
        where: { role },
        select: { id: true, name: true, email: true, role: true, avatar: true, color: true },
        orderBy: { created_at: 'asc' },
      })
    )
  );
  return results.filter(Boolean);
}

export async function findByEmail(email) {
  return prisma.user.findFirst({
    where:   { email: { equals: email, mode: 'insensitive' } },
    include: { company: { select: { name: true, plan: true } } },
  });
}

export async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findMany(where) {
  return prisma.user.findMany({
    where,
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
  return prisma.user.delete({ where: { id } });
}
