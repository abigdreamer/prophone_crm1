/**
 * SETUP CHECKLIST — fill these in server/.env before this feature works:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx          (from resend.com → API Keys)
 *   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxx  (from resend.com → Webhooks → signing secret)
 *
 * In Resend dashboard → Webhooks → Add endpoint:
 *   URL:    https://api.prophone.biz/webhooks/resend
 *   Events: domain.verified, domain.failed,
 *           email.delivered, email.opened, email.clicked,
 *           email.bounced, email.complained
 */

import crypto from 'crypto';
import { Resend } from 'resend';
import prisma from '../lib/prisma.js';
import { applyEmailEvent } from '../repositories/campaignRepository.js';
import * as domainRepo from '../repositories/domainRepository.js';
import { logActivity } from '../lib/activityLogger.js';
import { ENTITY_TYPE, ACTION } from '../constants/index.js';

// ── Resend SDK helpers ────────────────────────────────────────────────────────

function getResendClient() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured on the server');
  return new Resend(process.env.RESEND_API_KEY);
}

function mapStatus(resendStatus) {
  switch (resendStatus) {
    case 'verified':          return 'verified';
    case 'failed':
    case 'temporary_failure': return 'failed';
    default:                  return 'pending';
  }
}

// Find a domain by name in the Resend account (used when domain already exists)
async function findInResendByName(resend, name) {
  try {
    const { data } = await resend.domains.list();
    return (data?.data ?? data ?? []).find(d => d.name === name) ?? null;
  } catch {
    return null;
  }
}

// Map Resend records array → spf / dkim / dmarc JSON strings
function extractRecords(records = []) {
  const spf  = records.find(r => r.record === 'SPF')           || records[0] || null;
  const dkim = records.find(r => r.record === 'DKIM')          || records[1] || null;
  const ret  = records.find(r => r.record === 'Return-Path')   || records[2] || null;
  const dmarc = {
    record: 'DMARC', type: 'TXT', name: '_dmarc',
    value: 'v=DMARC1; p=none;', ttl: 'Auto',
    note: 'Recommended — add manually to your DNS provider',
  };
  return {
    spfRecord:   JSON.stringify(spf  || {}),
    dkimRecord:  JSON.stringify(dkim || {}),
    dmarcRecord: JSON.stringify(ret  ? { ...ret, record: 'Return-Path' } : dmarc),
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

async function listDomains(req, res) {
  const { clientId } = req.query;
  const domains = await prisma.domain.findMany({
    where:   clientId ? { clientId } : {},
    orderBy: { createdAt: 'desc' },
  });
  res.json(domains);
}

async function addDomain(req, res) {
  const { name, clientId } = req.body;
  if (!name) return res.status(400).json({ error: 'Domain name is required' });

  const cleanName = name.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  const resend = getResendClient();
  let resendId, resendStatus, records;

  // Try to create the domain in Resend
  const { data: created, error } = await resend.domains.create({ name: cleanName });

  if (created && !error) {
    // Newly created — fetch full details to get DNS records
    const { data: full } = await resend.domains.get(created.id).catch(() => ({ data: null }));
    resendId     = created.id;
    resendStatus = mapStatus(full?.status ?? created.status);
    records      = full?.records ?? created.records ?? [];
  } else if (error) {
    // Domain already registered in Resend — find it and pull records
    const existing = await findInResendByName(resend, cleanName);
    if (!existing) {
      return res.status(error.statusCode || 422).json({ error: error.message || 'Failed to register domain with Resend' });
    }

    const { data: full } = await resend.domains.get(existing.id).catch(() => ({ data: null }));
    resendId     = existing.id;
    resendStatus = mapStatus(full?.status ?? existing.status);
    records      = full?.records ?? [];
  } else {
    return res.status(502).json({ error: 'Unexpected response from Resend' });
  }

  const { spfRecord, dkimRecord, dmarcRecord } = extractRecords(records);

  const domain = await prisma.domain.upsert({
    where:  { domainName: cleanName },
    update: { clientId: clientId || null, resendDomainId: resendId, status: resendStatus, spfRecord, dkimRecord, dmarcRecord },
    create: { clientId: clientId || null, domainName: cleanName, resendDomainId: resendId, status: resendStatus, spfRecord, dkimRecord, dmarcRecord },
  });

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, domain.id, ACTION.CREATE, `Domain added: ${domain.domainName}`, by);

  res.status(201).json(domain);
}

async function deleteDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  // Best-effort remove from Resend
  if (domain.resendDomainId && process.env.RESEND_API_KEY) {
    const resend = getResendClient();
    const existing = domain.resendDomainId || await findInResendByName(resend, domain.domainName).then(d => d?.id);
    if (existing) await resend.domains.remove(existing).catch(() => {});
  }

  await prisma.domain.delete({ where: { id } });
  res.json({ success: true });
}

// POST /webhooks/resend — raw Buffer body (express.raw middleware)
async function handleWebhook(req, res) {
  const rawBody = req.body;
  const secret  = process.env.RESEND_WEBHOOK_SECRET;

  if (secret) {
    const msgId        = req.headers['svix-id'];
    const msgTimestamp = req.headers['svix-timestamp'];
    const msgSignature = req.headers['svix-signature'];

    if (!msgId || !msgTimestamp || !msgSignature) {
      return res.status(400).json({ error: 'Missing webhook signature headers' });
    }
    if (Math.abs(Date.now() / 1000 - parseInt(msgTimestamp, 10)) > 300) {
      return res.status(400).json({ error: 'Webhook timestamp too old' });
    }

    const toSign   = `${msgId}.${msgTimestamp}.${rawBody.toString()}`;
    const keyBytes = Buffer.from(secret.replace('whsec_', ''), 'base64');
    const computed = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');
    const sigs     = msgSignature.split(' ').map(s => s.replace(/^v\d+,/, ''));

    if (!sigs.includes(computed)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  let event;
  try { event = JSON.parse(rawBody.toString()); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  console.log(`[webhook] Received event: ${event.type}`, JSON.stringify({
    email_id: event?.data?.email_id,
    domain_id: event?.data?.id,
    to: event?.data?.to,
    subject: event?.data?.subject,
  }));

  const resendDomainId = event?.data?.id;

  // Domain lifecycle events
  if (event.type === 'domain.verified' && resendDomainId) {
    await prisma.domain.updateMany({ where: { resendDomainId }, data: { status: 'verified' } }).catch(() => {});
  } else if (event.type === 'domain.failed' && resendDomainId) {
    await prisma.domain.updateMany({ where: { resendDomainId }, data: { status: 'failed' } }).catch(() => {});
  }

  // Campaign email delivery events — keyed by the Resend message ID we stored on send
  const EMAIL_EVENT_MAP = {
    'email.delivered':  'delivered',
    'email.opened':     'opened',
    'email.clicked':    'clicked',
    'email.bounced':    'bounced',
    'email.complained': 'complained',
  };
  const emailEventType = EMAIL_EVENT_MAP[event.type];
  const emailId = event?.data?.email_id;
  if (emailEventType && emailId) {
    console.log(`[webhook] Processing ${emailEventType} for email_id=${emailId}`);
    await applyEmailEvent(emailId, emailEventType).catch(e =>
      console.error('[webhook] email event error:', e.message),
    );
  }

  res.json({ received: true });
}

async function verifyDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  if (!domain.resendDomainId) return res.status(400).json({ error: 'No Resend domain ID' });

  const resend = getResendClient();
  const { data: full } = await resend.domains.get(domain.resendDomainId).catch(() => ({ data: null }));
  if (!full) return res.status(502).json({ error: 'Could not reach Resend' });

  const status = mapStatus(full.status);
  const { spfRecord, dkimRecord, dmarcRecord } = extractRecords(full.records ?? []);

  const updated = await prisma.domain.update({
    where: { id },
    data: { status, spfRecord, dkimRecord, dmarcRecord },
  });

  res.json(updated);
}

async function updateDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  const { defaultFromEmail } = req.body;
  const updated = await prisma.domain.update({
    where: { id },
    data: { defaultFromEmail: defaultFromEmail ?? domain.defaultFromEmail },
  });

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, id, ACTION.UPDATE, `Domain updated: ${domain.domainName}`, by);

  res.json(updated);
}

async function cancelDomain(req, res) {
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

async function restoreDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });
  if (!domain.isCanceled) return res.status(400).json({ error: 'Domain is not canceled' });

  const updated = await domainRepo.restoreDomain(id);

  const by = req.user?.name || req.user?.email || 'system';
  logActivity(ENTITY_TYPE.DOMAIN, id, ACTION.RESTORE, 'Domain restored', by);

  res.json(updated);
}

export { listDomains, addDomain, deleteDomain, handleWebhook, verifyDomain, updateDomain, cancelDomain, restoreDomain };
