const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const FOXTOW_API = import.meta.env.FOXTOW_API || 'https://render-foxtow-server.onrender.com';

// ── Active pool singleton ─────────────────────────────────────────────────────
// Synced from PoolContext whenever the user switches pool/client.
// API functions read from here instead of requiring manual params.
let _pool     = "client";
let _clientId = "foxtow";

export function setActivePool(pool, clientId) {
  _pool     = pool;
  _clientId = clientId || null;
}

export function getActivePool() {
  return { pool: _pool, clientId: _clientId };
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("prophone_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || "Request failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  try {
    const { token, user } = await request('POST', '/api/auth/login', { email, password });
    localStorage.setItem('prophone_token', token);
    return user;
  } catch (err) {
    if (err.message === 'Invalid credentials') return null;
    throw err;
  }
}

export async function getMe() {
  return request('GET', '/api/auth/me');
}

export async function getUsers() {
  return request('GET', '/api/users');
}

export async function createSystemUser(data) {
  return request('POST', '/api/users', data);
}

export async function updateSystemUser(id, data) {
  return request('PATCH', `/api/users/${id}`, data);
}

export async function deleteSystemUser(id) {
  return request('DELETE', `/api/users/${id}`);
}

export async function getAllPortalUsers() {
  return request('GET', '/api/users/portal-users');
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContactCounts() {
  return request('GET', '/api/contacts/counts');
}

export async function getDashboardSummary() {
  const { pool, clientId } = getActivePool();
  const params = new URLSearchParams();
  if (pool) params.set('pool', pool);
  if (pool === 'client' && clientId) params.set('clientId', clientId);
  return request('GET', `/api/contacts/dashboard-summary?${params}`);
}

// Reads active pool from singleton — no manual params needed
export async function getContacts({ page = 1, limit = 1000, status = null, search = '', stages = [], sortBy = 'recent', scoreMin = 0, scoreMax = 100, udfFilters = {}, customFilters = {}, searchMethods = {} } = {}) {
  const { pool, clientId } = getActivePool();
  const params = new URLSearchParams();
  if (pool === 'client' && clientId) {
    params.set('pool', 'client');
    params.set('clientId', clientId);
  }
  if (status && status !== 'all')  params.set('status', status);
  if (search)                      params.set('search', search);
  if (stages.length > 0)           params.set('stages', stages.join(','));
  if (sortBy) params.set('sortBy', sortBy);
  if (scoreMin > 0)                params.set('scoreMin', scoreMin);
  if (scoreMax < 100)              params.set('scoreMax', scoreMax);
  const activeUdfFilters = Object.fromEntries(Object.entries(udfFilters).filter(([, v]) => v !== '' && v != null));
  if (Object.keys(activeUdfFilters).length > 0) params.set('udfFilters', JSON.stringify(activeUdfFilters));
  const activeCustomFilters = Object.fromEntries(Object.entries(customFilters).filter(([, v]) => {
    if (v == null || v === '') return false;
    if (typeof v === 'object') return Object.values(v).some(x => x !== '' && x != null);
    return true;
  }));
  if (Object.keys(activeCustomFilters).length > 0) params.set('customFilters', JSON.stringify(activeCustomFilters));
  const hasSearchOverrides = Object.values(searchMethods).some(v => v === false);
  if (hasSearchOverrides) params.set('searchMethods', JSON.stringify(searchMethods));
  params.set('page', page);
  params.set('limit', limit);
  return request('GET', `/api/contacts?${params}`);
}

export const getCustomSorts      = ()        => { const p = new URLSearchParams(); if (_clientId) p.set('clientId', _clientId); return request('GET', `/api/custom-options/sorts?${p}`); };
export const createCustomSort    = (data)    => request('POST',   '/api/custom-options/sorts',     { ...data, clientId: _clientId || null });
export const updateCustomSort    = (id, d)   => request('PATCH',  `/api/custom-options/sorts/${id}`, d);
export const deleteCustomSort    = (id)      => request('DELETE', `/api/custom-options/sorts/${id}`);
export const getCustomFilterOpts = ()        => { const p = new URLSearchParams(); if (_clientId) p.set('clientId', _clientId); return request('GET', `/api/custom-options/filters?${p}`); };
export const createCustomFilterOpt  = (data) => request('POST',   '/api/custom-options/filters',     { ...data, clientId: _clientId || null });
export const updateCustomFilterOpt  = (id, d)=> request('PATCH',  `/api/custom-options/filters/${id}`, d);
export const deleteCustomFilterOpt  = (id)   => request('DELETE', `/api/custom-options/filters/${id}`);

export const getUdfs         = ()               => { const p = new URLSearchParams(); if (_clientId) p.set('clientId', _clientId); return request('GET', `/api/udfs?${p}`); };
export const createUdf       = (data)           => request('POST',   '/api/udfs',     { ...data, clientId: _clientId || null });
export const updateUdf       = (id, data)       => request('PATCH',  `/api/udfs/${id}`, data);
export const deleteUdf       = (id)             => request('DELETE', `/api/udfs/${id}`);
export const cleanupUdfs     = (clientId)       => request('POST',   '/api/udfs/cleanup', { clientId: clientId || null });
export const seedUdfs        = (clientId)       => request('POST',   '/api/udfs/seed',    { clientId: clientId || null });
export const getUdfValues    = (fieldKey, search = '') => { const p = new URLSearchParams({ fieldKey, search }); if (_clientId) p.set('clientId', _clientId); return request('GET', `/api/udfs/values?${p}`); };
export const getContactUdfs    = (contactId)    => request('GET', `/api/contacts/${contactId}/udfs`);
export const updateContactUdfs = (contactId, values) => request('PUT', `/api/contacts/${contactId}/udfs`, values);

export async function getContact(id) {
  return request('GET', `/api/contacts/${id}`);
}

export async function createContact(contact) {
  const { pool, clientId } = getActivePool();
  return request('POST', '/api/contacts', {
    ...contact,
    pool:     pool     ?? contact.pool,
    clientId: clientId ?? contact.clientId ?? null,
  });
}

export async function updateContact(id, contact) {
  return request('PATCH', `/api/contacts/${id}`, contact);
}

export async function importContacts({ rows, clientId, pool = 'client', duplicateAction = 'ignore' }) {
  return request('POST', '/api/contacts/import', { rows, clientId, pool, duplicateAction });
}

export async function cancelContact(id, cancelReason = '') {
  return request('POST', `/api/contacts/${id}/cancel`, { cancelReason });
}

export async function getContactClientActivities(contactId) {
  return request('GET', `/api/contacts/${contactId}/client-activities`);
}

export async function restoreContact(id) {
  return request('POST', `/api/contacts/${id}/restore`);
}

export async function getCanceledContacts() {
  const { pool, clientId } = getActivePool();
  const params = new URLSearchParams();
  if (pool === 'client' && clientId) {
    params.set('pool', 'client');
    params.set('clientId', clientId);
  }
  return request('GET', `/api/contacts/canceled?${params}`);
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function addActivity(contactId, activity) {
  await request('POST', `/api/contacts/${contactId}/activities`, activity);
}

// ── Domains ───────────────────────────────────────────────────────────────────

export async function getDomains() {
  const { pool, clientId } = getActivePool();
  const params = new URLSearchParams();
  if (pool === 'client' && clientId) params.set('clientId', clientId);
  return request('GET', `/api/domains?${params}`);
}

// clientId is injected automatically from the active pool singleton
export async function addDomain(name) {
  const { clientId } = getActivePool();
  return request('POST', '/api/domains', { name, clientId: clientId || null });
}

export async function updateDomain(id, data) {
  return request('PATCH', `/api/domains/${id}`, data);
}

export async function deleteDomain(id) {
  return request('DELETE', `/api/domains/${id}`);
}

export async function verifyDomain(id) {
  return request('POST', `/api/domains/${id}/verify`);
}

export async function cancelDomain(id, cancelReason = '') {
  return request('POST', `/api/domains/${id}/cancel`, { cancelReason });
}

export async function restoreDomain(id) {
  return request('POST', `/api/domains/${id}/restore`);
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients(includeCanceled = false) {
  return request('GET', `/api/clients${includeCanceled ? '?all=true' : ''}`);
}

export async function createClient(data) {
  return request('POST', '/api/clients', data);
}

export async function updateClient(id, data) {
  return request('PATCH', `/api/clients/${id}`, data);
}

export async function cancelClient(id, cancelReason = '') {
  return request('POST', `/api/clients/${id}/cancel`, { cancelReason });
}

export async function restoreClient(id) {
  return request('POST', `/api/clients/${id}/restore`);
}

export async function getCanceledClients() {
  return request('GET', '/api/clients/canceled');
}

export async function getClientActivities(id) {
  return request('GET', `/api/clients/${id}/client-activities`);
}

// ── Email Templates ───────────────────────────────────────────────────────────

export async function getTemplates() {
  const { clientId } = getActivePool();
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const r = await request('GET', `/api/email-templates?${params}`);
  return r.data ?? r;
}

export async function getTemplateById(id) {
  // No client scoping — a direct UUID lookup is auth-gated and must work across pool contexts
  // (e.g. share links opened under a different active client)
  const r = await request('GET', `/api/email-templates/${id}`);
  return r.data ?? r;
}

export async function createTemplate(data) {
  const { clientId } = getActivePool();
  const r = await request('POST', '/api/email-templates', { clientId: clientId || null, ...data });
  return r.data ?? r;
}

export async function updateTemplate(id, data) {
  const { clientId } = getActivePool();
  const r = await request('PUT', `/api/email-templates/${id}`, { clientId: clientId || null, ...data });
  return r.data ?? r;
}

export async function deleteTemplate(id) {
  return request('DELETE', `/api/email-templates/${id}`);
}

export async function cancelTemplate(id, cancelReason = '') {
  const r = await request('POST', `/api/email-templates/${id}/cancel`, { cancelReason });
  return r.data ?? r;
}

export async function restoreTemplate(id) {
  const r = await request('POST', `/api/email-templates/${id}/restore`);
  return r.data ?? r;
}

export async function duplicateTemplate(id) {
  const r = await request('POST', `/api/email-templates/${id}/duplicate`);
  return r.data ?? r;
}

export async function sendTestEmail(id, email) {
  const r = await request('POST', `/api/email-templates/${id}/send-test`, { email });
  return r.data ?? r;
}

// Sanitize + validate HTML server-side. Returns { html, validation }.
// Does NOT save to the database — use createTemplate / updateTemplate for that.
export async function importHtml(html, { safeMode = false } = {}) {
  const r = await request('POST', '/api/email-templates/import', { html, safeMode });
  return r.data ?? r;
}

// ── Interactive Sessions ──────────────────────────────────────────────────────

export async function createInteractiveSession(data) {
  const r = await request('POST', '/api/interactive/sessions', data);
  return r.data ?? r;
}

export async function getContactInteractiveSessions(contactId) {
  const r = await request('GET', `/api/interactive/sessions/contact/${contactId}`);
  return r.data ?? r;
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaigns() {
  const { clientId } = getActivePool();
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const r = await request('GET', `/api/campaigns?${params}`);
  return r.data ?? r;
}

export async function getCampaign(id) {
  const r = await request('GET', `/api/campaigns/${id}`);
  return r.data ?? r;
}

export async function createCampaign(data) {
  const r = await request('POST', '/api/campaigns', data);
  return r.data ?? r;
}

export async function updateCampaign(id, data) {
  const r = await request('PATCH', `/api/campaigns/${id}`, data);
  return r.data ?? r;
}

export async function deleteCampaign(id) {
  return request('DELETE', `/api/campaigns/${id}`);
}

export async function cancelCampaign(id, cancelReason = '') {
  const r = await request('POST', `/api/campaigns/${id}/cancel`, { cancelReason });
  return r.data ?? r;
}

export async function restoreCampaign(id) {
  const r = await request('POST', `/api/campaigns/${id}/restore`);
  return r.data ?? r;
}

export async function getCampaignRecipients(id, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await request('GET', `/api/campaigns/${id}/recipients${q ? '?' + q : ''}`);
  return r.data ?? r;
}

export async function addCampaignRecipients(id, data) {
  const r = await request('POST', `/api/campaigns/${id}/recipients`, data);
  return r.data ?? r;
}

export async function getContactsForCampaign(clientId) {
  const params = new URLSearchParams();
  if (clientId) { params.set('pool', 'client'); params.set('clientId', clientId); }
  const r = await request('GET', `/api/contacts?${params}`);
  return Array.isArray(r) ? r : (r.data ?? []);
}

export async function removeCampaignRecipients(id) {
  return request('DELETE', `/api/campaigns/${id}/recipients`);
}

export async function previewCampaignRecipients(campaignId, filter) {
  const params = new URLSearchParams({ filter });
  const r = await request('GET', `/api/campaigns/${campaignId}/recipients/preview?${params}`);
  return r.data ?? r;
}

export async function sendCampaign(id, { limit, label } = {}) {
  const body = (limit || label) ? { ...(limit ? { limit } : {}), ...(label ? { label } : {}) } : undefined;
  const r = await request('POST', `/api/campaigns/${id}/send`, body);
  return r.data ?? r;
}

export async function resendCampaign(id, recipientStatuses) {
  const r = await request('POST', `/api/campaigns/${id}/resend`, { recipientStatuses });
  return r.data ?? r;
}

export async function duplicateCampaign(id) {
  const r = await request('POST', `/api/campaigns/${id}/duplicate`);
  return r.data ?? r;
}

export async function getCampaignAnalytics(id) {
  const r = await request('GET', `/api/campaigns/${id}/analytics`);
  return r.data ?? r;
}

export async function exportCampaignBlob(id, format = 'excel', params = {}) {
  const token = localStorage.getItem('prophone_token');
  const qs = new URLSearchParams({ format, ...params }).toString();
  const res = await fetch(`${API}/api/campaigns/${id}/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  const cd = res.headers.get('content-disposition') || '';
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `campaign_export.${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Real campaign send to specific contacts — full tracking, recipients stored, stats updated.
// domainFilter: optional array like ['gmail.com', 'yahoo.com']
export async function quickSendCampaign(campaignId, { contactIds, domainFilter = [] } = {}) {
  const r = await request('POST', `/api/campaigns/${campaignId}/send-to`, { contactIds, domainFilter });
  return r.data ?? r;
}

export async function getPublishedTemplates() {
  const { clientId } = getActivePool();
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const r = await request('GET', `/api/campaigns/templates/published?${params}`);
  return r.data ?? r;
}

export async function dryRunCampaignSend(id, limit = null) {
  const q = limit ? `?limit=${limit}` : '';
  const r = await request('GET', `/api/campaigns/${id}/send/dry-run${q}`);
  return r.data ?? r;
}

export async function resubscribeRecipient(campaignId, recipientId) {
  const r = await request('POST', `/api/campaigns/${campaignId}/recipients/${recipientId}/resubscribe`);
  return r.data ?? r;
}

// ── Campaign Queue ────────────────────────────────────────────────────────────

export async function getCampaignQueue(campaignId) {
  const r = await request('GET', `/api/campaigns/${campaignId}/queue`);
  return r.data ?? r;
}

export async function createCampaignQueue(campaignId, { clientId, dailyLimit, sendTime, timezone, sendGapSeconds }) {
  const r = await request('POST', `/api/campaigns/${campaignId}/queue`, { clientId, dailyLimit, sendTime, timezone, sendGapSeconds });
  return r.data ?? r;
}

export async function updateCampaignQueue(campaignId, { dailyLimit, sendTime, timezone, sendGapSeconds }) {
  const r = await request('PATCH', `/api/campaigns/${campaignId}/queue`, { dailyLimit, sendTime, timezone, sendGapSeconds });
  return r.data ?? r;
}

export async function pauseCampaignQueue(campaignId) {
  const r = await request('POST', `/api/campaigns/${campaignId}/queue/pause`);
  return r.data ?? r;
}

export async function resumeCampaignQueue(campaignId) {
  const r = await request('POST', `/api/campaigns/${campaignId}/queue/resume`);
  return r.data ?? r;
}

export async function cancelCampaignQueue(campaignId) {
  const r = await request('DELETE', `/api/campaigns/${campaignId}/queue`);
  return r.data ?? r;
}

export async function exportCampaignDayBlob(campaignId, dayNumber, format = 'excel') {
  const token = localStorage.getItem('prophone_token');
  const qs = new URLSearchParams({ format, day: dayNumber }).toString();
  const res = await fetch(`${API}/api/campaigns/${campaignId}/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `campaign_day${dayNumber}.${ext}`; a.click();
  URL.revokeObjectURL(url);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(clientId, module) {
  const params = new URLSearchParams({ module });
  if (clientId) params.set('clientId', clientId);
  return request('GET', `/api/settings?${params}`);
}

export async function saveSettings(clientId, module, config) {
  return request('PUT', '/api/settings', { clientId: clientId || null, module, config });
}

// ── Reddit Monitoring ────────────────────────────────────────────────────

export async function getRedditMonitors(clientId) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  return request('GET', `/api/reddit/monitors?${params}`);
}

export async function createRedditMonitor(data) {
  return request('POST', '/api/reddit/monitors', data);
}

export async function updateRedditMonitor(id, data) {
  return request('PATCH', `/api/reddit/monitors/${id}`, data);
}

export async function deleteRedditMonitor(id) {
  return request('DELETE', `/api/reddit/monitors/${id}`);
}

export async function getRedditPosts(params = {}) {
  const q = new URLSearchParams(params).toString();
  return request('GET', `/api/reddit/posts${q ? '?' + q : ''}`);
}

export async function generateRedditDraft(postId) {
  return request('POST', `/api/reddit/posts/${postId}/draft`);
}

export async function updateRedditPost(postId, data) {
  return request('PATCH', `/api/reddit/posts/${postId}`, data);
}

export async function getRedditStats(clientId) {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  return request('GET', `/api/reddit/stats?${params}`);
}

// ── Foxtow External API ───────────────────────────────────────────────────────

export async function getFoxtowNewsletterSubscribers({ active = true, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ active, page, limit });
  const res = await fetch(`${FOXTOW_API}/api/v1/newsletter/subscribers?${params}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Failed to fetch subscribers');
  return data;
}

// ── Client Portal Auth ────────────────────────────────────────────────────────

// Separate fetch wrapper that uses the client portal token
async function portalRequest(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("prophone_client_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || "Request failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function clientLoginUser(username, password) {
  try {
    const { token, user } = await request('POST', '/api/auth/client-login', { username, password });
    localStorage.setItem('prophone_client_token', token);
    return user;
  } catch (err) {
    if (err.message === 'Invalid credentials') return null;
    throw err;
  }
}

export async function clientGetMe() {
  return portalRequest('GET', '/api/auth/client-me');
}

// ── Client Portal Data ────────────────────────────────────────────────────────

export async function portalGetDashboard() {
  return portalRequest('GET', '/api/portal/dashboard');
}

export async function portalGetLeads(params = {}) {
  const q = new URLSearchParams(params).toString();
  return portalRequest('GET', `/api/portal/leads${q ? '?' + q : ''}`);
}

export async function portalGetLead(id) {
  return portalRequest('GET', `/api/portal/leads/${id}`);
}

export async function portalGetCampaigns() {
  return portalRequest('GET', '/api/portal/campaigns');
}

export async function portalGetCampaign(id) {
  return portalRequest('GET', `/api/portal/campaigns/${id}`);
}

export async function portalGetProfile() {
  return portalRequest('GET', '/api/portal/profile');
}

export async function portalUpdateProfile(data) {
  return portalRequest('PATCH', '/api/portal/profile', data);
}

// ── Admin: Client Portal User Management ─────────────────────────────────────

export async function getClientPortalUsers(clientId) {
  return request('GET', `/api/clients/${clientId}/portal-users`);
}

export async function createClientPortalUser(clientId, data) {
  return request('POST', `/api/clients/${clientId}/portal-users`, data);
}

export async function updateClientPortalUser(clientId, userId, data) {
  return request('PATCH', `/api/clients/${clientId}/portal-users/${userId}`, data);
}

export async function deleteClientPortalUser(clientId, userId) {
  return request('DELETE', `/api/clients/${clientId}/portal-users/${userId}`);
}
