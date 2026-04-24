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

export async function getContacts(pool, scopeId) {
  const params = new URLSearchParams({ pool });
  if (scopeId) params.append('prophone_id', scopeId);
  return apiFetch(`/contacts?${params}`);
}

export async function getContact(id) {
  return apiFetch(`/contacts/${id}`);
}

export async function createContact(contact) {
  return apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

export async function updateContact(id, contact) {
  return apiFetch(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contact),
  });
}

export async function addActivity(contactId, activity) {
  return apiFetch(`/contacts/${contactId}/activities`, {
    method: 'POST',
    body: JSON.stringify(activity),
  });
}
