export function tenantId(req) {
  return req.user?.clientId ?? null;
}
