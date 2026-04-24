const API = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('prophone_token') || '';
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

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

// prophone_id scoping is handled server-side via JWT
export async function getEmailTemplates() {
  return apiFetch('/email-templates');
}

export async function getEmailTemplate(id) {
  return apiFetch(`/email-templates/${id}`);
}

export async function createEmailTemplate({ name, subject, json_structure, html_output, status = 'draft' }) {
  return apiFetch('/email-templates', {
    method: 'POST',
    body: JSON.stringify({ name, subject, json_structure, html_output, status }),
  });
}

export async function updateEmailTemplate(id, updates) {
  return apiFetch(`/email-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteEmailTemplate(id) {
  const res = await fetch(`${API}/email-templates/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function duplicateEmailTemplate(id) {
  return apiFetch(`/email-templates/${id}/duplicate`, { method: 'POST' });
}
