/**
 * DomainService — unified domain add/verify for Resend and Brevo.
 *
 * Returns a normalized DomainRecord:
 *   { providerDomainId, status, spfRecord, dkimRecord, dmarcRecord }
 *
 * status values: 'pending' | 'verified' | 'failed'
 */

import { Resend } from 'resend';
import axios      from 'axios';
import { getApiKey } from '../settings/SettingsService.js';

const BREVO_BASE = 'https://api.brevo.com/v3';

// ── Shared normalizer ─────────────────────────────────────────────────────────

function normalizeStatus(raw) {
  if (!raw) return 'pending';
  const s = raw.toLowerCase();
  if (s === 'verified' || s === 'authenticated') return 'verified';
  if (s === 'failed'   || s === 'error')         return 'failed';
  return 'pending';
}

// ── Resend ────────────────────────────────────────────────────────────────────

async function getResendClient() {
  const key = await getApiKey('resend');
  if (!key) throw new Error('Resend API key not configured');
  return new Resend(key);
}

function extractResendRecords(records = []) {
  const spf  = records.find(r => r.record === 'SPF')         || records[0] || null;
  const dkim = records.find(r => r.record === 'DKIM')        || records[1] || null;
  const ret  = records.find(r => r.record === 'Return-Path') || records[2] || null;
  const dmarc = {
    record: 'DMARC', type: 'TXT', name: '_dmarc',
    value:  'v=DMARC1; p=none;', ttl: 'Auto',
    note:   'Recommended — add manually to your DNS provider',
  };
  return {
    spfRecord:   JSON.stringify(spf  || {}),
    dkimRecord:  JSON.stringify(dkim || {}),
    dmarcRecord: JSON.stringify(ret  ? { ...ret, record: 'Return-Path' } : dmarc),
  };
}

async function findResendDomainByName(resend, name) {
  try {
    const { data } = await resend.domains.list();
    return (data?.data ?? data ?? []).find(d => d.name === name) ?? null;
  } catch { return null; }
}

export async function resendAddDomain(name) {
  const resend = await getResendClient();
  let id, status, records;

  const { data: created, error } = await resend.domains.create({ name });
  if (created && !error) {
    const { data: full } = await resend.domains.get(created.id).catch(() => ({ data: null }));
    id      = created.id;
    status  = normalizeStatus(full?.status ?? created.status);
    records = full?.records ?? created.records ?? [];
  } else if (error) {
    const existing = await findResendDomainByName(resend, name);
    if (!existing) throw new Error(error.message || 'Failed to register domain with Resend');
    const { data: full } = await resend.domains.get(existing.id).catch(() => ({ data: null }));
    id      = existing.id;
    status  = normalizeStatus(full?.status ?? existing.status);
    records = full?.records ?? [];
  } else {
    throw new Error('Unexpected response from Resend');
  }

  return { providerDomainId: id, status, ...extractResendRecords(records) };
}

export async function resendVerifyDomain(providerDomainId) {
  const resend = await getResendClient();
  const { data, error } = await resend.domains.get(providerDomainId);
  if (error || !data) throw new Error('Could not reach Resend to verify domain');
  return {
    providerDomainId,
    status: normalizeStatus(data.status),
    ...extractResendRecords(data.records ?? []),
  };
}

export async function resendDeleteDomain(providerDomainId) {
  if (!providerDomainId) return;
  const resend = await getResendClient();
  await resend.domains.remove(providerDomainId).catch(() => {});
}

// ── Brevo ─────────────────────────────────────────────────────────────────────

async function getBrevoHttp() {
  const key = await getApiKey('brevo');
  if (!key) throw new Error('Brevo API key not configured');
  return axios.create({
    baseURL: BREVO_BASE,
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
}

function extractBrevoRecords(domainData) {
  const dkim = domainData?.dkim;
  const spf  = domainData?.spf;

  const dkimRecord = dkim
    ? JSON.stringify({ record: 'DKIM', type: 'TXT', name: dkim.host || `brevo._domainkey.${domainData.domainName}`, value: dkim.value })
    : JSON.stringify({});

  const spfRecord = spf
    ? JSON.stringify({ record: 'SPF', type: 'TXT', name: '@', value: spf.value })
    : JSON.stringify({ record: 'SPF', type: 'TXT', name: '@', value: 'v=spf1 include:sendinblue.com ~all' });

  const dmarcRecord = JSON.stringify({
    record: 'DMARC', type: 'TXT', name: '_dmarc',
    value:  'v=DMARC1; p=none;', ttl: 'Auto',
    note:   'Recommended — add manually to your DNS provider',
  });

  return { spfRecord, dkimRecord, dmarcRecord };
}

function brevoNormalizeStatus(domainData) {
  if (domainData?.dkim?.status === 'success' || domainData?.authenticated === true) return 'verified';
  if (domainData?.dkim?.status === 'failed') return 'failed';
  return 'pending';
}

export async function brevoAddDomain(name) {
  const http = await getBrevoHttp();
  try {
    const { data } = await http.post('/senders/domains', { name });
    const status = brevoNormalizeStatus(data);
    return {
      providerDomainId: name, // Brevo uses domain name as identifier
      status,
      ...extractBrevoRecords({ ...data, domainName: name }),
    };
  } catch (err) {
    // Domain may already exist in Brevo — try to fetch it
    if (err.response?.status === 400 || err.response?.status === 409) {
      return brevoVerifyDomain(name);
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to register domain with Brevo');
  }
}

export async function brevoVerifyDomain(name) {
  const http = await getBrevoHttp();
  try {
    // Trigger re-authentication check
    await http.put(`/senders/domains/${encodeURIComponent(name)}/authenticate`).catch(() => {});
    // Fetch current status
    const { data: list } = await http.get('/senders/domains');
    const domains = list?.domains ?? list ?? [];
    const found   = domains.find(d => d.domain_name === name || d.domainName === name);
    const status  = brevoNormalizeStatus(found);
    return {
      providerDomainId: name,
      status,
      ...extractBrevoRecords({ ...found, domainName: name }),
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Could not verify domain with Brevo');
  }
}

export async function brevoDeleteDomain(_name) {
  // Brevo does not expose a delete-domain endpoint in the transactional API
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function addDomain(provider, name) {
  if (provider === 'brevo')  return brevoAddDomain(name);
  return resendAddDomain(name);
}

export async function verifyDomain(provider, providerDomainId) {
  if (provider === 'brevo')  return brevoVerifyDomain(providerDomainId);
  return resendVerifyDomain(providerDomainId);
}

export async function deleteDomain(provider, providerDomainId) {
  if (provider === 'brevo')  return brevoDeleteDomain(providerDomainId);
  return resendDeleteDomain(providerDomainId);
}
