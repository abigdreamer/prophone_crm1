import { apiFetch } from './client.js';

export async function checkSchema() {
  try {
    await apiFetch('/email-templates/check-schema');
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'unknown', message: err.message };
  }
}

export async function reloadSchemaCache() {
  return true;
}

export async function getEmailTemplates() {
  return apiFetch('/email-templates');
}

export async function getEmailTemplate(id) {
  return apiFetch(`/email-templates/${id}`);
}

export async function createEmailTemplate({ name, subject, source_type = 'builder', json_structure, html_output, status = 'draft' }) {
  return apiFetch('/email-templates', {
    method: 'POST',
    body:   JSON.stringify({ name, subject, source_type, json_structure, html_output, status }),
  });
}

export async function updateEmailTemplate(id, updates) {
  return apiFetch(`/email-templates/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(updates),
  });
}

export async function deleteEmailTemplate(id) {
  return apiFetch(`/email-templates/${id}`, { method: 'DELETE' });
}

export async function duplicateEmailTemplate(id) {
  return apiFetch(`/email-templates/${id}/duplicate`, { method: 'POST' });
}
