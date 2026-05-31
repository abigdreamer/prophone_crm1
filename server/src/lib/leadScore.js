/**
 * Lead Score Calculator
 * ─────────────────────────────────────────────────────────────────────────────
 * Score = stageBase + completeness
 *
 *   stageBase    (0–90)  — primary driver; maps lifecycle stage to a base value
 *   completeness (1–10)  — minor bonus for how much profile data is filled in
 *
 * Result range: 1 – 100
 *
 *   new lead, empty profile  →  1
 *   new lead, full profile   →  10
 *   contacted, full profile  →  20
 *   …
 *   customer, full profile   →  100
 *
 * Stage is the only major factor. Completeness can shift the score by at most
 * 10 points within a stage band — it never causes a lead to "skip" to the
 * next stage band.
 */

// ─── Stage base scores (0–90) ────────────────────────────────────────────────
// Each stage occupies a 10-point band when combined with completeness (1–10).
// new        →  1–10   (completeness only, stage adds nothing)
// contacted  → 11–20
// engaged    → 21–30
// demo_sched → 31–40
// demo_done  → 41–50
// proposal   → 51–60
// negotiating→ 61–70
// customer   → 91–100  (large jump: closing is a major milestone)
// disqualified/lost/churned → 1–10 (reset to new-equivalent band)
const STAGE_BASE = {
  new:            0,
  contacted:      10,
  engaged:        20,
  demo_scheduled: 30,
  demo_done:      40,
  proposal_sent:  50,
  negotiating:    60,
  customer:       90,
  not_qualified:  0,
  lost:           0,
  churned:        0,
};

// ─── Field weights for completeness (must sum to 100) ────────────────────────
const FIELD_SPECS = [
  { field: 'firstName', weight: 20 },
  { field: 'email',     weight: 20 },
  { field: 'phone',     weight: 18 },
  { field: 'company',   weight: 17 },
  { field: 'source',    weight: 13 },
  { field: 'lastName',  weight: 7  },
  { field: 'title',     weight: 3  },
  { field: 'website',   weight: 1  },
  { field: 'address',   weight: 1  },
];
// Total = 20+20+18+17+13+7+3+1+1 = 100 ✓

// ─── Completeness sub-score (1–10) ───────────────────────────────────────────
/**
 * How much key profile data is present.
 * Returns an integer in [1, 10].
 *
 * @param {object} contact
 * @returns {number} Integer 1–10
 */
function completenessScore(contact) {
  let earned = 0;

  for (const { field, weight } of FIELD_SPECS) {
    const val = contact[field];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      earned += weight;
    }
  }

  // Map [0–100] → integer [1–10]
  return Math.max(1, Math.min(10, Math.round(1 + (earned / 100) * 9)));
}

// ─── Final score (1–100) ─────────────────────────────────────────────────────
/**
 * Compute the lead score.
 *
 * Stage is the primary driver.  Profile completeness adds 1–10 points on top.
 *
 * @param {object} contact  Contact data (needs lifecycleStage + profile fields)
 * @returns {number}        Integer in [1, 100]
 */
function calculateLeadScore(contact) {
  const base = STAGE_BASE[contact.lifecycleStage] ?? 0;
  const cs   = completenessScore(contact); // 1–10
  return Math.max(1, Math.min(100, base + cs));
}

export { completenessScore, calculateLeadScore };
