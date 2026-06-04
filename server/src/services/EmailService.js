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
