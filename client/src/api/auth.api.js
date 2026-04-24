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

export async function getQuickUsers() {
  return apiFetch('/auth/quick-users');
}

export async function loginUser(email, password) {
  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!result) return null; // wrong credentials
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
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id, data) {
  return apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}
