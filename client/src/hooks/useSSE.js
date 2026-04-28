import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function useSSE(onEvent) {
  useEffect(() => {
    const token = localStorage.getItem('prophone_token');
    if (!token) return;

    const url = `${API_BASE}/api/sse?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);

    es.addEventListener('campaign_update', e => onEvent('campaign_update', JSON.parse(e.data)));
    es.addEventListener('domain_update',   e => onEvent('domain_update',   JSON.parse(e.data)));

    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
