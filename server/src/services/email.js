import { createHmac, timingSafeEqual } from 'crypto';

function secret() {
  return process.env.UNSUB_SECRET || process.env.JWT_SECRET || 'change-me-in-env';
}

// ── Unsubscribe tokens ────────────────────────────────────────────────────────

export function generateUnsubToken(recipientId) {
  return createHmac('sha256', secret()).update(String(recipientId)).digest('hex');
}

export function verifyUnsubToken(recipientId, token) {
  if (!token || typeof token !== 'string') return false;
  const expected = generateUnsubToken(recipientId);
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function buildUnsubUrl(baseUrl, recipientId) {
  const tok = generateUnsubToken(recipientId);
  return `${baseUrl}/api/email/unsubscribe?rid=${recipientId}&tok=${tok}`;
}

// ── Plain-text extraction ─────────────────────────────────────────────────────

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

// ── Footer injection ──────────────────────────────────────────────────────────

export function injectUnsubscribeFooter(html, unsubUrl) {
  const footer = `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:20px 24px 24px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
        You received this email because you opted in to our mailing list.<br>
        <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
         &nbsp;|&nbsp; ${process.env.COMPANY_ADDRESS || ''}
      </p>
    </td>
  </tr>
</table>`;

  return html.includes('</body>')
    ? html.replace('</body>', `${footer}</body>`)
    : html + footer;
}

// ── Headers ───────────────────────────────────────────────────────────────────

export function buildEmailHeaders(unsubUrl) {
  return {
    'List-Unsubscribe':      `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence':            'bulk',
  };
}
