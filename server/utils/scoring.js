// ─── Dynamic Lead Score (0–100) ───────────────────────────────────────────────

const STAGE_BASE = {
  new: 5, contacted: 15, engaged: 28,
  proposal_sent: 42, negotiating: 50,
  customer: 50,
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

export function calcLeadScore({ lifecycleStage, activities = [], lastActivityAt, contractValue }) {
  const stage = lifecycleStage || 'new';

  // Terminals
  if (stage === 'customer')      return 100;
  if (stage === 'not_qualified') return 5;
  if (stage === 'lost')          return 5;

  // 1. Stage base (0–50)
  let score = STAGE_BASE[stage] ?? 5;

  // 2. Activity quality — capped at 30
  let actPts = 0;
  for (const a of activities) {
    actPts += ACT_PTS[a.type] || 0;
  }
  score += Math.min(Math.max(actPts, 0), 30);

  // 3. Recency — 0–10
  if (lastActivityAt) {
    const days = (Date.now() - new Date(lastActivityAt)) / 86_400_000;
    if (days <= 2)       score += 10;
    else if (days <= 7)  score += 7;
    else if (days <= 14) score += 4;
    else if (days <= 30) score += 2;
  }

  // 4. Contract value — 0–10
  const val = contractValue || 0;
  if      (val >= 10_000) score += 10;
  else if (val >=  5_000) score += 7;
  else if (val >=  2_000) score += 5;
  else if (val >=    500) score += 3;
  else if (val >      0)  score += 1;

  return Math.min(99, Math.max(0, Math.round(score)));
}
