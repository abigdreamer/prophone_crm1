import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import juice from 'juice';

// ── CSS inlining ──────────────────────────────────────────────────────────────
// Gmail strips <style> blocks. Inlining converts them to style="" attributes
// so the email renders identically in Gmail and every other client.
export function inlineCss(html) {
  if (!html) return html;
  try {
    return juice(html, {
      removeStyleTags:    true,   // remove <style> after inlining
      preserveMediaQueries: true, // keep @media rules for responsive clients
      preserveFontFaces:  true,
      applyStyleTags:     true,
      applyAttributesTableElements: true,
    });
  } catch {
    return html; // never break a send over CSS inlining failure
  }
}

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

// ── send-time unsubscribe injection ──────────────────────────────────────────
// Templates are stored untouched. At send time, injectUnsubUrl wires the real
// per-recipient URL into whatever "Unsubscribe" element the template already has,
// falling back to appending a minimal footer only when no such element exists.

// Matches the exact compact footer that this file appends so it can be stripped
// before re-injection (handles old double-link templates).
const SYSTEM_FOOTER_RE = /<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:20px 24px 24px;border-top:1px solid #e5e7eb;"><p[^>]*>You are receiving this email as part of our outreach\.<br><a[^>]*>Unsubscribe<\/a><\/p><\/td><\/tr><\/table>/g;

function stripSystemFooter(html) {
  return html.replace(SYSTEM_FOOTER_RE, '');
}

// Called at send time with the fully substituted HTML and the real recipient URL.
// Never modifies template HTML at save time — zero risk of corrupting stored content.
export function injectUnsubUrl(html, unsubUrl) {
  if (!html || !unsubUrl) return html;

  // Remove any previously auto-injected system footer first (idempotency).
  const base = stripSystemFooter(html);

  let found = false;

  // Pass 1: an href already contains "unsubscribe" — swap only the href value.
  const pass1 = base.replace(
    /(href\s*=\s*(["']))[^"']*(?:unsubscribe)[^"']*(\2)/gi,
    (_, prefix, _q, closing) => { found = true; return `${prefix}${unsubUrl}${closing}`; },
  );
  if (found) return pass1;

  // Pass 2: link text says "Unsubscribe" but href is something like "#" —
  // swap only the href value inside the opening tag; every other attribute
  // and the link text are left completely untouched.
  const pass2 = base.replace(
    /(<a\b[^>]*>)([\s\S]*?<\/a>)/gi,
    (match, openTag, rest) => {
      if (!/unsubscribe/i.test(rest)) return match;
      found = true;
      const fixedTag = openTag.replace(
        /(href\s*=\s*["'])[^"']*(["'])/gi,
        (_, hrefPrefix, closeQuote) => `${hrefPrefix}${unsubUrl}${closeQuote}`,
      );
      return fixedTag + rest;
    },
  );
  if (found) return pass2;

  // No unsubscribe element found in template — return as-is.
  return base;
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