import { apiFetch } from "./client.js";

export const listGroups   = ()         => apiFetch("/groups");
export const createGroup  = (name)     => apiFetch("/groups",      { method: "POST",   body: JSON.stringify({ name }) });
export const updateGroup  = (id, name) => apiFetch(`/groups/${id}`, { method: "PUT",    body: JSON.stringify({ name }) });
export const deleteGroup  = (id)       => apiFetch(`/groups/${id}`, { method: "DELETE" });
