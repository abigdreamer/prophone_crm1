/**
 * Configurable email provider system.
 *
 * Active provider is controlled by EMAIL_PROVIDER env var (default: resend)
 * and can be overridden at runtime via applyRuntimeConfig() — used by the
 * settings API so changes take effect immediately without a server restart.
 *
 * To add a new provider:
 *   1. Create server/src/services/emailProvider/providers/<name>.js implementing BaseEmailProvider
 *   2. Register it in REGISTRY below — no other files need to change
 *   3. Set EMAIL_PROVIDER=<name> or select it in Settings → Email
 */

import { ResendProvider } from './providers/resend.js';
import { BrevoProvider }  from './providers/brevo.js';
import { EmailError }     from './EmailError.js';

export const SUPPORTED_PROVIDERS = ['resend', 'brevo'];

// Registry maps provider name → factory function.
const REGISTRY = {
  resend: () => new ResendProvider(),
  brevo:  () => new BrevoProvider(),
};

// Singleton provider instances, keyed by provider name.
const _instances = {};

// Runtime config — set by applyRuntimeConfig(), overrides env vars.
let _runtime = {
  provider:         null,   // null = defer to env var
  fallbackEnabled:  null,
  fallbackProvider: null,
};

/**
 * Apply a runtime config override (e.g. loaded from the database).
 * Passing null for any field restores env-var fallback for that field.
 */
export function applyRuntimeConfig({ provider, fallbackEnabled, fallbackProvider } = {}) {
  _runtime.provider         = provider         ?? null;
  _runtime.fallbackEnabled  = fallbackEnabled  ?? null;
  _runtime.fallbackProvider = fallbackProvider ?? null;
}

/** Return the current effective config (runtime override > env var > default). */
export function getRuntimeConfig() {
  return {
    provider:         _runtime.provider         ?? process.env.EMAIL_PROVIDER         ?? 'resend',
    fallbackEnabled:  _runtime.fallbackEnabled  ?? (process.env.EMAIL_FALLBACK_ENABLED === 'true'),
    fallbackProvider: _runtime.fallbackProvider ?? process.env.EMAIL_FALLBACK_PROVIDER ?? null,
  };
}

function resolveProviderName(name) {
  const key = (name ?? getRuntimeConfig().provider).toLowerCase().trim();
  if (!REGISTRY[key]) {
    throw new EmailError(
      `Unknown email provider "${key}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      { code: 'UNKNOWN_PROVIDER', provider: key },
    );
  }
  return key;
}

/**
 * Returns the singleton provider instance for the given name (or configured default).
 * @param {string} [name]
 * @returns {import('./providers/base.js').BaseEmailProvider}
 */
export function getProvider(name) {
  const key = resolveProviderName(name);
  if (!_instances[key]) {
    _instances[key] = REGISTRY[key]();
  }
  return _instances[key];
}

/**
 * Send a single email using the configured provider.
 * Payload: { to, from, fromName, subject, html, text?, replyTo?, headers? }
 * @returns {Promise<{ id: string, provider: string }>}
 */
export async function sendEmail(payload) {
  const { fallbackEnabled, fallbackProvider } = getRuntimeConfig();
  const provider = getProvider();
  console.log(`[email] provider=${provider.name} action=sendEmail to=${payload.to}`);

  try {
    return await provider.sendEmail(payload);
  } catch (err) {
    if (fallbackEnabled && fallbackProvider && fallbackProvider !== provider.name) {
      const fallback = getProvider(fallbackProvider);
      console.warn(`[email] provider=${provider.name} sendEmail failed — falling back to ${fallback.name}. error=${err.message}`);
      return await fallback.sendEmail(payload);
    }
    throw err instanceof EmailError ? err : new EmailError(err.message, { originalError: err, provider: provider.name });
  }
}

/**
 * Send a batch of emails using the configured provider.
 * @param {Array<{ to, from, fromName, subject, html, text?, replyTo?, headers? }>} payloads
 * @returns {Promise<Array<{ id: string, provider: string }>>}
 */
export async function sendBatch(payloads) {
  const { fallbackEnabled, fallbackProvider } = getRuntimeConfig();
  const provider = getProvider();
  console.log(`[email] provider=${provider.name} action=sendBatch count=${payloads.length}`);

  try {
    return await provider.sendBatch(payloads);
  } catch (err) {
    if (fallbackEnabled && fallbackProvider && fallbackProvider !== provider.name) {
      const fallback = getProvider(fallbackProvider);
      console.warn(`[email] provider=${provider.name} sendBatch failed — falling back to ${fallback.name}. error=${err.message}`);
      return await fallback.sendBatch(payloads);
    }
    throw err instanceof EmailError ? err : new EmailError(err.message, { originalError: err, provider: provider.name });
  }
}

/**
 * Get delivery status for a sent email by provider message ID.
 * Returns null if the active provider does not support status lookups.
 * @param {string} messageId
 * @returns {Promise<{ status: string }|null>}
 */
export async function getEmailStatus(messageId) {
  return getProvider().getEmailStatus(messageId);
}

export { EmailError };
