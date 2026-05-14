import axios from 'axios';
import { BaseEmailProvider } from './base.js';
import { EmailError } from '../EmailError.js';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export class BrevoProvider extends BaseEmailProvider {
  constructor() {
    super();
    this._http = null;
  }

  get name() {
    return 'brevo';
  }

  _getHttp() {
    if (!this._http) {
      if (!process.env.BREVO_API_KEY) {
        throw new EmailError('BREVO_API_KEY is not set', { code: 'MISSING_CONFIG', provider: 'brevo' });
      }
      this._http = axios.create({
        baseURL: BREVO_API_BASE,
        headers: {
          'api-key':      process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
      });
    }
    return this._http;
  }

  _buildSender(from, fromName) {
    const email = from || process.env.BREVO_FROM_EMAIL;
    const name  = fromName || process.env.BREVO_FROM_NAME;
    if (!email) {
      throw new EmailError(
        'No sender email configured. Set BREVO_FROM_EMAIL or pass from in payload.',
        { code: 'MISSING_SENDER', provider: 'brevo' },
      );
    }
    return name ? { email, name } : { email };
  }

  _buildPayload({ to, from, fromName, subject, html, text, replyTo, headers }) {
    const recipients = (Array.isArray(to) ? to : [to]).map(e =>
      typeof e === 'string' ? { email: e } : e,
    );

    const payload = {
      sender:      this._buildSender(from, fromName),
      to:          recipients,
      subject,
      htmlContent: html,
    };

    if (text)    payload.textContent = text;
    if (replyTo) payload.replyTo     = { email: replyTo };
    if (headers && Object.keys(headers).length) payload.headers = headers;

    return payload;
  }

  _normalizeError(err) {
    const status  = err.response?.status;
    const message = err.response?.data?.message ?? err.message ?? 'Brevo request failed';
    return new EmailError(`Brevo error (${status}): ${message}`, {
      code:          'PROVIDER_ERROR',
      provider:      'brevo',
      originalError: err,
    });
  }

  async sendEmail(emailPayload) {
    const http = this._getHttp();
    try {
      const { data } = await http.post('/smtp/email', this._buildPayload(emailPayload));
      return { id: data.messageId, provider: 'brevo' };
    } catch (err) {
      throw this._normalizeError(err);
    }
  }

  async sendBatch(payloads) {
    // Brevo has no true batch send endpoint for transactional email.
    // Send concurrently and preserve per-item results; partial failures surface as rejected entries.
    const results = await Promise.allSettled(payloads.map(p => this.sendEmail(p)));

    const normalized = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      // Re-throw if every item failed, otherwise return a sentinel so callers can detect partial failure.
      return { id: null, provider: 'brevo', error: r.reason?.message ?? 'Send failed' };
    });

    const allFailed = normalized.every(r => r.id === null);
    if (allFailed && payloads.length > 0) {
      throw new EmailError('All Brevo batch sends failed', {
        code:     'PROVIDER_BATCH_ERROR',
        provider: 'brevo',
      });
    }

    return normalized;
  }

  // Brevo does not expose a per-message status lookup API for transactional email.
  async getEmailStatus(_messageId) {
    return null;
  }
}
