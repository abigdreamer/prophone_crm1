import { apiFetch } from './client.js';

export async function getProjectReports(project, range = 'last_7d', page = 1, eventName = '') {
  const params = new URLSearchParams({ range, page });
  if (eventName) params.set('event', eventName);
  return apiFetch(`/reports/posthog/${project}?${params}`);
}

export async function getEventDetail(project, uuid) {
  return apiFetch(`/reports/posthog/${project}/event/${uuid}`);
}

export async function getClientAnalytics(clientId, range = 'last_7d', page = 1, eventName = '') {
  const params = new URLSearchParams({ range, page });
  if (clientId) params.set('clientId', clientId);
  if (eventName) params.set('event', eventName);
  return apiFetch(`/reports/analytics?${params}`);
}

export async function getClientCharts(clientId, range = 'last_7d') {
  const params = new URLSearchParams({ range });
  if (clientId) params.set('clientId', clientId);
  return apiFetch(`/reports/analytics/charts?${params}`);
}

export async function getClientEventDetailById(uuid, clientId) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  return apiFetch(`/reports/analytics/event/${uuid}?${params}`);
}
