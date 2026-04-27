/**
 * Server-side port of client/src/lib/jsonToHtml.js.
 * Converts JSON block structure to email-safe table-based HTML,
 * then substitutes contact variables like {{firstName}}, {{email}}.
 */

function bgAttr(bg) {
  if (!bg || bg.type === 'transparent' || !bg.type) return { style: '', bgcolor: '' };
  if (bg.type === 'solid') {
    return { style: `background:${bg.color || '#fff'};`, bgcolor: bg.color || '#fff' };
  }
  if (bg.type === 'gradient') {
    const g = bg.gradient || {};
    const from = g.from || '#6366f1';
    return {
      style: `background:linear-gradient(${g.angle ?? 135}deg,${from},${g.to || '#818cf8'});`,
      bgcolor: from,
    };
  }
  if (bg.type === 'image' && bg.image?.url) {
    const img = bg.image;
    return {
      style: `background-image:url(${img.url});background-size:${img.size || 'cover'};background-position:${img.position || 'center'};background-repeat:${img.repeat || 'no-repeat'};`,
      bgcolor: '',
    };
  }
  return { style: '', bgcolor: '' };
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(p) {
  if (!p) return 'padding:0';
  return `padding:${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`;
}

function blockToHtml(block) {
  const { type, props: p } = block;
  if (!p) return '';

  const bg = bgAttr(p.background);

  switch (type) {
    case 'heading': {
      const tag = p.level || 'h1';
      const style = [
        'margin:0', 'line-height:1.3',
        `font-size:${p.fontSize || 28}px`,
        `font-weight:${p.fontWeight || '700'}`,
        `color:${p.color || '#111827'}`,
        `text-align:${p.align || 'center'}`,
        'font-family:Arial,Helvetica,sans-serif',
      ].join(';');
      const tdStyle = `${pad(p.padding)};${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><${tag} style="${style}">${esc(p.text)}</${tag}></td></tr>`;
    }

    case 'text': {
      const style = [
        'margin:0',
        `font-size:${p.fontSize || 15}px`,
        `color:${p.color || '#374151'}`,
        `text-align:${p.align || 'left'}`,
        `line-height:${p.lineHeight || 1.6}`,
        'font-family:Arial,Helvetica,sans-serif',
      ].join(';');
      const content = (p.text || '').replace(/\n/g, '<br>');
      const tdStyle = `${pad(p.padding)};${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><p style="${style}">${content}</p></td></tr>`;
    }

    case 'image': {
      const align = p.align || 'center';
      const margin = align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';
      const imgStyle = [
        `max-width:${p.width || 100}%`,
        'height:auto', 'display:block',
        `border-radius:${p.borderRadius || 0}px`,
        `margin:${margin}`,
      ].join(';');
      const tdStyle = `${pad(p.padding)};text-align:${align};${bg.style}`;
      if (!p.src) {
        return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><div style="height:120px;background:#f3f4f6;text-align:center;padding-top:44px;color:#9ca3af;font-family:Arial">[Image]</div></td></tr>`;
      }
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><img src="${p.src}" alt="${esc(p.alt)}" style="${imgStyle}" /></td></tr>`;
    }

    case 'button': {
      const btnPad = p.padding
        ? `${p.padding.top}px ${p.padding.right}px ${p.padding.bottom}px ${p.padding.left}px`
        : '12px 28px';
      const btnStyle = [
        'display:inline-block',
        `padding:${btnPad}`,
        `background:${p.bgColor || '#6366f1'}`,
        `color:${p.textColor || '#ffffff'}`,
        `font-size:${p.fontSize || 14}px`,
        'font-weight:600', 'text-decoration:none',
        `border-radius:${p.borderRadius || 6}px`,
        'font-family:Arial,Helvetica,sans-serif',
      ].join(';');
      const tdStyle = `padding:16px 24px;text-align:${p.align || 'center'};${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><a href="${p.url || '#'}" style="${btnStyle}" target="_blank">${esc(p.label)}</a></td></tr>`;
    }

    case 'divider': {
      const hrStyle = [
        'border:none',
        `border-top:${p.thickness || 1}px solid ${p.color || '#e5e7eb'}`,
        `margin:${p.marginTop || 0}px 0 ${p.marginBottom || 0}px 0`,
      ].join(';');
      const tdStyle = `padding:0 ${p.sidePadding || 24}px;${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><hr style="${hrStyle}" /></td></tr>`;
    }

    case 'spacer': {
      const h = p.height || 32;
      const tdStyle = `height:${h}px;line-height:${h}px;font-size:1px;${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}">&nbsp;</td></tr>`;
    }

    case 'footer': {
      const style = [
        'margin:0',
        `font-size:${p.fontSize || 12}px`,
        `color:${p.color || '#9ca3af'}`,
        `text-align:${p.align || 'center'}`,
        'line-height:1.6',
        'font-family:Arial,Helvetica,sans-serif',
      ].join(';');
      const content = (p.text || '').replace(/\n/g, '<br>');
      const tdStyle = `${pad(p.padding)};${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}"><p style="${style}">${content}</p></td></tr>`;
    }

    case 'columns': {
      const cellStyle = [
        `font-size:${p.fontSize || 14}px`,
        `color:${p.color || '#374151'}`,
        'font-family:Arial,Helvetica,sans-serif',
        'line-height:1.6', 'vertical-align:top',
      ].join(';');
      const left  = (p.leftText  || '').replace(/\n/g, '<br>');
      const right = (p.rightText || '').replace(/\n/g, '<br>');
      const tdStyle = `${pad(p.padding)};${bg.style}`;
      return `<tr><td${bg.bgcolor ? ` bgcolor="${bg.bgcolor}"` : ''} style="${tdStyle}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="mobile-stack" width="48%" style="${cellStyle};padding-right:12px">${left}</td>
      <td class="mobile-stack" width="4%"  style="min-width:24px"></td>
      <td class="mobile-stack" width="48%" style="${cellStyle};padding-left:12px">${right}</td>
    </tr>
  </table>
</td></tr>`;
    }

    default:
      return '';
  }
}

function jsonToHtml(structure) {
  const {
    backgroundColor = '#f4f4f4',
    containerBg     = '#ffffff',
    containerWidth  = 600,
    blocks          = [],
  } = structure || {};

  const blocksHtml = blocks.map(blockToHtml).filter(Boolean).join('\n          ');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <style type="text/css">
    body { margin:0; padding:0; background:${backgroundColor}; -webkit-text-size-adjust:100%; }
    img { border:0; max-width:100%; height:auto; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; }
      .mobile-stack { width:100% !important; display:block !important; padding-right:0 !important; padding-left:0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${backgroundColor};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${backgroundColor}">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table class="container" width="${containerWidth}" cellpadding="0" cellspacing="0" border="0" bgcolor="${containerBg}" style="background:${containerBg};border-radius:8px;overflow:hidden;">
          ${blocksHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtmlValue(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Substitute {{variable}} placeholders in rendered HTML.
 * - {{firstName}} and {{fullName}} fall back to "there" if empty/missing.
 * - All other variables fall back to "" (tag removed) if empty/missing.
 * Variable values are HTML-escaped before insertion.
 */
const NAME_FALLBACK_KEYS = new Set(['firstName', 'fullName']);

function substituteVariables(html, vars = {}) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in vars && vars[key] !== '' && vars[key] != null) {
      return escapeHtmlValue(vars[key]);
    }
    if (NAME_FALLBACK_KEYS.has(key)) return 'there';
    return '';
  });
}

/**
 * Inject open-tracking pixel and rewrite links for click tracking.
 * @param {string} html        - Rendered email HTML
 * @param {string} recipientId - campaign_recipient.id
 * @param {string} baseUrl     - e.g. https://app.example.com (falsy → return unchanged)
 * @returns {string} HTML with tracking injected
 */
export function injectTracking(html, recipientId, baseUrl) {
  if (!baseUrl) return html;

  // 1. Rewrite href links (http/https) that don't already start with baseUrl
  const rewritten = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      if (url.startsWith(baseUrl)) return match; // already wrapped — skip
      return `href="${baseUrl}/api/track/c/${recipientId}?u=${encodeURIComponent(url)}"`;
    },
  );

  // 2. Build the tracking pixel
  const pixel = `<img src="${baseUrl}/api/track/o/${recipientId}" width="1" height="1" style="display:none;border:0;" alt="" />`;

  // 3. Inject before </body> or append at end
  if (rewritten.includes('</body>')) {
    return rewritten.replace('</body>', `${pixel}</body>`);
  }
  return rewritten + pixel;
}

/**
 * Render a campaign's JSON structure to HTML and substitute contact variables.
 * @param {object} jsonStructure - The template's json_structure field
 * @param {object} vars - Contact variables: { firstName, lastName, email, ... }
 * @returns {string} Final email HTML
 */
export function renderTemplate(jsonStructure, vars = {}) {
  const html = jsonToHtml(jsonStructure);
  return substituteVariables(html, vars);
}

/**
 * Substitute variables into an already-rendered HTML string (html_snapshot).
 * Used by the worker when the HTML is pre-rendered at send time.
 */
export function substituteIntoHtml(html, vars = {}) {
  return substituteVariables(html, vars);
}
