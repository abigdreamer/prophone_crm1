import { Resend } from 'resend';
import { BaseEmailProvider } from './base.js';
import { EmailError } from '../EmailError.js';

export class ResendProvider extends BaseEmailProvider {
  constructor() {
    super();
    this._client = null;
  }

  get name() {
    return 'resend';
  }

  _getClient() {
    if (!this._client) {
      if (!process.env.RESEND_API_KEY) {
        throw new EmailError('RESEND_API_KEY is not set', { code: 'MISSING_CONFIG', provider: 'resend' });
      }
      this._client = new Resend(process.env.RESEND_API_KEY);
    }
    return this._client;
  }

  _buildFrom(from, fromName) {
    const email = from || process.env.RESEND_FROM_EMAIL;
    const name  = fromName || process.env.RESEND_FROM_NAME;
    if (!email) {
      throw new EmailError(
        'No sender email configured. Set RESEND_FROM_EMAIL or pass from in payload.',
        { code: 'MISSING_SENDER', provider: 'resend' },
      );
    }
    return name ? `${name} <${email}>` : email;
  }

  async sendEmail({ to, from, fromName, subject, html, text, replyTo, headers }) {
    const client = this._getClient();
    const payload = {
      from:    this._buildFrom(from, fromName),
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (text)    payload.text     = text;
    if (replyTo) payload.reply_to = replyTo;
    if (headers) payload.headers  = headers;

    const { data, error } = await client.emails.send(payload);

    if (error) {
      throw new EmailError(
        `Resend error: ${error.message || JSON.stringify(error)}`,
        { code: 'PROVIDER_ERROR', provider: 'resend', originalError: error },
      );
    }

    return { id: data.id, provider: 'resend' };
  }

  async sendBatch(payloads) {
    const client = this._getClient();

    const mapped = payloads.map(e => {
      const msg = {
        from:    this._buildFrom(e.from, e.fromName),
        to:      Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html:    e.html,
      };
      if (e.text)    msg.text     = e.text;
      if (e.replyTo) msg.reply_to = e.replyTo;
      if (e.headers) msg.headers  = e.headers;
      return msg;
    });

    const { data, error } = await client.batch.send(mapped);

    if (error) {
      throw new EmailError(
        `Resend batch error: ${error.message || JSON.stringify(error)}`,
        { code: 'PROVIDER_BATCH_ERROR', provider: 'resend', originalError: error },
      );
    }

    const results = Array.isArray(data) ? data : (data?.data ?? []);
    return results.map(r => ({ id: r.id, provider: 'resend' }));
  }

  async getEmailStatus(messageId) {
    if (!messageId) return null;
    try {
      const client = this._getClient();
      const { data, error } = await client.emails.get(messageId);
      if (error || !data) return null;
      return { status: data.last_event ?? data.status ?? null };
    } catch {
      return null;
    }
  }
}
