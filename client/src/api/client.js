/**
 * Shared API client for all ProPhone API calls.
 *
 * - Attaches the Bearer token from localStorage automatically.
 * - Unwraps the { success, data } envelope returned by the backend.
 * - Parses error messages from { success: false, error } responses.
 * - Logs detailed errors to the console; surfaces only safe messages to callers.
 */

const API = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('prophone_token') || '';
}

export function getSuperAdminTenantId() {
  try {
    const u = JSON.parse(localStorage.getItem('prophone_user') || 'null');
    if (u?.role !== 'super_admin') return null;
    return localStorage.getItem('prophone_scoped_company') || null;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper.
 * - Non-2xx responses: attempts to parse { error } from body, throws with that message.
 * - 2xx responses: unwraps { success: true, data } envelope if present, else returns raw JSON.
 */
export async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers,
      },
      ...options,
    });
  } catch (networkErr) {
    console.error('[apiFetch] Network error:', networkErr);
    throw new Error('Network error — please check your connection');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error || body?.message || message;
    } catch {
      try { message = (await res.text()) || message; } catch {}
    }
    console.error(`[apiFetch] ${res.status} ${path}:`, message);
    throw new Error(message);
  }

  const json = await res.json();

  // Unwrap standardized envelope: { success: true, data: ... }
  if (json !== null && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data;
  }
  return json;
}
