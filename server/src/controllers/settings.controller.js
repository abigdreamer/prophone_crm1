import prisma from '../lib/prisma.js';
import {
  applyRuntimeConfig,
  getRuntimeConfig,
  SUPPORTED_PROVIDERS,
} from '../services/emailProvider/index.js';

const EMAIL_PROVIDER_MODULE = 'email_provider';

// GET /api/settings?clientId=X&module=Y
export async function getSettings(req, res) {
  const { module } = req.query;
  const clientId = req.query.clientId || null;

  if (!module) return res.status(400).json({ error: 'module is required' });

  const record = await prisma.tenantSettings.findUnique({
    where: { clientId_module: { clientId, module } },
  });

  res.json({ clientId, module, config: record?.config ?? {} });
}

// PUT /api/settings
export async function saveSettings(req, res) {
  const { module, config } = req.body;
  const clientId = req.body.clientId ?? null;

  if (!module) return res.status(400).json({ error: 'module is required' });
  if (config === undefined) return res.status(400).json({ error: 'config is required' });

  const record = await prisma.tenantSettings.upsert({
    where: { clientId_module: { clientId, module } },
    update: { config },
    create: { id: crypto.randomUUID(), clientId, module, config },
  });

  res.json({ clientId, module, config: record.config });
}

// GET /api/settings/email-provider
export async function getEmailProviderSettings(req, res) {
  const record = await prisma.systemSettings.findUnique({
    where: { module: EMAIL_PROVIDER_MODULE },
  });

  const dbConfig  = record?.config ?? {};
  const effective = getRuntimeConfig();

  res.json({
    effective,
    db:                 dbConfig,
    supportedProviders: SUPPORTED_PROVIDERS,
    envProvider:        process.env.EMAIL_PROVIDER ?? 'resend',
  });
}

// PUT /api/settings/email-provider
export async function saveEmailProviderSettings(req, res) {
  const { provider, fallbackEnabled, fallbackProvider } = req.body;

  if (provider && !SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({
      error: `Invalid provider "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
    });
  }

  if (fallbackProvider && !SUPPORTED_PROVIDERS.includes(fallbackProvider)) {
    return res.status(400).json({
      error: `Invalid fallbackProvider "${fallbackProvider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
    });
  }

  const config = {
    ...(provider         !== undefined && { provider }),
    ...(fallbackEnabled  !== undefined && { fallbackEnabled: Boolean(fallbackEnabled) }),
    ...(fallbackProvider !== undefined && { fallbackProvider }),
  };

  await prisma.systemSettings.upsert({
    where:  { module: EMAIL_PROVIDER_MODULE },
    update: { config },
    create: { module: EMAIL_PROVIDER_MODULE, config },
  });

  applyRuntimeConfig(config);
  console.log(`[email] provider config updated via settings: ${JSON.stringify(config)}`);

  res.json({ saved: config, effective: getRuntimeConfig() });
}

/**
 * Called once at server startup to load any previously saved provider config from the DB.
 */
export async function loadEmailProviderConfig() {
  try {
    const record = await prisma.systemSettings.findUnique({
      where: { module: EMAIL_PROVIDER_MODULE },
    });
    if (record?.config && Object.keys(record.config).length > 0) {
      applyRuntimeConfig(record.config);
      console.log(`[email] Loaded provider config from DB: ${JSON.stringify(record.config)}`);
    }
  } catch (err) {
    console.warn('[email] Could not load provider config from DB on startup:', err.message);
  }
}
