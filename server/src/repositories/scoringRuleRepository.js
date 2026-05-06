import prisma from '../lib/prisma.js';

const SELECT = {
  id: true, name: true, description: true,
  points: true, event: true, isActive: true,
  createdAt: true, updatedAt: true,
};

export function findMany({ activeOnly = false } = {}) {
  return prisma.scoringRule.findMany({
    where:   activeOnly ? { isActive: true } : {},
    select:  SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export function findById(id) {
  return prisma.scoringRule.findUnique({ where: { id }, select: SELECT });
}

export function findManyByIds(ids) {
  return prisma.scoringRule.findMany({
    where:  { id: { in: ids } },
    select: { id: true, isActive: true },
  });
}

export function create(data) {
  return prisma.scoringRule.create({ data, select: SELECT });
}

export function update(id, data) {
  return prisma.scoringRule.update({ where: { id }, data, select: SELECT });
}

export function remove(id) {
  return prisma.scoringRule.delete({ where: { id } });
}
