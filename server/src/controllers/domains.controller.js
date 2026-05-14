import prisma        from '../lib/prisma.js';
import * as domainRepo from '../repositories/domainRepository.js';
import * as DomainService from '../services/domain/DomainService.js';
import { validateResendSignature, processResendEvent } from '../services/webhook/WebhookService.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION } from '../constants/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanDomainName(raw) {
  return (raw || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

// ── Controllers ───────────────────────────────────────────────────────────────

export async function listDomains(req, res) {
  const { clientId } = req.query;
  const domains = await prisma.domain.findMany({
    where:   clientId ? { clientId } : {},
    orderBy: { createdAt: 'desc' },
  });
  res.json(domains);
}

export async function addDomain(req, res) {
  const { name, clientId, provider = 'resend', senderName = '', senderPrefix = 'noreply' } = req.body;
  if (!name) return res.status(400).json({ error: 'Domain name is required' });

  const domainName = cleanDomainName(name);

  let providerResult;
  try {
    providerResult = await DomainService.addDomain(provider, domainName);
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  const domain = await prisma.domain.upsert({
    where:  { domainName },
    update: {
      clientId:         clientId || null,
      provider,
      providerDomainId: providerResult.providerDomainId,
      resendDomainId:   provider === 'resend' ? providerResult.providerDomainId : '',
      status:           providerResult.status,
      senderName:       senderName || '',
      senderPrefix:     senderPrefix || 'noreply',
      spfRecord:        providerResult.spfRecord,
      dkimRecord:       providerResult.dkimRecord,
      dmarcRecord:      providerResult.dmarcRecord,
    },
    create: {
      clientId:         clientId || null,
      domainName,
      provider,
      providerDomainId: providerResult.providerDomainId,
      resendDomainId:   provider === 'resend' ? providerResult.providerDomainId : '',
      status:           providerResult.status,
      senderName:       senderName || '',
      senderPrefix:     senderPrefix || 'noreply',
      spfRecord:        providerResult.spfRecord,
      dkimRecord:       providerResult.dkimRecord,
      dmarcRecord:      providerResult.dmarcRecord,
    },
  });

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, domain.id, ACTION.CREATE, `Domain added via ${provider}: ${domain.domainName}`, by);

  res.status(201).json(domain);
}

export async function deleteDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  await DomainService.deleteDomain(domain.provider, domain.providerDomainId || domain.resendDomainId).catch(() => {});
  await prisma.domain.delete({ where: { id } });
  res.json({ success: true });
}

export async function verifyDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const providerDomainId = domain.providerDomainId || domain.resendDomainId;
  if (!providerDomainId) return res.status(400).json({ error: 'No provider domain ID found' });

  let result;
  try {
    result = await DomainService.verifyDomain(domain.provider, providerDomainId);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  const updated = await prisma.domain.update({
    where: { id },
    data:  {
      status:      result.status,
      spfRecord:   result.spfRecord,
      dkimRecord:  result.dkimRecord,
      dmarcRecord: result.dmarcRecord,
    },
  });

  res.json(updated);
}

export async function updateDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const { defaultFromEmail, senderName, senderPrefix } = req.body;
  const data = {};
  if (defaultFromEmail !== undefined) data.defaultFromEmail = defaultFromEmail;
  if (senderName       !== undefined) data.senderName       = senderName;
  if (senderPrefix     !== undefined) data.senderPrefix     = senderPrefix;

  const updated = await prisma.domain.update({ where: { id }, data });

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, id, ACTION.UPDATE, `Domain updated: ${domain.domainName}`, by);

  res.json(updated);
}

export async function cancelDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  if (domain.isCanceled) return res.status(400).json({ error: 'Domain is already canceled' });

  const cancelReason = (req.body?.cancelReason || '').trim();
  const updated = await domainRepo.cancelDomain(id, cancelReason);

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, id, ACTION.CANCEL, cancelReason || 'Domain canceled', by);

  res.json(updated);
}

export async function restoreDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  if (!domain.isCanceled) return res.status(400).json({ error: 'Domain is not canceled' });

  const updated = await domainRepo.restoreDomain(id);

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, id, ACTION.RESTORE, 'Domain restored', by);

  res.json(updated);
}

// ── Resend webhook ────────────────────────────────────────────────────────────

export async function handleWebhook(req, res) {
  const rawBody = req.body;

  const valid = await validateResendSignature(rawBody, req.headers);
  if (!valid) return res.status(401).json({ error: 'Invalid webhook signature' });

  let event;
  try { event = JSON.parse(rawBody.toString()); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  await processResendEvent(event).catch(e =>
    console.error('[webhook/resend] processing error:', e.message),
  );

  res.json({ received: true });
}
