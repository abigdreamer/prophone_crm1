import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, getAuthToken } from '../config';
import type { Campaign, CampaignRecipient, Template, Domain } from '../types/marketing';

const TOKEN_KEY = 'prophone_token';

async function getToken(): Promise<string | null> {
  const mem = getAuthToken();
  if (mem) return mem;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  let url = `${API_BASE_URL}${path}`;
  if (params && Object.keys(params).length > 0) {
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    url += `?${query}`;
  }
  const token = await getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  const json = await res.json();
  // Unwrap { success: true, data: ... } envelope
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function fetchCampaigns(clientId?: string | null): Promise<Campaign[]> {
  try {
    const params: Record<string, string> = {};
    if (clientId) params.clientId = clientId;
    const data = await get<Campaign[]>('/campaigns', params);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchCampaign(id: string): Promise<Campaign | null> {
  try {
    return await get<Campaign>(`/campaigns/${id}`);
  } catch {
    return null;
  }
}

export async function fetchCampaignRecipients(
  campaignId: string,
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
): Promise<{ data: CampaignRecipient[]; total: number }> {
  try {
    const p: Record<string, string> = {
      page:  String(params.page ?? 1),
      limit: String(params.limit ?? 30),
    };
    if (params.search?.trim()) p.search = params.search.trim();
    if (params.status) p.status = params.status;
    const res = await get<{ rows: CampaignRecipient[]; total: number }>(
      `/campaigns/${campaignId}/recipients`,
      p,
    );
    return { data: res.rows ?? [], total: res.total ?? 0 };
  } catch {
    return { data: [], total: 0 };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function fetchTemplates(clientId?: string | null): Promise<Template[]> {
  try {
    const params: Record<string, string> = {};
    if (clientId) params.clientId = clientId;
    const data = await get<Template[]>('/email-templates', params);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Domains ───────────────────────────────────────────────────────────────────

export async function fetchDomains(clientId?: string | null): Promise<Domain[]> {
  try {
    const params: Record<string, string> = {};
    if (clientId) params.clientId = clientId;
    // Domains controller uses res.json() directly (not sendSuccess envelope)
    const data = await get<Domain[]>('/domains', params);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
