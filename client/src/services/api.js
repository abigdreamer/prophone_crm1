const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

// ── Auth ───────────────────────────────────────────────────────────────────────

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

// ── Contacts ───────────────────────────────────────────────────────────────────

export async function getContactCounts() {
  return request('GET', '/api/contacts/counts');
}

export async function getContacts(pool, clientId) {
  const params = new URLSearchParams({ pool });
  if (pool === 'client' && clientId) params.set('clientId', clientId);
  return request('GET', `/api/contacts?${params}`);
}

export async function getContact(id) {
  return request('GET', `/api/contacts/${id}`);
}

export async function createContact(contact) {
  return request('POST', '/api/contacts', contact);
}

export async function updateContact(id, contact) {
  return request('PATCH', `/api/contacts/${id}`, contact);
}

// ── Activities ─────────────────────────────────────────────────────────────────

export async function addActivity(contactId, activity) {
  await request('POST', `/api/contacts/${contactId}/activities`, activity);
}

// ── Domains ────────────────────────────────────────────────────────────────────

export async function getDomains() {
  return request('GET', '/api/domains');
}

export async function addDomain(name, clientId) {
  return request('POST', '/api/domains', { name, clientId: clientId || null });
}

export async function deleteDomain(id) {
  return request('DELETE', `/api/domains/${id}`);
}

export async function verifyDomain(id) {
  return request('POST', `/api/domains/${id}/verify`);
}
