import prisma from '../prisma.js';
import { skipDups } from '../lib/db-compat.js';

const ACTIVITY_SELECT = {
  id: true,
  type: true,
  note: true,
  created_at: true,
  user_id: true,
};

const GROUP_SELECT = {
  id: true,
  name: true,
};

const ACCOUNT_SELECT = {
  name: true,
};

const CONTROL_SELECT = {
  id: true,
  name: true,
  clicked: true,
  value: true,
  created_at: true,
};

const SLIDER_SELECT = {
  id: true,
  name: true,
  value: true,
  created_at: true,
};

const LEAD_INCLUDE = {
  activities: { select: ACTIVITY_SELECT, orderBy: { created_at: 'asc' } },
  lead_group: { select: GROUP_SELECT },
  account: { select: ACCOUNT_SELECT },
  action_controls: { select: CONTROL_SELECT, orderBy: { created_at: 'asc' } },
  slider_controls: { select: SLIDER_SELECT, orderBy: { created_at: 'asc' } },
};

const LEAD_SELECT = {
  id: true,
  account_id: true,
  group_id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,

  company_name: true,
  website: true,
  linkedin: true,
  sms: true,
  location: true,

  stage: true,
  source: true,
  tags: true,
  do_not_contact: true,
  invalid_email: true,
  deleted_at: true,
  created_at: true,
  updated_at: true,
};

export async function findMany(where) {
  return prisma.lead.findMany({
    where,
    include: LEAD_INCLUDE,
    orderBy: { updated_at: 'desc' },
  });
}

export async function findById(id) {
  return prisma.lead.findUnique({
    where: { id },
    include: LEAD_INCLUDE,
  });
}

export async function findTenantById(id) {
  return prisma.lead.findUnique({
    where: { id },
    select: { account_id: true },
  });
}

export async function createContact(data, initialActivities = []) {
  return prisma.lead.create({
    data: {
      ...data,
      activities: initialActivities.length
        ? {
            create: initialActivities.map(a => ({
              type: a.type,
              note: a.note || '',
              user_id: a.user_id || null,
            })),
          }
        : undefined,
    },
    include: LEAD_INCLUDE,
  });
}

export async function updateContact(id, data) {
  return prisma.lead.update({
    where: { id },
    data,
    include: LEAD_INCLUDE,
  });
}

export async function deleteContact(id) {
  return prisma.lead.delete({
    where: { id },
  });
}

export async function addActivity(leadId, activityData) {
  await prisma.activity.create({
    data: {
      lead_id: leadId,
      type: activityData.type,
      note: activityData.note || '',
      user_id: activityData.user_id || null,
    },
  });
}

export async function findByEmailAndAccount(email, accountId) {
  return prisma.lead.findFirst({
    where: {
      email,
      account_id: accountId,
      deleted_at: null,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
      email: true,
      source: true,
      tags: true,
      stage: true,
      do_not_contact: true,
      invalid_email: true,

      company_name: true,
      website: true,
      linkedin: true,
      sms: true,
      location: true,
    },
  });
}

export async function bulkCreate(data) {
  return prisma.lead.createMany({
    data,
    ...skipDups,
  });
}