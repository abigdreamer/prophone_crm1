const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('prophone_token');
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data?.data ?? data;
}
