import prisma from '../prisma.js';

// ── Action Controls ────────────────────────────────────────────────────────────

export async function findActionControls(leadId) {
  return prisma.action_control.findMany({
    where:   { lead_id: leadId },
    orderBy: { created_at: 'asc' },
  });
}

export async function createActionControl(leadId, { name, value = '', clicked = false }) {
  return prisma.action_control.create({
    data: { lead_id: leadId, name, value, clicked },
  });
}

export async function updateActionControl(id, data) {
  return prisma.action_control.update({ where: { id }, data });
}

export async function deleteActionControl(id) {
  return prisma.action_control.delete({ where: { id } });
}

export async function findActionControlByLeadAndName(leadId, name) {
  return prisma.action_control.findFirst({ where: { lead_id: leadId, name } });
}

// ── Slider Controls ────────────────────────────────────────────────────────────

export async function findSliderControls(leadId) {
  return prisma.slider_control.findMany({
    where:   { lead_id: leadId },
    orderBy: { created_at: 'asc' },
  });
}

export async function createSliderControl(leadId, { name, value = 0 }) {
  return prisma.slider_control.create({
    data: { lead_id: leadId, name, value: Number(value) },
  });
}

export async function updateSliderControl(id, data) {
  return prisma.slider_control.update({
    where: { id },
    data:  { ...data, value: data.value !== undefined ? Number(data.value) : undefined },
  });
}

export async function deleteSliderControl(id) {
  return prisma.slider_control.delete({ where: { id } });
}
