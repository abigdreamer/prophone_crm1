import prisma from '../lib/prisma.js';
import { encrypt, decrypt, maskApiKey } from '../lib/encryption.js';
import ResendProvider from '../services/emailProviders/ResendProvider.js';
import BrevoProvider from '../services/emailProviders/BrevoProvider.js';

const VALID_PROVIDERS = ['resend', 'brevo'];

function formatConfig(row) {
  let maskedKey = '';
  if (row.apiKeyEncrypted) {
    try {
      maskedKey = maskApiKey(decrypt(row.apiKeyEncrypted));
    } catch {
      maskedKey = '****';
    }
  }
  return {
    id:              row.id,
    providerName:    row.providerName,
    apiKeyMasked:    maskedKey,
    defaultFromEmail: row.defaultFromEmail,
    defaultFromName:  row.defaultFromName,
    isActive:        row.isActive,
    updatedAt:       row.updatedAt,
  };
}

// GET /api/email-config
export async function getEmailConfig(req, res) {
  const configs = await prisma.emailProviderConfig.findMany({
    orderBy: { providerName: 'asc' },
  });
  const activeRow = configs.find(c => c.isActive);
  res.json({
    configs:  configs.map(formatConfig),
    activeId: activeRow?.id ?? null,
  });
}

// POST /api/email-config
export async function saveEmailConfig(req, res) {
  const { providerName, apiKey, defaultFromEmail = '', defaultFromName = '' } = req.body;

  if (!VALID_PROVIDERS.includes(providerName)) {
    return res.status(400).json({ error: `providerName must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  if (!process.env.EMAIL_CONFIG_SECRET) {
    return res.status(500).json({ error: 'EMAIL_CONFIG_SECRET is not configured on the server' });
  }

  // If a new API key is provided, encrypt it; otherwise keep the existing one
  let apiKeyEncrypted;
  if (apiKey && apiKey.trim()) {
    apiKeyEncrypted = encrypt(apiKey.trim());
  } else {
    // No new key provided — must already have a saved config
    const existing = await prisma.emailProviderConfig.findFirst({ where: { providerName } });
    if (!existing) {
      return res.status(400).json({ error: 'apiKey is required for a new configuration' });
    }
    apiKeyEncrypted = existing.apiKeyEncrypted;
  }

  const saved = await prisma.emailProviderConfig.upsert({
    where:  { providerName },
    create: { providerName, apiKeyEncrypted, defaultFromEmail, defaultFromName, isActive: false },
    update: { apiKeyEncrypted, defaultFromEmail, defaultFromName },
  });

  res.json({ config: formatConfig(saved) });
}

// POST /api/email-config/activate  { id }
export async function activateEmailConfig(req, res) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const target = await prisma.emailProviderConfig.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Config not found' });

  await prisma.$transaction([
    prisma.emailProviderConfig.updateMany({ data: { isActive: false } }),
    prisma.emailProviderConfig.update({ where: { id }, data: { isActive: true } }),
  ]);

  const updated = await prisma.emailProviderConfig.findUnique({ where: { id } });
  res.json({ config: formatConfig(updated) });
}

// POST /api/email-config/test  { providerName, apiKey, smtpHost?, smtpPort?, smtpUser?, smtpPass?, fromEmail?, fromName? }
export async function testEmailConfig(req, res) {
  const {
    providerName,
    apiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
  } = req.body;

  if (!VALID_PROVIDERS.includes(providerName)) {
    return res.status(400).json({ error: `providerName must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  // Resolve the API key — use provided value, or fall back to decrypting the saved config
  let resolvedApiKey = apiKey?.trim();
  if (!resolvedApiKey) {
    const existing = await prisma.emailProviderConfig.findFirst({ where: { providerName } });
    if (existing && process.env.EMAIL_CONFIG_SECRET) {
      try {
        resolvedApiKey = decrypt(existing.apiKeyEncrypted);
      } catch {
        return res.json({ status: 'error', message: 'Saved API key could not be decrypted' });
      }
    }
  }

  try {
    let provider;
    if (providerName === 'resend') {
      provider = new ResendProvider({
        apiKey:    resolvedApiKey,
        fromEmail: fromEmail || process.env.RESEND_FROM_EMAIL,
        fromName:  fromName  || process.env.RESEND_FROM_NAME,
      });
    } else {
      provider = new BrevoProvider({
        smtpHost:  smtpHost  || process.env.BREVO_MAIL_HOST,
        smtpPort:  smtpPort  || process.env.BREVO_MAIL_PORT,
        smtpUser:  smtpUser  || process.env.BREVO_MAIL_EMAIL,
        smtpPass:  smtpPass  || process.env.BREVO_MAIL_PASS,
        fromEmail: fromEmail || process.env.BREVO_FROM_EMAIL,
        fromName:  fromName  || process.env.BREVO_FROM_NAME,
      });
    }

    await provider.testConnection();
    res.json({ status: 'connected' });
  } catch (err) {
    const msg = err.message || '';
    const isAuthError =
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('authentication') ||
      msg.includes('credential') ||
      msg.includes('Invalid API Key') ||
      msg.includes('535') || // SMTP auth failed
      msg.includes('authentication credentials');

    res.json({
      status:  isAuthError ? 'invalid_credentials' : 'error',
      message: msg,
    });
  }
}
