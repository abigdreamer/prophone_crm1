/**
 * SettingsService — encrypted storage of provider API keys and webhook secrets.
 *
 * Keys are encrypted with AES-256-GCM before being written to the DB and
 * decrypted only server-side when needed.  The master encryption key is kept
 * in ENCRYPTION_KEY env var and is never stored in the database.
 *
 * API responses NEVER include raw keys — only a `hasKey` boolean.
 *
 * DB keys take priority; env-var fallback lets existing deployments keep
 * working without migrating keys into the UI.
 */

import crypto from 'crypto';
import prisma  from '../../lib/prisma.js';

const ALGORITHM  = 'aes-256-gcm';
const KEY_BYTES  = 32;
const IV_BYTES   = 12;
const TAG_BYTES  = 16;
const SALT       = 'prophone-provider-settings-v1';

// ── Crypto helpers ─────────────────────────────────────────────────────────────

function getMasterKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY env var is required for encrypted provider settings');
  return crypto.scryptSync(raw, SALT, KEY_BYTES);
}

export function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getMasterKey();
  const iv  = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(encoded) {
  if (!encoded) return '';
  try {
    const buf  = Buffer.from(encoded, 'base64');
    const iv   = buf.subarray(0, IV_BYTES);
    const tag  = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const enc  = buf.subarray(IV_BYTES + TAG_BYTES);
    const key  = getMasterKey();
    const dec  = crypto.createDecipheriv(ALGORITHM, key, iv);
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8');
  } catch {
    return '';
  }
}

// ── ENV fallbacks (so existing installations keep working) ────────────────────

const ENV_FALLBACK = {
  resend: { apiKey: () => process.env.RESEND_API_KEY,         webhookSecret: () => process.env.RESEND_WEBHOOK_SECRET },
  brevo:  { apiKey: () => process.env.BREVO_API_KEY,          webhookSecret: () => process.env.BREVO_WEBHOOK_SECRET  },
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns decrypted API key for a provider.
 * DB value takes priority over env var fallback.
 */
export async function getApiKey(provider) {
  const record = await prisma.providerSettings.findUnique({ where: { provider } });
  if (record?.encryptedApiKey) {
    const key = decrypt(record.encryptedApiKey);
    if (key) return key;
  }
  return ENV_FALLBACK[provider]?.apiKey?.() || null;
}

/**
 * Returns decrypted webhook secret for a provider.
 * DB value takes priority over env var fallback.
 */
export async function getWebhookSecret(provider) {
  const record = await prisma.providerSettings.findUnique({ where: { provider } });
  if (record?.encryptedWebhookSecret) {
    const secret = decrypt(record.encryptedWebhookSecret);
    if (secret) return secret;
  }
  return ENV_FALLBACK[provider]?.webhookSecret?.() || null;
}

/**
 * Save an API key encrypted in the database.
 * Pass null/empty to clear the stored key (env fallback will be used).
 */
export async function saveApiKey(provider, apiKey) {
  const encryptedApiKey = apiKey ? encrypt(apiKey) : '';
  await prisma.providerSettings.upsert({
    where:  { provider },
    update: { encryptedApiKey },
    create: { provider, encryptedApiKey },
  });
}

/**
 * Save a webhook secret encrypted in the database.
 */
export async function saveWebhookSecret(provider, secret) {
  const encryptedWebhookSecret = secret ? encrypt(secret) : '';
  await prisma.providerSettings.upsert({
    where:  { provider },
    update: { encryptedWebhookSecret },
    create: { provider, encryptedWebhookSecret },
  });
}

/**
 * Returns public status for a provider — never exposes actual key values.
 */
export async function getProviderStatus(provider) {
  const record = await prisma.providerSettings.findUnique({ where: { provider } });
  const dbHasKey    = Boolean(record?.encryptedApiKey && decrypt(record.encryptedApiKey));
  const dbHasSecret = Boolean(record?.encryptedWebhookSecret && decrypt(record.encryptedWebhookSecret));
  const envHasKey    = Boolean(ENV_FALLBACK[provider]?.apiKey?.());
  const envHasSecret = Boolean(ENV_FALLBACK[provider]?.webhookSecret?.());

  return {
    provider,
    hasApiKey:        dbHasKey    || envHasKey,
    apiKeySource:     dbHasKey    ? 'db'  : envHasKey    ? 'env' : null,
    hasWebhookSecret: dbHasSecret || envHasSecret,
    webhookSecretSource: dbHasSecret ? 'db' : envHasSecret ? 'env' : null,
  };
}

/**
 * Returns status for all known providers.
 */
export async function getAllProviderStatuses() {
  const providers = ['resend', 'brevo'];
  return Promise.all(providers.map(getProviderStatus));
}
