import prisma from '../lib/prisma.js';
import { verifyUnsubToken } from '../services/email.js';
import * as repo from '../repositories/campaignRepository.js';
import { tracking } from '../config/tracking.js';

const UNSUB_SECRET = process.env.UNSUB_SECRET || process.env.JWT_SECRET || '';

async function withRetry(fn, maxRetries = tracking.maxRetries, delayMs = tracking.retryDelayMs) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export async function trackOpen(req, res) {
  const { recipientId } = req.query;
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(PIXEL);
  if (recipientId) {
    withRetry(() => repo.applyTrackingEvent(recipientId, 'opened'))
      .catch(err => console.error('[trackOpen] failed after retries:', err.message));
  }
}

export async function trackClick(req, res) {
  const { recipientId, url } = req.query;
  if (recipientId) {
    withRetry(() => repo.applyTrackingEvent(recipientId, 'clicked'))
      .catch(err => console.error('[trackClick] failed after retries:', err.message));
  }
  // req.query values are already URL-decoded by Express — do NOT call
  // decodeURIComponent again or percent-encoded chars in the destination
  // URL (e.g. %20 in a path) will be decoded a second time and break the redirect.
  const destination = url || '/';
  try {
    const parsed = new URL(destination);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    res.redirect(302, destination);
  } catch {
    res.redirect(302, '/');
  }
}

export async function handleUnsubscribe(req, res) {
  const { rid, tok } = req.query;

  if (!rid || !tok || !verifyUnsubToken(rid, tok, UNSUB_SECRET)) {
    return res.status(400).send(unsubPage('Invalid or expired unsubscribe link.', false));
  }

  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where:  { id: rid },
      select: { id: true, campaignId: true, status: true, contactId: true, contact: { select: { email: true } } },
    });

    if (!recipient) {
      return res.status(404).send(unsubPage('Recipient not found.', false));
    }

    if (recipient.status === 'unsubscribed') {
      return res.send(unsubPage('You are already unsubscribed.', true));
    }

    // Show confirmation page — actual unsubscribe happens on POST
    res.send(unsubConfirmPage(recipient.contact?.email || '', rid, tok));
  } catch (err) {
    console.error('[handleUnsubscribe]', err);
    res.status(500).send(unsubPage('Something went wrong. Please try again.', false));
  }
}

// One-click POST handler (RFC 8058 List-Unsubscribe-Post)
export async function handleUnsubscribePost(req, res) {
  const { rid, tok } = req.query;
  if (!rid || !tok || !verifyUnsubToken(rid, tok, UNSUB_SECRET)) {
    return res.status(400).json({ error: 'invalid token' });
  }
  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where:  { id: rid },
      select: { id: true, campaignId: true, contactId: true },
    });
    if (!recipient) return res.status(404).json({ error: 'not found' });

    const rawReason = req.body?.reason;
    const unsubReason = (typeof rawReason === 'string' && rawReason.trim())
      ? rawReason.trim().slice(0, 500)
      : null;

    await Promise.all([
      prisma.campaignRecipient.update({ where: { id: rid }, data: { status: 'unsubscribed', unsubReason } }),
      prisma.campaign.update({ where: { id: recipient.campaignId }, data: { unsubscribedCount: { increment: 1 } } }),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server error' });
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unsubPage(message, success) {
  const color = success ? '#15803d' : '#b91c1c';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${success ? 'Unsubscribed' : 'Error'}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:Arial,sans-serif;background:#f4f4f4;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.box{background:#fff;border-radius:10px;padding:40px 48px;max-width:400px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.10);}
h2{color:${color};margin:0 0 12px;}p{color:#6b7280;margin:0;font-size:14px;}</style>
</head><body><div class="box"><h2>${success ? '✓ Unsubscribed' : '⚠ Error'}</h2><p>${message}</p></div></body></html>`;
}

function unsubConfirmPage(email, rid, tok) {
  const action = `/api/email/unsubscribe?rid=${encodeURIComponent(rid)}&tok=${encodeURIComponent(tok)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Unsubscribe</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial,sans-serif;background:#f4f4f4;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#fff;border-radius:12px;padding:36px 40px;max-width:440px;width:90%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.12)}
  h2{margin:0 0 6px;font-size:22px;color:#111827}
  .em{color:#6b7280;font-size:15px;margin:0 0 4px;word-break:break-all}
  .sub{color:#9ca3af;font-size:13px;margin:0 0 22px}
  .reason-label{text-align:left;font-size:13px;color:#374151;font-weight:600;margin-bottom:6px;display:block}
  .reason-optional{color:#9ca3af;font-weight:400;font-size:12px;margin-left:4px}
  .reason-wrap{margin-bottom:18px;text-align:left}
  select.reason-sel{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#374151;background:#fff;font-family:inherit;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;cursor:pointer;outline:none}
  select.reason-sel:focus{border-color:#6366f1}
  textarea.reason-txt{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#374151;font-family:inherit;resize:vertical;min-height:72px;outline:none;margin-top:8px;display:none}
  textarea.reason-txt:focus{border-color:#6366f1}
  .btn-u{width:100%;background:#ef4444;color:#fff;border:none;border-radius:8px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px;transition:opacity .15s}
  .btn-u:hover{opacity:.9}
  .btn-u:disabled{opacity:.5;cursor:default}
  .btn-c{width:100%;background:none;color:#6b7280;border:1px solid #e5e7eb;border-radius:8px;padding:11px;font-size:14px;cursor:pointer;font-family:inherit;transition:background .15s}
  .btn-c:hover{background:#f9fafb}
  #msg{margin-top:16px;display:none}
  .ok{color:#15803d;font-size:18px;font-weight:700;margin:0 0 6px}
  .ok-sub{color:#6b7280;font-size:14px;margin:0}
</style>
</head><body><div class="box">
  <h2>Unsubscribe</h2>
  <p class="em">${escHtml(email)}</p>
  <p class="sub">We&rsquo;re sorry to see you go. You can unsubscribe below.</p>
  <div id="btns">
    <div class="reason-wrap">
      <label class="reason-label">Why are you unsubscribing? <span class="reason-optional">(optional)</span></label>
      <select class="reason-sel" id="reasonSel">
        <option value="">— Choose a reason (optional) —</option>
        <option value="Too many emails">Too many emails</option>
        <option value="Content not relevant">Content not relevant to me</option>
        <option value="Never signed up">I never signed up for this</option>
        <option value="Not interested anymore">Not interested anymore</option>
        <option value="Other">Other reason…</option>
      </select>
      <textarea class="reason-txt" id="reasonTxt" placeholder="Tell us more (optional)…" maxlength="500"></textarea>
    </div>
    <button class="btn-u" id="confirmBtn">Unsubscribe</button>
    <button class="btn-c" onclick="history.back()">Cancel</button>
  </div>
  <div id="msg"></div>
</div>
<script>
document.getElementById('reasonSel').addEventListener('change',function(){
  document.getElementById('reasonTxt').style.display=this.value==='Other'?'block':'none';
});
document.getElementById('confirmBtn').addEventListener('click',function(){
  var btn=this;
  var sel=document.getElementById('reasonSel').value;
  var txt=document.getElementById('reasonTxt').value.trim();
  var reason=sel==='Other'?(txt||'Other'):sel;
  btn.disabled=true;btn.textContent='Processing…';
  fetch('${action}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason||null})})
    .then(function(r){return r.json();})
    .then(function(d){
      document.getElementById('btns').style.display='none';
      var m=document.getElementById('msg');
      m.style.display='block';
      if(d.ok){
        m.innerHTML='<p class="ok">✓ Unsubscribed</p><p class="ok-sub">You have been successfully unsubscribed.</p>';
      }else{
        m.innerHTML='<p style="color:#b91c1c;font-size:16px;font-weight:700;margin:0 0 6px">⚠ Error</p><p class="ok-sub">'+(d.error||'Something went wrong.')+' Please try again.</p>';
        document.getElementById('btns').style.display='block';
        btn.disabled=false;btn.textContent='Unsubscribe';
      }
    })
    .catch(function(){
      btn.disabled=false;btn.textContent='Unsubscribe';
    });
});
</script>
</body></html>`;
}
