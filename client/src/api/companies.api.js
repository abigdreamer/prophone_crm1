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

export async function getCompany(prophone_id) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`);
}

export async function updateCompany(prophone_id, data) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Super admin only
export async function listCompanies() {
  return apiFetch('/companies');
}

export async function createCompany(data) {
  return apiFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(prophone_id) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`, { method: 'DELETE' });
}
