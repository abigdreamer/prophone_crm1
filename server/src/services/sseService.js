const clients = new Map(); // account_id → Set<res>

export function addClient(pronophoneId, res) {
  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':\n\n'); // initial comment — signals connection is open to browser

  if (!clients.has(pronophoneId)) clients.set(pronophoneId, new Set());
  clients.get(pronophoneId).add(res);

  return () => {
    clients.get(pronophoneId)?.delete(res);
    if (clients.get(pronophoneId)?.size === 0) clients.delete(pronophoneId);
  };
}

export function push(pronophoneId, event, data) {
  const conns = clients.get(pronophoneId);
  if (!conns || conns.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of conns) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}
