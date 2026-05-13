import { apiFetch } from './client.js';

export async function getProjectReports(project, range = 'last_7d', page = 1, eventName = '') {
  const params = new URLSearchParams({ range, page });
  if (eventName) params.set('event', eventName);
  return apiFetch(`/reports/posthog/${project}?${params}`);
}

export async function getEventDetail(project, uuid) {
  return apiFetch(`/reports/posthog/${project}/event/${uuid}`);
}
