/**
 * Legacy email-sending facade — delegates to the configurable email provider system.
 * The active provider is determined by EMAIL_PROVIDER env var (default: resend).
 *
 * Domain-management operations (addDomain, verifyDomain, handleWebhook) remain in
 * domains.controller.js and use the Resend SDK directly, as those APIs are
 * Resend-specific and cannot be abstracted.
 */

import {
  sendEmail    as providerSendEmail,
  sendBatch    as providerSendBatch,
  getEmailStatus as providerGetStatus,
} from './emailProvider/index.js';

export async function sendSingleEmail(payload) {
  return providerSendEmail(payload);
}

export async function sendBatchEmails(emails) {
  return providerSendBatch(emails);
}

export async function getEmailStatus(messageId) {
  return providerGetStatus(messageId);
}
