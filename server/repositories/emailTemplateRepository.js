import prisma from '../prisma.js';

export async function findMany(where) {
  return prisma.email_template.findMany({
    where,
    select: {
      id: true, name: true, subject: true, source_type: true, json_structure: true,
      html_output: true, status: true, prophone_id: true, created_at: true, updated_at: true,
    },
    orderBy: { updated_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.email_template.findUnique({ where: { id } });
}

export async function findTenantById(id) {
  return prisma.email_template.findUnique({ where: { id }, select: { prophone_id: true } });
}

export async function createTemplate(data) {
  return prisma.email_template.create({ data });
}

export async function updateTemplate(id, data) {
  return prisma.email_template.update({ where: { id }, data });
}

export async function removeTemplate(id) {
  return prisma.email_template.delete({ where: { id } });
}
