// HTML Import Rules:
// 1. Keep layout exactly as-is — no reformatting
// 2. Do not modify links at import time — no tracking, no URL rewriting
// 3. Only remove unsafe content: script tags + JS event attributes
// 4. No auto-formatting or redesign
// 5. Store raw source as-is (after sanitization)
// 6. Import = sanitize + validate only. Tracking/personalization happens at send time.
// 7. Validate: count links, images, check size
// 8. Optional safe mode: strip images, reduce links

const JS_EVENTS = [
  'onabort','onafterprint','onbeforeprint','onbeforeunload','onblur','oncanplay',
  'oncanplaythrough','onchange','onclick','oncontextmenu','oncopy','oncuechange',
  'oncut','ondblclick','ondrag','ondragend','ondragenter','ondragleave','ondragover',
  'ondragstart','ondrop','ondurationchange','onemptied','onended','onerror',
  'onfocus','onhashchange','oninput','oninvalid','onkeydown','onkeypress','onkeyup',
  'onload','onloadeddata','onloadedmetadata','onloadstart','onmessage','onmousedown',
  'onmouseenter','onmouseleave','onmousemove','onmouseout','onmouseover','onmouseup',
  'onoffline','ononline','onpagehide','onpageshow','onpaste','onpause','onplay',
  'onplaying','onpopstate','onprogress','onratechange','onreset','onresize',
  'onscroll','onsearch','onseeked','onseeking','onselect','onstalled','onstorage',
  'onsubmit','onsuspend','ontimeupdate','ontoggle','onunload','onvolumechange',
  'onwaiting','onwheel','onanimationstart','onanimationend','onanimationiteration',
  'ontransitionend',
];

const EVENT_PATTERN = new RegExp(
  `\\s(${JS_EVENTS.join('|')})\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`,
  'gi',
);

/**
 * Remove unsafe content while keeping all layout, structure, and links intact.
 * Removes: <script> blocks, JS event attributes.
 * Does NOT touch: links, images, CSS, layout, inline styles.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // Remove <script>...</script> blocks (including multi-line, with attributes)
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

  // Remove self-closing <script ... />
  out = out.replace(/<script\b[^>]*\/>/gi, '');

  // Remove JS event handler attributes (onclick, onload, etc.)
  out = out.replace(EVENT_PATTERN, '');

  // Remove javascript: href/src values (replace the protocol only, keep the tag)
  out = out.replace(/\bhref\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  out = out.replace(/\bsrc\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

  return out;
}

/**
 * Count links, images, and size for validation. Returns warnings for oversized content.
 */
export function validateHtml(html) {
  if (!html || typeof html !== 'string') {
    return { linkCount: 0, imageCount: 0, sizeBytes: 0, sizeKb: 0, warnings: [] };
  }

  const sizeBytes = Buffer.byteLength(html, 'utf8');
  const sizeKb    = Math.round(sizeBytes / 1024 * 10) / 10;

  const linkMatches  = html.match(/<a\s[^>]*href\s*=/gi) || [];
  const imageMatches = html.match(/<img\s/gi) || [];

  const linkCount  = linkMatches.length;
  const imageCount = imageMatches.length;

  const warnings = [];
  if (sizeKb > 100) warnings.push(`Large HTML (${sizeKb} KB) — some email clients may clip or block it.`);
  if (linkCount > 30) warnings.push(`${linkCount} links detected — high link count may trigger spam filters.`);
  if (imageCount > 15) warnings.push(`${imageCount} images detected — image-heavy emails may be blocked.`);

  return { linkCount, imageCount, sizeBytes, sizeKb, warnings };
}

/**
 * Optional safe mode — reduces images and excess links to improve deliverability.
 * Does NOT change layout or restructure HTML.
 */
export function applySafeMode(html) {
  if (!html || typeof html !== 'string') return html;

  // Strip all <img> tags entirely
  let out = html.replace(/<img\b[^>]*\/?>/gi, '');

  // Keep only the first 5 <a> links — blank out href on the rest
  let linkCount = 0;
  out = out.replace(/(<a\s[^>]*href\s*=\s*["'])([^"']*)(['"][^>]*>)/gi, (match, pre, url, post) => {
    linkCount++;
    if (linkCount <= 5) return match;
    return pre + '#' + post;
  });

  return out;
}

/**
 * Main import pipeline: sanitize → validate → optionally apply safe mode.
 * Returns processed HTML and validation metadata.
 * Does NOT write to the database — saving is the caller's responsibility.
 */
export function importHtml(html, { safeMode = false } = {}) {
  const sanitized  = sanitizeHtml(html);
  const processed  = safeMode ? applySafeMode(sanitized) : sanitized;
  const validation = validateHtml(processed);

  return { html: processed, validation };
}
