import { Resend } from 'resend';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(process.env.RESEND_API_KEY);
}

function mapResendStatus(resendStatus) {
  switch (resendStatus) {
    case 'verified':          return 'verified';
    case 'failed':
    case 'temporary_failure': return 'failed';
    case 'pending':           return 'verifying';
    default:                  return 'pending';
  }
}

async function findResendDomainByName(resend, domainName) {
  try {
    const { data } = await resend.domains.list();
    return data?.data?.find(d => d.name === domainName) ?? null;
  } catch {
    return null;
  }
}

/**
 * Register a new domain on Resend, falling back to a lookup if it already exists.
 * Returns { id, region, status, dns_records }.
 */
export async function registerDomain(domainName) {
  const key = process.env.RESEND_API_KEY;
  console.log(`[Resend] registerDomain → name="${domainName}" key=${key ? key.slice(0, 8) + '…' : 'MISSING'}`);

  const resend = getResendClient();

  let data, error;
  try {
    ({ data, error } = await resend.domains.create({ name: domainName }));
  } catch (networkErr) {
    console.error('[Resend] domains.create() threw (network/SDK error):', networkErr);
    throw new Error(`Resend network error: ${networkErr.message}`);
  }

  console.log('[Resend] domains.create() response →', JSON.stringify({ data, error }, null, 2));

  if (data && !error) {
    const { data: full } = await resend.domains.get(data.id).catch(e => {
      console.warn('[Resend] domains.get() after create failed:', e.message);
      return { data: null };
    });
    return {
      id:          data.id,
      region:      data.region  ?? 'us-east-1',
      status:      mapResendStatus(full?.status ?? data.status),
      dns_records: full?.records ?? data.records ?? null,
    };
  }

  // statusCode: null means the SDK never got an HTTP response — pure network failure.
  // No point attempting the list fallback; it will fail the same way.
  if (error && !error.statusCode) {
    console.error('[Resend] Network connectivity failure — server cannot reach api.resend.com.');
    throw new Error(
      'Cannot reach Resend API. Ensure the server has outbound internet access to api.resend.com on port 443.'
    );
  }

  console.warn(`[Resend] domains.create() returned error — attempting name lookup for "${domainName}"`);
  console.warn('[Resend] error details:', JSON.stringify(error));

  const found = await findResendDomainByName(resend, domainName);
  if (found) {
    console.log(`[Resend] domain already exists in Resend (id=${found.id}), using existing record`);
    const { data: full } = await resend.domains.get(found.id).catch(() => ({ data: null }));
    return {
      id:          found.id,
      region:      found.region ?? 'us-east-1',
      status:      mapResendStatus(full?.status ?? found.status),
      dns_records: full?.records ?? null,
    };
  }

  const msg = error?.message || 'Failed to register domain with Resend';
  console.error(`[Resend] registerDomain failed — no fallback found. Final error: ${msg}`);
  throw new Error(msg);
}

/**
 * Trigger a DNS verification check for a domain already registered on Resend.
 * Auto-recovers if resend_domain_id is missing.
 *
 * Returns { resend_domain_id, status, dns_records, recovered? }.
 * `recovered` is set when a missing resend_domain_id was resolved so the caller
 * can persist the corrected ID and dns_records before writing back status.
 */
export async function checkDomainVerification(resendDomainId, fallbackDomainName) {
  const resend = getResendClient();
  let currentId = resendDomainId;
  let recovered  = null;

  if (!currentId) {
    const found = await findResendDomainByName(resend, fallbackDomainName);
    if (found) {
      currentId = found.id;
    } else {
      const { data: created, error: createErr } = await resend.domains.create({ name: fallbackDomainName });
      if (!created || createErr) {
        throw new Error(`Could not register domain with Resend: ${createErr?.message || 'unknown error'}`);
      }
      currentId = created.id;
    }
    const { data: full } = await resend.domains.get(currentId).catch(() => ({ data: null }));
    recovered = { id: currentId, dns_records: full?.records ?? null, region: full?.region ?? null };
  }

  // Check current status first — if already verified, skip re-triggering verify()
  // (calling verify() on an already-verified domain can temporarily reset its status)
  const { data: current } = await resend.domains.get(currentId).catch(() => ({ data: null }));
  if (!current || current.status !== 'verified') {
    await resend.domains.verify(currentId).catch(() => {});
  }

  const { data, error } = await resend.domains.get(currentId);
  if (error) throw new Error(error.message || 'Failed to fetch domain status from Resend');

  return {
    resend_domain_id: currentId,
    status:           mapResendStatus(data.status),
    dns_records:      data.records ?? null,
    recovered,
  };
}

/**
 * Update open/click tracking and TLS settings for a domain on Resend.
 * Throws if the Resend call fails.
 */
export async function updateDomainTracking(resendDomainId, { openTracking, clickTracking, tls, trackingSubdomain } = {}) {
  const resend = getResendClient();
  const payload = { id: resendDomainId };
  if (openTracking      !== undefined) payload.openTracking      = openTracking;
  if (clickTracking     !== undefined) payload.clickTracking     = clickTracking;
  if (tls               !== undefined) payload.tls               = tls;
  if (trackingSubdomain !== undefined) payload.trackingSubdomain = trackingSubdomain;

  const { error } = await resend.domains.update(payload);
  if (error) throw new Error(error.message || 'Failed to update domain tracking on Resend');
}

/**
 * Configure a custom tracking subdomain on Resend (e.g. "links" → links.yourdomain.com).
 * Also sets click/open tracking flags in the same call.
 * Returns updated dns_records (including the new Tracking CNAME) and the resolved subdomain.
 */
export async function configureTrackingSubdomain(resendDomainId, { subdomain, clickTracking, openTracking }) {
  const resend = getResendClient();

  const { error } = await resend.domains.update({
    id:               resendDomainId,
    trackingSubdomain: subdomain || null,
    clickTracking,
    openTracking,
  });
  if (error) throw new Error(error.message || 'Failed to configure tracking subdomain on Resend');

  // Fetch the updated domain to get the new Tracking CNAME record
  const { data: full } = await resend.domains.get(resendDomainId).catch(() => ({ data: null }));
  return {
    dns_records:       full?.records     ?? null,
    tracking_subdomain: full?.tracking_subdomain ?? subdomain,
    open_tracking:     full?.open_tracking  ?? openTracking,
    click_tracking:    full?.click_tracking ?? clickTracking,
  };
}

/**
 * Remove a domain from Resend. Falls back to name-lookup if no ID is known.
 * Logs a warning on failure instead of throwing (deletion should not block the caller).
 */
export async function removeDomain(resendDomainId, domainName) {
  try {
    const resend = getResendClient();
    let id = resendDomainId;
    if (!id) {
      const found = await findResendDomainByName(resend, domainName);
      if (found) id = found.id;
    }
    if (id) await resend.domains.remove(id);
  } catch (e) {
    console.warn('[domainService] Resend domain remove warning (continuing):', e.message);
  }
}
