import nodemailer from 'nodemailer';
import EmailProvider from './EmailProvider.js';

export default class BrevoProvider extends EmailProvider {
  constructor({
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
  } = {}) {
    super();
    this._fromEmail = fromEmail || '';
    this._fromName  = fromName  || '';
    this._transporter = nodemailer.createTransport({
      host: smtpHost || process.env.BREVO_MAIL_HOST || 'smtp-relay.brevo.com',
      port: parseInt(smtpPort || process.env.BREVO_MAIL_PORT || '587', 10),
      secure: false,
      auth: {
        user: smtpUser || process.env.BREVO_MAIL_EMAIL || '',
        pass: smtpPass || process.env.BREVO_MAIL_PASS  || '',
      },
    });
  }

  _buildFrom(fromEmail, fromName) {
    const email = fromEmail || this._fromEmail;
    const name  = fromName  || this._fromName;
    if (!email) throw new Error('No sender email configured');
    return name ? `"${name}" <${email}>` : email;
  }

  async sendSingle({ to, from, fromName, subject, html, text, replyTo, headers }) {
    const mail = {
      from:    this._buildFrom(from, fromName),
      to:      Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    };
    if (text)    mail.text       = text;
    if (replyTo) mail.replyTo    = replyTo;
    if (headers) mail.headers    = headers;

    const info = await this._transporter.sendMail(mail);
    // Return object matching Resend's { id } shape for compatibility
    return { id: info.messageId };
  }

  async sendBatch(emails) {
    // Brevo SMTP has no native batch endpoint; send sequentially
    const results = [];
    for (const e of emails) {
      const result = await this.sendSingle(e);
      results.push(result);
    }
    return results;
  }

  async testConnection() {
    await this._transporter.verify();
  }
}
