// ── Pools ─────────────────────────────────────────────────────────────────────
export const POOL = Object.freeze({ PROSPECT: 'prospect', CLIENT: 'client' });

// ── Contact Statuses ──────────────────────────────────────────────────────────
export const STATUS = Object.freeze({
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  PENDING:  'pending',
  CANCELED: 'canceled',
});

// ── Account Sizes ─────────────────────────────────────────────────────────────
export const ACCOUNT_SIZES = Object.freeze(['1-5', '6-15', '16-50', '51-200', '200+']);

// ── View Modes (filter tabs used across contacts page, dashboard, sidebar) ─────
export const VIEW_MODE = Object.freeze({
  ALL:        'all',
  PROSPECTS:  'prospects',
  LEADS:      'leads',
  WARM:       'warm',
  HOT:        'hot',
  CUSTOMER:   'customer',
  BACKBURNER: 'backburner',
  LOST:       'lost',
  CANCELED:   'canceled',
});

// ── Stage Groups — maps each viewMode to DB lifecycleStage values ──────────────
// Must stay in sync with server/src/constants/index.js DASHBOARD_GROUPS.
export const STAGE_GROUPS = Object.freeze({
  [VIEW_MODE.PROSPECTS]:  ['new'],
  [VIEW_MODE.LEADS]:      ['contacted', 'engaged'],
  [VIEW_MODE.WARM]:       ['demo_scheduled', 'demo_done', 'proposal_sent'],
  [VIEW_MODE.HOT]:        ['negotiating'],
  [VIEW_MODE.CUSTOMER]:   ['customer'],
  [VIEW_MODE.BACKBURNER]: [],
  [VIEW_MODE.LOST]:       ['not_qualified', 'lost', 'churned'],
});

// ── View Mode Display Labels ───────────────────────────────────────────────────
export const VIEW_MODE_LABEL = Object.freeze({
  [VIEW_MODE.ALL]:        'All Contacts',
  [VIEW_MODE.PROSPECTS]:  'Prospects',
  [VIEW_MODE.LEADS]:      'Leads',
  [VIEW_MODE.WARM]:       'Warm Leads',
  [VIEW_MODE.HOT]:        'Hot Opportunities',
  [VIEW_MODE.CUSTOMER]:   'Customers',
  [VIEW_MODE.BACKBURNER]: 'Backburner',
  [VIEW_MODE.LOST]:       'Lost / Churned',
  [VIEW_MODE.CANCELED]:   'Canceled Contacts',
});
