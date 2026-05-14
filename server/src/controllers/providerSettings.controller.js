/**
 * Provider settings controller — manages encrypted API keys and webhook secrets.
 *
 * Rules:
 *  - Raw keys are NEVER returned in any API response.
 *  - Only Admin-role users may save or view key status.
 *  - Passing an empty string clears the stored DB key (env fallback takes over).
 */

import {
  getProviderStatus,
  getAllProviderStatuses,
  saveApiKey,
  saveWebhookSecret,
} from '../services/settings/SettingsService.js';
import { SUPPORTED_PROVIDERS } from '../services/emailProvider/index.js';

// GET /api/provider-settings
export async function listProviderStatuses(req, res) {
  const statuses = await getAllProviderStatuses();
  res.json({ providers: statuses, supported: SUPPORTED_PROVIDERS });
}

// GET /api/provider-settings/:provider
export async function getOneProviderStatus(req, res) {
  const { provider } = req.params;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Unknown provider "${provider}"` });
  }
  const status = await getProviderStatus(provider);
  res.json(status);
}

// PUT /api/provider-settings/:provider/api-key
export async function updateApiKey(req, res) {
  const { provider } = req.params;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Unknown provider "${provider}"` });
  }

  const { apiKey } = req.body;
  if (apiKey === undefined) return res.status(400).json({ error: 'apiKey is required' });

  await saveApiKey(provider, apiKey || null);

  const status = await getProviderStatus(provider);
  res.json({ saved: true, ...status });
}

// PUT /api/provider-settings/:provider/webhook-secret
export async function updateWebhookSecret(req, res) {
  const { provider } = req.params;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Unknown provider "${provider}"` });
  }

  const { webhookSecret } = req.body;
  if (webhookSecret === undefined) return res.status(400).json({ error: 'webhookSecret is required' });

  await saveWebhookSecret(provider, webhookSecret || null);

  const status = await getProviderStatus(provider);
  res.json({ saved: true, ...status });
}
