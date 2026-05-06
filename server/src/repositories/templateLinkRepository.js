import prisma from '../lib/prisma.js';

const DETAIL_SELECT = {
  id: true, templateId: true, clientId: true,
  url: true, label: true, clickCount: true, createdAt: true,
  scoringRule: {
    select: { id: true, name: true, points: true, event: true, isActive: true },
  },
};

export function findByTemplate(templateId) {
  return prisma.templateLink.findMany({
    where:   { templateId },
    select:  DETAIL_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export function findById(id) {
  return prisma.templateLink.findUnique({
    where:  { id },
    select: DETAIL_SELECT,
  });
}

export function findByIdWithTemplate(id) {
  return prisma.templateLink.findUnique({
    where:  { id },
    select: {
      ...DETAIL_SELECT,
      template: { select: { id: true, clientId: true } },
    },
  });
}

export function createMany(rows) {
  return prisma.templateLink.createMany({ data: rows });
}

export function deleteByTemplate(templateId) {
  return prisma.templateLink.deleteMany({ where: { templateId } });
}

export function incrementClickCount(id) {
  return prisma.templateLink.update({
    where: { id },
    data:  { clickCount: { increment: 1 } },
  });
}
