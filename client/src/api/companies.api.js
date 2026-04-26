import { apiFetch } from './client.js';

export async function getCompany(prophone_id) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`);
}

export async function updateCompany(prophone_id, data) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`, {
    method: 'PUT',
    body:   JSON.stringify(data),
  });
}

export async function listCompanies() {
  return apiFetch('/companies');
}

export async function createCompany(data) {
  return apiFetch('/companies', {
    method: 'POST',
    body:   JSON.stringify(data),
  });
}

export async function deleteCompany(prophone_id) {
  return apiFetch(`/companies/${encodeURIComponent(prophone_id)}`, { method: 'DELETE' });
}
