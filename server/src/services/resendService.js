import { Resend } from 'resend';

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment');
    }
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

function buildFrom(fromEmail, fromName) {
  const email = fromEmail || process.env.RESEND_FROM_EMAIL;
  const name  = fromName  || process.env.RESEND_FROM_NAME;
  if (!email) throw new Error('No sender email configured. Set RESEND_FROM_EMAIL or pass from_email.');
  return name ? `${name} <${email}>` : email;
}

/**
 * Send a single email via Resend.
 * Returns { id } on success, throws on failure.
 */
export async function sendSingleEmail({ to, from, fromName, subject, html, text, headers, reply_to }) {
  const client = getClient();
  const payload = {
    from: buildFrom(from, fromName),
    to:   Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text)     payload.text     = text;
  if (headers)  payload.headers  = headers;
  if (reply_to) payload.reply_to = reply_to;

  const { data, error } = await client.emails.send(payload);

  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
  }
  return data; // { id }
}

/**
 * Send a batch of emails via Resend (up to 100 per call).
 * emails: [{ to, from, fromName, subject, html }]
 * Returns array of { id } in same order as input.
 * Throws if the batch API call itself fails.
 */
export async function sendBatchEmails(emails) {
  const client = getClient();

  const payload = emails.map(e => {
    const item = {
      from:    buildFrom(e.from, e.fromName),
      to:      Array.isArray(e.to) ? e.to : [e.to],
      subject: e.subject,
      html:    e.html,
    };
    if (e.text)     item.text     = e.text;
    if (e.headers)  item.headers  = e.headers;
    if (e.reply_to) item.reply_to = e.reply_to;
    return item;
  });

  const { data, error } = await client.batch.send(payload);

  if (error) {
    throw new Error(`Resend batch error: ${error.message || JSON.stringify(error)}`);
  }

  // SDK wraps response: data = { data: [{ id }, ...] } or data = [{ id }, ...]
  const results = Array.isArray(data) ? data : (data?.data ?? []);
  return results;
}

/**
 * Fetch the current status of a single sent email from Resend.
 * Returns { status } where status is the Resend last_event string,
 * or null if the email is not found / error.
 */
export async function getEmailStatus(messageId) {
  if (!messageId) return null;
  try {
    const client = getClient();
    const { data, error } = await client.emails.get(messageId);
    if (error || !data) return null;
    return { status: data.last_event ?? data.status ?? null };
  } catch {
    return null;
  }
}
