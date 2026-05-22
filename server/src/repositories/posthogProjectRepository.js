import prisma from '../lib/prisma.js';

export const findAll    = ()       => prisma.posthog_project.findMany({ orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] });
export const findActive = ()       => prisma.posthog_project.findMany({ where: { hidden: false }, orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] });
export const findByKey  = (key)    => prisma.posthog_project.findUnique({ where: { key } });
export const findById   = (id)     => prisma.posthog_project.findUnique({ where: { id } });

export const create = (data) => prisma.posthog_project.create({ data });

export const update = (id, data) => prisma.posthog_project.update({ where: { id }, data });

export const remove = (id) => prisma.posthog_project.delete({ where: { id } });
