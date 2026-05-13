import { apiFetch } from './client.js';

export const listProjects   = ()         => apiFetch('/posthog-projects');
export const createProject  = (data)     => apiFetch('/posthog-projects',      { method: 'POST',   body: JSON.stringify(data) });
export const updateProject  = (id, data) => apiFetch(`/posthog-projects/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
export const deleteProject  = (id)       => apiFetch(`/posthog-projects/${id}`, { method: 'DELETE' });
