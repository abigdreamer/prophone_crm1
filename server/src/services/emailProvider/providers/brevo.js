import axios   from 'axios';
import { BaseEmailProvider } from './base.js';
import { EmailError }        from '../EmailError.js';
import { getApiKey }         from '../../settings/SettingsService.js';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export class BrevoProvider extends BaseEmailProvider {
  get name() { return 'brevo'; }

  async _getHttp() {
    const key = await getApiKey('brevo');
    if (!key) {
      throw new EmailError('Brevo API key not configured. Add it in Settings → Email or set BREVO_API_KEY.', {
        code: 'MISSING_CONFIG', provider: 'brevo',
      });
    }
    return axios.create({
      baseURL: BREVO_API_BASE,
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  _buildSender(from, fromName) {
    const email = from || process.env.BREVO_FROM_EMAIL;
    const name  = fromName || process.env.BREVO_FROM_NAME;
    if (!email) {
      throw new EmailError(
        'No sender email. Configure a verified domain with a senderPrefix or set BREVO_FROM_EMAIL.',
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
      code: 'PROVIDER_ERROR', provider: 'brevo', originalError: err,
    });
  }

  async sendEmail(emailPayload) {
    const http = await this._getHttp();
    try {
      const { data } = await http.post('/smtp/email', this._buildPayload(emailPayload));
      return { id: data.messageId, provider: 'brevo' };
    } catch (err) {
      throw this._normalizeError(err);
    }
  }

  async sendBatch(payloads) {
    const results = await Promise.allSettled(payloads.map(p => this.sendEmail(p)));
    const normalized = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { id: null, provider: 'brevo', error: r.reason?.message ?? 'Send failed' },
    );
    if (normalized.every(r => r.id === null) && payloads.length > 0) {
      throw new EmailError('All Brevo batch sends failed', { code: 'PROVIDER_BATCH_ERROR', provider: 'brevo' });
    }
    return normalized;
  }

  async getEmailStatus(_messageId) {
    return null; // Brevo has no per-message status lookup for transactional email
  }
}
