import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';
import type { Client } from '../types/client';
import type { Contact } from '../types/contact';

const TOKEN_KEY = 'prophone_token';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const token = await getToken();
  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export type ContactsQuery = {
  clientId?: string | null;
  search?: string;
  sortBy?: string;
  stages?: string;   // comma-separated, e.g. "new,contacted"
  scoreMin?: number;
  scoreMax?: number;
  limit?: number;
  page?: number;
};

export async function fetchContacts(
  query: ContactsQuery = {},
): Promise<{ data: Contact[]; total: number }> {
  const params: Record<string, string> = { limit: String(query.limit ?? 1000) };
  if (query.page && query.page > 1) params.page = String(query.page);

  if (query.clientId) {
    params.pool = 'client';
    params.clientId = query.clientId;
  }
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.sortBy)         params.sortBy = query.sortBy;
  if (query.stages)         params.stages = query.stages;
  if (query.scoreMin != null) params.scoreMin = String(query.scoreMin);
  if (query.scoreMax != null) params.scoreMax = String(query.scoreMax);

  const res = await get<{ data: Contact[]; total: number }>('/contacts', params);
  return { data: res.data ?? [], total: res.total ?? 0 };
}

export async function fetchContact(id: string): Promise<Contact> {
  return get<Contact>(`/contacts/${id}`);
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const data = await get<Client[] | { clients: Client[] }>('/clients');
    return Array.isArray(data) ? data : (data as { clients: Client[] }).clients ?? [];
  } catch {
    return [];
  }
}
