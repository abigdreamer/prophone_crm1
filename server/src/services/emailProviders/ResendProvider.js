import { Resend } from 'resend';
import EmailProvider from './EmailProvider.js';

export default class ResendProvider extends EmailProvider {
  constructor({ apiKey, fromEmail, fromName } = {}) {
    super();
    if (!apiKey) throw new Error('ResendProvider: apiKey is required (set RESEND_API_KEY or configure in Settings)');
    this._client = new Resend(apiKey);
    this._fromEmail = fromEmail || '';
    this._fromName  = fromName  || '';
  }

  _buildFrom(fromEmail, fromName) {
    const email = fromEmail || this._fromEmail;
    const name  = fromName  || this._fromName;
    if (!email) throw new Error('No sender email configured');
    return name ? `${name} <${email}>` : email;
  }

  async sendSingle({ to, from, fromName, subject, html, text, replyTo, headers }) {
    const payload = {
      from:    this._buildFrom(from, fromName),
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (text)    payload.text     = text;
    if (replyTo) payload.reply_to = replyTo;
    if (headers) payload.headers  = headers;

    const { data, error } = await this._client.emails.send(payload);
    if (error) throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
    return data;
  }

  async sendBatch(emails) {
    const payload = emails.map(e => {
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

    const { data, error } = await this._client.batch.send(payload);
    if (error) throw new Error(`Resend batch error: ${error.message || JSON.stringify(error)}`);
    const results = Array.isArray(data) ? data : (data?.data ?? []);
    return results;
  }

  async testConnection() {
    const { error } = await this._client.domains.list();
    if (error) throw new Error(`Resend connection failed: ${error.message || JSON.stringify(error)}`);
  }
}
