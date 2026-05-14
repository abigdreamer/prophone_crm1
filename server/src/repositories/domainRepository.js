import prisma from '../lib/prisma.js';

export async function findMany(where) {
  return prisma.domain.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

export async function findById(id) {
  return prisma.domain.findUnique({
    where: { id }
  });
}

export async function findByClientAndName(clientId, domainName) {
  return prisma.domain.findFirst({
    where: {
      clientId,
      domainName
    }
  });
}

export async function findFirstVerified(clientId) {
  return prisma.domain.findFirst({
    where: { clientId, status: 'verified' }
  });
}

export async function findAnyVerified() {
  return prisma.domain.findFirst({
    where: { status: 'verified' }
  });
}

export async function findFirstVerifiedForProvider(clientId, provider) {
  return prisma.domain.findFirst({
    where: { clientId, provider, status: 'verified', isCanceled: false }
  });
}

export async function findAnyVerifiedForProvider(provider) {
  return prisma.domain.findFirst({
    where: { provider, status: 'verified', isCanceled: false }
  });
}

export async function createDomain(data) {
  return prisma.domain.create({
    data
  });
}

export async function updateDomain(id, data) {
  return prisma.domain.update({
    where: { id },
    data
  });
}

export async function removeDomain(id) {
  return prisma.domain.delete({
    where: { id }
  });
}

export async function findByResendId(resendDomainId) {
  return prisma.domain.findFirst({
    where: { resendDomainId }
  });
}

export async function cancelDomain(id, cancelReason = '') {
  return prisma.domain.update({
    where: { id },
    data:  { isCanceled: true, canceledAt: new Date(), cancelReason, restoredAt: null },
  });
}

export async function restoreDomain(id) {
  return prisma.domain.update({
    where: { id },
    data:  { isCanceled: false, restoredAt: new Date() },
  });
}