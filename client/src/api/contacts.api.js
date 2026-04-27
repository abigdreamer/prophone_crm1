import { apiFetch, getSuperAdminTenantId } from './client.js';

export async function getContacts(scopeId) {
  const params = new URLSearchParams();
  if (scopeId) params.append('prophone_id', scopeId);
  return apiFetch(`/contacts?${params}`);
}

export async function getContact(id) {
  return apiFetch(`/contacts/${id}`);
}

export async function createContact(contact) {
  const tid     = getSuperAdminTenantId();
  const payload = tid ? { ...contact, prophone_id: tid } : contact;
  return apiFetch('/contacts', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

export async function updateContact(id, contact) {
  return apiFetch(`/contacts/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(contact),
  });
}

export async function deleteContact(id) {
  return apiFetch(`/contacts/${id}`, { method: 'DELETE' });
}

export async function addActivity(contactId, activity) {
  return apiFetch(`/contacts/${contactId}/activities`, {
    method: 'POST',
    body:   JSON.stringify(activity),
  });
}

export async function importContacts(contacts, groupId) {
  const tid     = getSuperAdminTenantId();
  const payload = { contacts, groupId, ...(tid ? { prophone_id: tid } : {}) };
  return apiFetch('/contacts/import', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}
