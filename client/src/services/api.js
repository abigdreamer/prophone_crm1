const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('prophone_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
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

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContactCounts() {
  return request('GET', '/api/contacts/counts');
}

// Reads active pool from singleton — no manual params needed
export async function getContacts() {
  const { pool, clientId } = getActivePool();
  const params = new URLSearchParams();
  if (pool === 'client' && clientId) {
    params.set('pool', 'client');
    params.set('clientId', clientId);
  }
  return request('GET', `/api/contacts?${params}`);
}

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

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients() {
  return request('GET', '/api/clients');
}

export async function createClient(data) {
  return request('POST', '/api/clients', data);
}

export async function updateClient(id, data) {
  return request('PATCH', `/api/clients/${id}`, data);
}

// ── Email Templates ───────────────────────────────────────────────────────────

export async function getTemplates() {
  const r = await request('GET', '/api/email-templates');
  return r.data ?? r;
}

export async function getTemplateById(id) {
  const r = await request('GET', `/api/email-templates/${id}`);
  return r.data ?? r;
}

export async function createTemplate(data) {
  const r = await request('POST', '/api/email-templates', data);
  return r.data ?? r;
}

export async function updateTemplate(id, data) {
  const r = await request('PUT', `/api/email-templates/${id}`, data);
  return r.data ?? r;
}

export async function deleteTemplate(id) {
  return request('DELETE', `/api/email-templates/${id}`);
}

export async function duplicateTemplate(id) {
  const r = await request('POST', `/api/email-templates/${id}/duplicate`);
  return r.data ?? r;
}

export async function sendTestEmail(id, email) {
  const r = await request('POST', `/api/email-templates/${id}/send-test`, { email });
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

export async function getCampaignRecipients(id, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await request('GET', `/api/campaigns/${id}/recipients${q ? '?' + q : ''}`);
  return r.data ?? r;
}

export async function addCampaignRecipients(id, data) {
  const r = await request('POST', `/api/campaigns/${id}/recipients`, data);
  return r.data ?? r;
}

export async function removeCampaignRecipients(id) {
  return request('DELETE', `/api/campaigns/${id}/recipients`);
}

export async function previewCampaignRecipients(campaignId, filter) {
  const { clientId } = getActivePool();
  const params = new URLSearchParams({ filter, clientId: clientId || '' });
  const r = await request('GET', `/api/campaigns/${campaignId}/recipients/preview?${params}`);
  return r.data ?? r;
}

export async function sendCampaign(id) {
  const r = await request('POST', `/api/campaigns/${id}/send`);
  return r.data ?? r;
}

export async function getCampaignAnalytics(id) {
  const r = await request('GET', `/api/campaigns/${id}/analytics`);
  return r.data ?? r;
}

export async function getPublishedTemplates() {
  const { clientId } = getActivePool();
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  const r = await request('GET', `/api/campaigns/templates/published?${params}`);
  return r.data ?? r;
}
