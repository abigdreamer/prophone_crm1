const BASE = "/api/groups";

function authHeaders() {
  const token = localStorage.getItem("prophone_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
}

export const listGroups   = ()         => request("GET",    "/");
export const createGroup  = (name)     => request("POST",   "/",       { name });
export const updateGroup  = (id, name) => request("PUT",    `/${id}`,  { name });
export const deleteGroup  = (id)       => request("DELETE", `/${id}`);
