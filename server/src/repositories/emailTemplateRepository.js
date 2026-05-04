import prisma from '../lib/prisma.js';

export async function findMany(where) {
  return prisma.emailTemplate.findMany({
    where,
    select: {
      id: true,
      clientId: true,
      name: true,
      subject: true,
      body: true,
      htmlOutput: true,
      trackedLinks: true,
      status: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function findById(id) {
  return prisma.emailTemplate.findUnique({
    where: { id }
  });
}

export async function findTenantById(id) {
  return prisma.emailTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true
    }
  });
}

export async function createTemplate(data) {
  return prisma.emailTemplate.create({
    data
  });
}

export async function updateTemplate(id, data) {
  return prisma.emailTemplate.update({
    where: { id },
    data
  });
}

export async function removeTemplate(id) {
  return prisma.emailTemplate.delete({
    where: { id }
  });
}