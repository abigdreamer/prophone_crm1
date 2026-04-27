const STAGE_BASE = {
  new: 5, contacted: 15, engaged: 28,
  proposal_sent: 42, negotiating: 50,
  customer: 100,
  not_qualified: 2, lost: 2,
};

const ACT_PTS = {
  contract_signed: 20, proposal_sent: 10,
  demo_held: 10, demo_scheduled: 5, demo_no_show: -4,
  call_answered: 7, call_made: 4, call_voicemail: 1,
  email_replied: 7, email_clicked: 5, email_opened: 3, email_sent: 2,
  form_submitted: 6, ad_clicked: 3, ad_shown: 1,
  sms_sent: 2, page_visited: 1,
};

export function calcLeadScore(contact = {}) {
  const stage = contact.lifecycleStage || 'new';
  if (stage === 'customer')      return 100;
  if (stage === 'not_qualified') return 5;
  if (stage === 'lost')          return 5;

  let score = STAGE_BASE[stage] ?? 5;

  const acts = contact.activities || [];
  let actPts = 0;
  for (const a of acts) actPts += ACT_PTS[a.type] || 0;
  score += Math.min(Math.max(actPts, 0), 30);

  if (contact.lastActivityAt) {
    const days = (Date.now() - new Date(contact.lastActivityAt)) / 86_400_000;
    if      (days <= 2)  score += 10;
    else if (days <= 7)  score += 7;
    else if (days <= 14) score += 4;
    else if (days <= 30) score += 2;
  }

  return Math.min(99, Math.max(0, Math.round(score)));
}

export function scoreMeta(score) {
  if (score >= 70) return { label: "Hot",    color: "#22c55e" };
  if (score >= 40) return { label: "Warm",   color: "#f59e0b" };
  if (score >= 15) return { label: "Cool",   color: "#6366f1" };
  return               { label: "Cold",   color: "#94a3b8" };
}
