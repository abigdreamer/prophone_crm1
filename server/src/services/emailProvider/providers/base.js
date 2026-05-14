/**
 * Abstract base class for email provider adapters.
 *
 * All providers must implement sendEmail() and sendBatch().
 * getEmailStatus() is optional — return null if the provider does not support it.
 *
 * Normalized input payload:
 *   { to, from, fromName, subject, html, text?, replyTo?, headers? }
 *
 * Normalized output:
 *   { id: string, provider: string }
 *
 * Errors must be thrown as EmailError instances.
 */
export class BaseEmailProvider {
  get name() {
    throw new Error(`${this.constructor.name} must implement get name()`);
  }

  /**
   * Send a single email.
   * @param {{ to: string|string[], from: string, fromName?: string, subject: string, html: string, text?: string, replyTo?: string, headers?: object }} payload
   * @returns {Promise<{ id: string, provider: string }>}
   */
  async sendEmail(payload) {
    throw new Error(`${this.constructor.name} must implement sendEmail()`);
  }

  /**
   * Send a batch of emails.
   * @param {Array<{ to: string|string[], from: string, fromName?: string, subject: string, html: string, text?: string, replyTo?: string, headers?: object }>} payloads
   * @returns {Promise<Array<{ id: string, provider: string }>>}
   */
  async sendBatch(payloads) {
    throw new Error(`${this.constructor.name} must implement sendBatch()`);
  }

  /**
   * Get the delivery status of a sent email by provider message ID.
   * Return null if the provider does not support status checks.
   * @param {string} messageId
   * @returns {Promise<{ status: string }|null>}
   */
  async getEmailStatus(messageId) {
    return null;
  }
}
