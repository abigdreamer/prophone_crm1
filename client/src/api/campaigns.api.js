import { apiFetch } from './client.js';

export const getCampaigns   = ()         => apiFetch('/campaigns');
export const getCampaign    = (id)        => apiFetch(`/campaigns/${id}`);
export const createCampaign = (data)      => apiFetch('/campaigns',      { method: 'POST',   body: JSON.stringify(data) });
export const updateCampaign = (id, data)  => apiFetch(`/campaigns/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
export const deleteCampaign = (id)        => apiFetch(`/campaigns/${id}`, { method: 'DELETE' });

export const getRecipients = (id, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/campaigns/${id}/recipients${q ? '?' + q : ''}`);
};
export const addRecipients       = (id, contactIds) => apiFetch(`/campaigns/${id}/recipients`, { method: 'POST',   body: JSON.stringify({ contactIds }) });
export const removeAllRecipients = (id)             => apiFetch(`/campaigns/${id}/recipients`, { method: 'DELETE' });

export const sendCampaign   = (id) => apiFetch(`/campaigns/${id}/send`,   { method: 'POST' });
export const pauseCampaign  = (id) => apiFetch(`/campaigns/${id}/pause`,  { method: 'POST' });
export const resumeCampaign = (id) => apiFetch(`/campaigns/${id}/resume`, { method: 'POST' });
