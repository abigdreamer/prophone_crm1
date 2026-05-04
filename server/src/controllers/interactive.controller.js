import * as repo from '../repositories/interactiveRepository.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import prisma from '../lib/prisma.js';

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Shared CSS ────────────────────────────────────────────────────────────────
const BASE_CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:20px;padding:40px 36px;max-width:480px;width:100%;box-shadow:0 4px 32px rgba(0,0,0,0.10)}h1{font-size:20px;font-weight:700;color:#1e293b;margin-bottom:24px;line-height:1.3;text-align:center}button{background:#6366f1;color:#fff;border:none;border-radius:12px;padding:13px 0;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;transition:background 0.15s;margin-top:20px}button:hover{background:#4f46e5}button:disabled{opacity:0.6;cursor:not-allowed}.thanks{text-align:center}.thanks .icon{font-size:52px;margin-bottom:12px}.thanks h2{font-size:22px;font-weight:700;color:#22c55e;margin-bottom:8px}.thanks p{font-size:14px;color:#64748b;line-height:1.5}`;

// ── Static pages ──────────────────────────────────────────────────────────────
function alreadyRespondedPage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Already Submitted</title><style>${BASE_CSS}</style></head><body><div class="card"><div style="text-align:center"><div style="font-size:52px;margin-bottom:16px">✓</div><h1 style="margin-bottom:10px">Already submitted</h1><p style="font-size:14px;color:#64748b">You've already responded to this. Thank you!</p></div></div></body></html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found</title><style>${BASE_CSS}</style></head><body><div class="card"><div style="text-align:center"><div style="font-size:52px;margin-bottom:16px">🔗</div><h1 style="margin-bottom:10px">Link not found</h1><p style="font-size:14px;color:#64748b">This link may have expired or is invalid.</p></div></div></body></html>`;
}

// ── Page generators ───────────────────────────────────────────────────────────
function sliderPageHtml(session) {
  const c = session.config || {};
  const title = escHtml(c.title || 'Rate your experience');
  const min = Number(c.min ?? 1);
  const max = Number(c.max ?? 10);
  const step = Number(c.step ?? 1);
  const labelMin = escHtml((c.labels || {}).min || '');
  const labelMax = escHtml((c.labels || {}).max || '');
  const btnText = escHtml(c.buttonText || 'Submit');
  const { token } = session;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}
.value-display{text-align:center;font-size:52px;font-weight:800;color:#6366f1;margin:4px 0 16px;line-height:1}
input[type=range]{width:100%;height:6px;appearance:none;background:#e2e8f0;border-radius:99px;outline:none;cursor:pointer}
input[type=range]::-webkit-slider-thumb{appearance:none;width:22px;height:22px;background:#6366f1;border-radius:50%;box-shadow:0 2px 8px rgba(99,102,241,.35);cursor:pointer}
.range-labels{display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#94a3b8}
</style></head>
<body><div class="card" id="main">
  <h1>${title}</h1>
  <div class="value-display" id="val">${min}</div>
  <input type="range" id="sl" min="${min}" max="${max}" step="${step}" value="${min}">
  <div class="range-labels"><span>${labelMin}</span><span>${labelMax}</span></div>
  <button id="btn" onclick="go()">${btnText}</button>
</div>
<script>
const sl=document.getElementById('sl'),vd=document.getElementById('val'),btn=document.getElementById('btn');
sl.oninput=()=>vd.textContent=sl.value;
async function go(){
  btn.disabled=true;btn.textContent='Submitting…';
  try{await fetch('/i/${token}/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:+sl.value})})}catch(e){}
  document.getElementById('main').innerHTML='<div class="thanks"><div class="icon">✓</div><h2>Thank you!</h2><p>Your response has been recorded.<br>You can close this window.</p></div>';
}
</script></body></html>`;
}

function quizPageHtml(session) {
  const c = session.config || {};
  const question = escHtml(c.question || 'Which best describes your situation?');
  const options = Array.isArray(c.options) ? c.options : ['Option A', 'Option B', 'Option C'];
  const btnText = escHtml(c.buttonText || 'Submit Answer');
  const { token } = session;

  const opts = options.map((o, i) =>
    `<label class="opt"><input type="radio" name="q" value="${i}"><span>${escHtml(o)}</span></label>`
  ).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${question}</title>
<style>${BASE_CSS}
.opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;margin-bottom:8px;font-size:14px;color:#334155;transition:border-color .15s,background .15s}
.opt:hover{border-color:#a5b4fc;background:#faf5ff}
.opt:has(input:checked){border-color:#6366f1;background:#f5f3ff}
.opt input{accent-color:#6366f1;width:16px;height:16px;flex-shrink:0}
</style></head>
<body><div class="card" id="main">
  <h1>${question}</h1>
  <form id="form" onsubmit="return false">${opts}</form>
  <button id="btn" onclick="go()">${btnText}</button>
</div>
<script>
const btn=document.getElementById('btn');
const opts=${JSON.stringify(options)};
async function go(){
  const r=document.querySelector('input[name=q]:checked');
  if(!r){alert('Please select an option');return;}
  btn.disabled=true;btn.textContent='Submitting…';
  try{await fetch('/i/${token}/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selectedIndex:+r.value,selectedOption:opts[+r.value]})})}catch(e){}
  document.getElementById('main').innerHTML='<div class="thanks"><div class="icon">✓</div><h2>Thank you!</h2><p>Your answer has been recorded.<br>You can close this window.</p></div>';
}
</script></body></html>`;
}

function spinWheelPageHtml(session) {
  const c = session.config || {};
  const title = escHtml(c.title || 'Spin to Win!');
  const prizes = Array.isArray(c.prizes) ? c.prizes : ['10% Off', 'Free Consult', 'Gift Card', '20% Off', 'Try Again', '30% Off'];
  const btnText = escHtml(c.buttonText || 'Spin the Wheel!');
  const { token } = session;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}
.wheel-wrap{position:relative;width:260px;height:260px;margin:0 auto 16px}
canvas{border-radius:50%;box-shadow:0 4px 24px rgba(0,0,0,.15)}
.ptr{position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:26px solid #6366f1;z-index:10}
#result{text-align:center;font-size:18px;font-weight:700;color:#6366f1;min-height:28px;margin-bottom:4px}
button{margin-top:12px}
</style></head>
<body><div class="card" id="main">
  <h1>${title}</h1>
  <div class="wheel-wrap">
    <div class="ptr"></div>
    <canvas id="wh" width="260" height="260"></canvas>
  </div>
  <div id="result">&nbsp;</div>
  <button id="btn" onclick="spin()">${btnText}</button>
</div>
<script>
const prizes=${JSON.stringify(prizes)};
const COLORS=['#6366f1','#ec4899','#f59e0b','#22c55e','#ef4444','#3b82f6','#8b5cf6','#f97316'];
const cv=document.getElementById('wh'),ctx=cv.getContext('2d');
const cx=cv.width/2,cy=cv.height/2,r=cx-4;
const arc=(Math.PI*2)/prizes.length;
let angle=0,spinning=false;
function draw(a){
  ctx.clearRect(0,0,cv.width,cv.height);
  prizes.forEach((p,i)=>{
    ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,a+i*arc,a+(i+1)*arc);
    ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(a+i*arc+arc/2);
    ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';
    const label=p.length>14?p.slice(0,13)+'…':p;
    ctx.fillText(label,r-8,4);ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);
  ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#e2e8f0';ctx.lineWidth=2;ctx.stroke();
}
draw(angle);
async function spin(){
  if(spinning)return;spinning=true;
  const btn=document.getElementById('btn');btn.disabled=true;
  const winIdx=Math.floor(Math.random()*prizes.length);
  const target=Math.PI*2*6-winIdx*arc-arc/2-Math.PI/2;
  const t0=performance.now(),dur=4000,a0=angle;
  function step(t){
    const p=Math.min((t-t0)/dur,1),ease=1-Math.pow(1-p,4);
    angle=a0+target*ease;draw(angle);
    if(p<1)return requestAnimationFrame(step);
    document.getElementById('result').textContent='🎉 '+prizes[winIdx];
    btn.textContent='Claim Prize';btn.disabled=false;
    btn.onclick=async()=>{
      btn.disabled=true;
      try{await fetch('/i/${token}/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prize:prizes[winIdx],prizeIndex:winIdx})})}catch(e){}
      document.getElementById('main').innerHTML='<div class="thanks"><div class="icon">🎉</div><h2>Congratulations!</h2><p>You won: <strong>'+prizes[winIdx]+'</strong><br>We will be in touch soon!</p></div>';
    };
  }
  requestAnimationFrame(step);
}
</script></body></html>`;
}

function scratchCardPageHtml(session) {
  const c = session.config || {};
  const title = escHtml(c.title || 'Scratch to Reveal Your Offer');
  const prize = escHtml(c.prize || 'Special Offer!');
  const hint = escHtml(c.hint || 'Use your mouse or finger to scratch!');
  const { token } = session;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}
.sc-wrap{position:relative;width:280px;height:140px;margin:0 auto 12px;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.12)}
.prize-layer{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5f3ff,#ede9fe);gap:4px}
.prize-text{font-size:28px;font-weight:800;color:#6366f1}
.prize-sub{font-size:11px;color:#8b5cf6;font-weight:600;letter-spacing:.04em}
canvas{position:absolute;inset:0;cursor:crosshair;touch-action:none}
.hint{text-align:center;font-size:12px;color:#94a3b8;margin-bottom:8px}
#msg{text-align:center;font-size:13px;color:#22c55e;min-height:20px;font-weight:600}
</style></head>
<body><div class="card" id="main">
  <h1>${title}</h1>
  <div class="hint">${hint}</div>
  <div class="sc-wrap">
    <div class="prize-layer">
      <div class="prize-text">${prize}</div>
      <div class="prize-sub">Exclusive offer for you</div>
    </div>
    <canvas id="sc" width="280" height="140"></canvas>
  </div>
  <div id="msg">&nbsp;</div>
</div>
<script>
const cv=document.getElementById('sc'),ctx=cv.getContext('2d');
let active=false,submitted=false;
ctx.fillStyle='#94a3b8';ctx.fillRect(0,0,cv.width,cv.height);
ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='bold 15px sans-serif';ctx.textAlign='center';
ctx.fillText('Scratch here! ✶',cv.width/2,cv.height/2+5);
function scratch(x,y){
  ctx.globalCompositeOperation='destination-out';
  ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();
  if(submitted)return;
  const d=ctx.getImageData(0,0,cv.width,cv.height).data;
  let cleared=0;for(let i=3;i<d.length;i+=4)if(d[i]===0)cleared++;
  if(cleared/(cv.width*cv.height)>0.5){
    submitted=true;
    document.getElementById('msg').textContent='Submitting…';
    fetch('/i/${token}/respond',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prize:'${prize}'})})
      .then(()=>{document.getElementById('msg').textContent='🎉 Offer revealed! We will contact you soon.';})
      .catch(()=>{});
  }
}
function pos(e){
  const rect=cv.getBoundingClientRect();
  const src=e.touches?e.touches[0]:e;
  return[src.clientX-rect.left,src.clientY-rect.top];
}
cv.addEventListener('mousedown',()=>active=true);
cv.addEventListener('mouseup',()=>active=false);
cv.addEventListener('mousemove',e=>{if(active){const[x,y]=pos(e);scratch(x,y);}});
cv.addEventListener('touchstart',e=>{e.preventDefault();active=true;});
cv.addEventListener('touchend',()=>active=false);
cv.addEventListener('touchmove',e=>{e.preventDefault();if(active){const[x,y]=pos(e);scratch(x,y);}},{passive:false});
</script></body></html>`;
}

// ── Score helper ──────────────────────────────────────────────────────────────
function calcScore(type, response) {
  if (type === 'slider') return Math.min(Math.round((response?.value ?? 0) * 2), 20);
  if (type === 'quiz')       return 10;
  if (type === 'spin_wheel') return 5;
  if (type === 'scratch')    return 5;
  return 0;
}

// ── Serve hosted interactive page ─────────────────────────────────────────────
export async function servePage(req, res) {
  try {
    const session = await repo.findByToken(req.params.token);
    if (!session) return res.status(404).send(notFoundPage());
    if (session.respondedAt) return res.send(alreadyRespondedPage());

    let html;
    switch (session.type) {
      case 'slider':     html = sliderPageHtml(session);     break;
      case 'quiz':       html = quizPageHtml(session);       break;
      case 'spin_wheel': html = spinWheelPageHtml(session);  break;
      case 'scratch':    html = scratchCardPageHtml(session); break;
      default:           return res.status(404).send(notFoundPage());
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[interactive.servePage]', err);
    res.status(500).send('<h1>Server error</h1>');
  }
}

// ── Record response ───────────────────────────────────────────────────────────
export async function handleRespond(req, res) {
  try {
    const session = await repo.findByToken(req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.respondedAt) return res.status(409).json({ error: 'Already responded' });

    const scoreGiven = calcScore(session.type, req.body);
    await repo.recordResponse(session.token, { response: req.body, scoreGiven });

    if (session.contactId) {
      await prisma.contact.update({
        where: { id: session.contactId },
        data: { leadScore: { increment: scoreGiven }, lastActivityAt: new Date() },
      });
      await prisma.activity.create({
        data: {
          contactId: session.contactId,
          type: 'interactive',
          note: `[${session.type}] ${JSON.stringify(req.body)}`,
          by: 'system',
        },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[interactive.handleRespond]', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Create session (authenticated) ───────────────────────────────────────────
export async function createInteractiveSession(req, res) {
  try {
    const { contactId, templateId, blockId, type, config } = req.body ?? {};
    if (!blockId || !type) return sendError(res, 'blockId and type are required', 400);

    const session = await repo.createSession({
      contactId: contactId || null,
      templateId: templateId || null,
      blockId,
      type,
      config: config || {},
    });

    sendSuccess(res, session, 201);
  } catch (err) {
    sendServerError(res, err, 'createInteractiveSession');
  }
}

// ── List sessions for a contact ───────────────────────────────────────────────
export async function getContactSessions(req, res) {
  try {
    const sessions = await repo.findByContact(req.params.contactId);
    sendSuccess(res, sessions);
  } catch (err) {
    sendServerError(res, err, 'getContactSessions');
  }
}
