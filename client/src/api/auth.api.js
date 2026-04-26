import { apiFetch } from './client.js';

export async function getQuickUsers() {
  return apiFetch('/auth/quick-users');
}

export async function loginUser(email, password) {
  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body:   JSON.stringify({ email, password }),
  });
  if (!result) return null;
  localStorage.setItem('prophone_token', result.token);
  return result.user;
}

export function logoutUser() {
  localStorage.removeItem('prophone_token');
  localStorage.removeItem('prophone_user');
}

export async function getUsers(scopeId) {
  const qs = scopeId ? `?prophone_id=${encodeURIComponent(scopeId)}` : '';
  return apiFetch(`/users${qs}`);
}

export async function createUser(userData) {
  return apiFetch('/users', {
    method: 'POST',
    body:   JSON.stringify(userData),
  });
}

export async function updateUser(id, data) {
  return apiFetch(`/users/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  });
}

export async function deleteUser(id) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

export async function getCompanies() {
  return apiFetch('/auth/companies');
}

export async function selectCompany(prophone_id) {
  return apiFetch('/auth/select-company', {
    method: 'POST',
    body:   JSON.stringify({ prophone_id: prophone_id ?? null }),
  });
}
