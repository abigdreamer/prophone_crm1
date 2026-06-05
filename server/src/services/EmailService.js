import prisma from '../lib/prisma.js';
import { decrypt } from '../lib/encryption.js';
import { getActiveProvider } from './emailProviders/EmailProviderFactory.js';

/**
 * Thin delegation wrapper — identical export signatures to resendService.js.
 * All call sites import from here; the underlying provider is resolved at send time.
 */

export async function sendSingleEmail(payload) {
  const provider = await getActiveProvider();
  return provider.sendSingle(payload);
}

export async function sendBatchEmails(emails) {
  const provider = await getActiveProvider();
  return provider.sendBatch(emails);
}

/**
 * Returns { fromEmail, fromName } from the active provider DB config.
 * Falls back to env vars if no DB config is active.
 * Used in the from-email resolution chain so domain-based addresses
 * (Resend-registered) are not used when Brevo is the active provider.
 */
export async function getActiveFromDefaults() {
  try {
    const config = await prisma.emailProviderConfig.findFirst({ where: { isActive: true } });
    if (config && config.defaultFromEmail) {
      return {
        fromEmail: config.defaultFromEmail,
        fromName:  config.defaultFromName || '',
        provider:  config.providerName,
      };
    }
  } catch {
    // DB unavailable — fall through to env vars
  }
  const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
  return {
    fromEmail: provider === 'brevo'
      ? (process.env.BREVO_FROM_EMAIL || '')
      : (process.env.RESEND_FROM_EMAIL || ''),
    fromName: provider === 'brevo'
      ? (process.env.BREVO_FROM_NAME || '')
      : (process.env.RESEND_FROM_NAME || ''),
    provider,
  };
}
