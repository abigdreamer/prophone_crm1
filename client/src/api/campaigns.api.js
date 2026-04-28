import { apiFetch } from './client.js';

export const getCampaigns   = ()         => apiFetch('/campaigns');
export const getCampaign    = (id)        => apiFetch(`/campaigns/${id}`);
export const createCampaign = (data)      => apiFetch('/campaigns',      { method: 'POST',   body: JSON.stringify(data) });
export const updateCampaign = (id, data)  => apiFetch(`/campaigns/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
export const deleteCampaign = (id)        => apiFetch(`/campaigns/${id}`, { method: 'DELETE' });

export const getRecipients = (id, params = {}) => {
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  const q = new URLSearchParams(filtered).toString();
  return apiFetch(`/campaigns/${id}/recipients${q ? '?' + q : ''}`);
};
export const addRecipients       = (id, contactIds, variant) => apiFetch(`/campaigns/${id}/recipients`,       { method: 'POST', body: JSON.stringify({ contactIds, ...(variant ? { variant } : {}) }) });
export const addGroupRecipients  = (id, groupId, variant)    => apiFetch(`/campaigns/${id}/recipients/group`, { method: 'POST', body: JSON.stringify({ groupId,    ...(variant ? { variant } : {}) }) });
export const removeAllRecipients = (id)             => apiFetch(`/campaigns/${id}/recipients`,       { method: 'DELETE' });

export const getRecipientEvents = (campaignId, recipientId) => apiFetch(`/campaigns/${campaignId}/recipients/${recipientId}/events`);

export const sendCampaign   = (id) => apiFetch(`/campaigns/${id}/send`,   { method: 'POST' });
export const pauseCampaign  = (id) => apiFetch(`/campaigns/${id}/pause`,  { method: 'POST' });
export const resumeCampaign = (id) => apiFetch(`/campaigns/${id}/resume`, { method: 'POST' });
export const syncCampaign   = (id) => apiFetch(`/campaigns/${id}/sync`,   { method: 'POST' });
