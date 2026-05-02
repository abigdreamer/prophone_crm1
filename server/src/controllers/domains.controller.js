/**
 * SETUP CHECKLIST — fill these in server/.env before this feature works:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx          (from resend.com → API Keys)
 *   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxx  (from resend.com → Webhooks → signing secret)
 *
 * In Resend dashboard → Webhooks → Add endpoint:
 *   URL:    https://api.prophone.biz/webhooks/resend
 *   Events: domain.verified, domain.failed
 *
 * Requires Node.js 18+ for built-in fetch.
 */

const crypto = require('crypto');
const axios   = require('axios');
const prisma  = require('../lib/prisma');

const RESEND_API = 'https://api.resend.com';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resendHeaders() {
  return {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type':  'application/json',
  };
}

// Axios instance for Resend — uses Node https module (avoids undici IPv6 issues)
const resend = axios.create({ baseURL: RESEND_API, timeout: 15000 });

// Map Resend records array → spf / dkim / dmarc JSON strings
function extractRecords(records = []) {
  const spf  = records.find(r => r.record === 'SPF')          || records[0] || null;
  const dkim = records.find(r => r.record === 'DKIM')         || records[1] || null;
  const ret  = records.find(r => r.record === 'Return-Path')  || records[2] || null;

  // DMARC is not provided by Resend — suggest a standard record
  const dmarc = {
    record: 'DMARC',
    type:   'TXT',
    name:   '_dmarc',
    value:  'v=DMARC1; p=none;',
    ttl:    'Auto',
    note:   'Recommended — add manually to your DNS provider',
  };

  return {
    spfRecord:   JSON.stringify(spf  || {}),
    dkimRecord:  JSON.stringify(dkim || {}),
    dmarcRecord: JSON.stringify(ret  ? { ...ret, record: 'Return-Path' } : dmarc),
  };
}

// Verify Resend/Svix webhook signature using built-in crypto
function verifySignature(rawBody, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if secret not configured

  const msgId        = headers['svix-id'];
  const msgTimestamp = headers['svix-timestamp'];
  const msgSignature = headers['svix-signature'];
  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject timestamps older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(msgTimestamp, 10)) > 300) return false;

  const toSign    = `${msgId}.${msgTimestamp}.${rawBody.toString()}`;
  const keyBytes  = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const computed  = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

  // svix-signature may contain multiple space-separated sigs like "v1,<base64>"
  const sigs = msgSignature.split(' ').map(s => s.replace(/^v\d+,/, ''));
  return sigs.some(s => s === computed);
}

// ── Controllers ───────────────────────────────────────────────────────────────

async function listDomains(req, res) {
  const domains = await prisma.domain.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(domains);
}

async function addDomain(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Domain name is required' });

  const cleanName = name.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'RESEND_API_KEY is not configured on the server' });
  }

  // Add domain in Resend — if already registered there, fetch the existing record
  let resendData;
  try {
    const { data } = await resend.post('/domains', { name: cleanName }, { headers: resendHeaders() });
    resendData = data;
  } catch (err) {
    const isAlreadyRegistered =
      err.response?.status === 422 &&
      (err.response?.data?.message || '').toLowerCase().includes('registered already');

    if (isAlreadyRegistered) {
      // Domain exists in Resend — find it and pull its records into our DB
      const { data: list } = await resend.get('/domains', { headers: resendHeaders() });
      const match = (list.data || list).find(d => d.name === cleanName);
      if (!match) {
        return res.status(422).json({ error: `${cleanName} is already registered in Resend but could not be retrieved. Remove it from Resend first.` });
      }
      const { data: full } = await resend.get(`/domains/${match.id}`, { headers: resendHeaders() });
      resendData = full;
    } else {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add domain in Resend';
      return res.status(err.response?.status || 502).json({ error: msg });
    }
  }

  const { spfRecord, dkimRecord, dmarcRecord } = extractRecords(resendData.records);

  const resendStatus = resendData.status === 'verified' ? 'verified' : resendData.status === 'failed' ? 'failed' : 'pending';

  const domain = await prisma.domain.upsert({
    where:  { domainName: cleanName },
    update: { resendDomainId: resendData.id, status: resendStatus, spfRecord, dkimRecord, dmarcRecord },
    create: { domainName: cleanName, resendDomainId: resendData.id, status: resendStatus, spfRecord, dkimRecord, dmarcRecord },
  });

  res.status(201).json(domain);
}

async function deleteDomain(req, res) {
  const { id } = req.params;
  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) return res.status(404).json({ error: 'Domain not found' });

  // Best-effort: remove from Resend (don't fail if Resend errors)
  if (domain.resendDomainId && process.env.RESEND_API_KEY) {
    await resend.delete(`/domains/${domain.resendDomainId}`, { headers: resendHeaders() }).catch(() => {});
  }

  await prisma.domain.delete({ where: { id } });
  res.json({ success: true });
}

// POST /webhooks/resend — receives raw Buffer body (express.raw middleware)
async function handleWebhook(req, res) {
  const rawBody = req.body; // Buffer

  if (!verifySignature(rawBody, req.headers)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try { event = JSON.parse(rawBody.toString()); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const resendDomainId = event?.data?.id;

  if (event.type === 'domain.verified' && resendDomainId) {
    await prisma.domain.updateMany({
      where: { resendDomainId },
      data:  { status: 'verified' },
    }).catch(() => {});
  } else if (event.type === 'domain.failed' && resendDomainId) {
    await prisma.domain.updateMany({
      where: { resendDomainId },
      data:  { status: 'failed' },
    }).catch(() => {});
  }

  res.json({ received: true });
}

module.exports = { listDomains, addDomain, deleteDomain, handleWebhook };
