import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

// ── unsubscribe token ────────────────────────────────────────────────────────
export function generateUnsubToken(recipientId, secret) {
  return createHmac('sha256', secret)
    .update(String(recipientId))
    .digest('hex');
}

export function verifyUnsubToken(recipientId, token, secret) {
  if (!token || typeof token !== 'string') return false;

  const expected = generateUnsubToken(recipientId, secret);

  try {
    return timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export function buildUnsubUrl(baseUrl, recipientId, secret) {
  const tok = generateUnsubToken(recipientId, secret);
  return `${baseUrl}/api/email/unsubscribe?rid=${recipientId}&tok=${tok}`;
}

// ── html → text ───────────────────────────────────────────────────────────────
export function htmlToPlainText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|li|h[1-6]|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── footer ───────────────────────────────────────────────────────────────────
export function injectUnsubscribeFooter(html, unsubUrl, companyAddress) {
  const footer = `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:20px 24px 24px;border-top:1px solid #e5e7eb;">
     <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
        You are receiving this email as part of our outreach.<br>
        <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
        ${companyAddress ? `&nbsp;|&nbsp;${companyAddress}` : ''}
      </p>
    </td>
  </tr>
</table>`;

  return html.includes('</body>')
    ? html.replace('</body>', `${footer}</body>`)
    : html + footer;
}

// ── headers ──────────────────────────────────────────────────────────────────
export function buildEmailHeaders(unsubUrl, fromDomain) {
  const domain = fromDomain || 'mail';
  const messageId = `<${randomUUID()}@${domain}>`;

  return {
    'Message-ID': messageId,
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ── email payload ────────────────────────────────────────────────────────────
export function buildEmailPayload({
  to,
  from,
  subject,
  html,
  text,
  unsubUrl,
  companyAddress
}) {
  const finalHtml = injectUnsubscribeFooter(html, unsubUrl, companyAddress);
  const fromDomain = (from || '').split('@')[1] || 'mail';

  return {
    to,
    from,
    subject,
    html: finalHtml,
    text: text || htmlToPlainText(finalHtml),
    headers: buildEmailHeaders(unsubUrl, fromDomain)
  };
}