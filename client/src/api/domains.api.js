import { apiFetch } from './client.js';

export const getDomains              = ()          => apiFetch('/domains');
export const getDomain               = (id)        => apiFetch(`/domains/${id}`);
export const createDomain            = (data)      => apiFetch('/domains',               { method: 'POST',  body: JSON.stringify(data) });
export const updateDomain            = (id, data)  => apiFetch(`/domains/${id}`,          { method: 'PUT',   body: JSON.stringify(data) });
export const verifyDomain            = (id)        => apiFetch(`/domains/${id}/verify`,   { method: 'POST' });
export const deleteDomain            = (id)        => apiFetch(`/domains/${id}`,          { method: 'DELETE' });
export const configureDomainTracking = (id, data)  => apiFetch(`/domains/${id}/tracking`, { method: 'PATCH', body: JSON.stringify(data) });
