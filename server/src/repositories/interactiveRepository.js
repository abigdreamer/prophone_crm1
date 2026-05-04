import prisma from '../lib/prisma.js';

export async function createSession(data) {
  return prisma.interactiveSession.create({ data });
}

export async function findByToken(token) {
  return prisma.interactiveSession.findUnique({ where: { token } });
}

export async function recordResponse(token, { response, scoreGiven }) {
  return prisma.interactiveSession.update({
    where: { token },
    data: { response, respondedAt: new Date(), scoreGiven: scoreGiven ?? 0 },
  });
}

export async function findByContact(contactId) {
  return prisma.interactiveSession.findMany({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findByTemplate(templateId) {
  return prisma.interactiveSession.findMany({
    where: { templateId },
    orderBy: { createdAt: 'desc' },
  });
}
