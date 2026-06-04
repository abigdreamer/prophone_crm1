import prisma from '../../lib/prisma.js';
import { decrypt } from '../../lib/encryption.js';
import ResendProvider from './ResendProvider.js';
import BrevoProvider from './BrevoProvider.js';

/**
 * Returns the active email provider instance.
 *
 * Resolution order:
 * 1. Active EmailProviderConfig row in DB (admin-configured via Settings UI)
 * 2. Env var fallback — EMAIL_PROVIDER (default "resend") + RESEND_/BREVO_ env vars
 *    Identical to the original behavior for existing deployments.
 */
export async function getActiveProvider() {
  // 1. Try DB config
  try {
    const config = await prisma.emailProviderConfig.findFirst({
      where: { isActive: true },
    });

    if (config) {
      const apiKey = decrypt(config.apiKeyEncrypted);
      if (config.providerName === 'resend') {
        return new ResendProvider({
          apiKey,
          fromEmail: config.defaultFromEmail || process.env.RESEND_FROM_EMAIL,
          fromName:  config.defaultFromName  || process.env.RESEND_FROM_NAME,
        });
      }
      if (config.providerName === 'brevo') {
        return new BrevoProvider({
          smtpHost:  process.env.BREVO_MAIL_HOST,
          smtpPort:  process.env.BREVO_MAIL_PORT,
          smtpUser:  process.env.BREVO_MAIL_EMAIL,
          smtpPass:  process.env.BREVO_MAIL_PASS,
          fromEmail: config.defaultFromEmail || process.env.BREVO_FROM_EMAIL,
          fromName:  config.defaultFromName  || process.env.BREVO_FROM_NAME,
        });
      }
    }
  } catch (err) {
    // DB unavailable or decryption failed — fall through to env fallback and warn
    console.warn('[EmailProviderFactory] DB config lookup failed, falling back to env vars:', err.message);
  }

  // 2. Env var fallback (original behavior — unchanged for existing deployments)
  const providerName = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

  if (providerName === 'brevo') {
    return new BrevoProvider({
      smtpHost:  process.env.BREVO_MAIL_HOST,
      smtpPort:  process.env.BREVO_MAIL_PORT,
      smtpUser:  process.env.BREVO_MAIL_EMAIL,
      smtpPass:  process.env.BREVO_MAIL_PASS,
      fromEmail: process.env.BREVO_FROM_EMAIL,
      fromName:  process.env.BREVO_FROM_NAME,
    });
  }

  // Default: Resend from env
  return new ResendProvider({
    apiKey:    process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    fromName:  process.env.RESEND_FROM_NAME,
  });
}
