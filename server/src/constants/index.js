// ── Pools ─────────────────────────────────────────────────────────────────────
export const POOL = Object.freeze({ PROSPECT: 'prospect', CLIENT: 'client' });
export const VALID_POOLS = Object.values(POOL);

// ── Lifecycle Stages ──────────────────────────────────────────────────────────
export const STAGE = Object.freeze({
  NEW:            'new',
  CONTACTED:      'contacted',
  ENGAGED:        'engaged',
  DEMO_SCHEDULED: 'demo_scheduled',
  DEMO_DONE:      'demo_done',
  PROPOSAL_SENT:  'proposal_sent',
  NEGOTIATING:    'negotiating',
  CUSTOMER:       'customer',
  NOT_QUALIFIED:  'not_qualified',
  LOST:           'lost',
  CHURNED:        'churned',
});
export const VALID_STAGES = Object.values(STAGE);

// ── Contact Statuses ──────────────────────────────────────────────────────────
export const STATUS = Object.freeze({
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  PENDING:  'pending',
  CANCELED: 'canceled',
});
export const VALID_STATUSES = [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.PENDING];

// ── Account Sizes ─────────────────────────────────────────────────────────────
export const VALID_ACCOUNT_SIZES = Object.freeze(['1-5', '6-15', '16-50', '51-200', '200+']);

// ── Dashboard / ViewMode Stage Groups ─────────────────────────────────────────
// Maps each dashboard filter tab to the DB lifecycleStage values it covers.
export const DASHBOARD_GROUPS = Object.freeze({
  prospects: [STAGE.NEW],
  leads:     [STAGE.CONTACTED, STAGE.ENGAGED],
  warm:      [STAGE.DEMO_SCHEDULED, STAGE.DEMO_DONE, STAGE.PROPOSAL_SENT],
  hot:       [STAGE.NEGOTIATING],
  customer:  [STAGE.CUSTOMER],
  backburner: [],
  lost:      [STAGE.NOT_QUALIFIED, STAGE.LOST, STAGE.CHURNED],
});

// ── Activity Types ────────────────────────────────────────────────────────────
export const ACTIVITY_TYPE = Object.freeze({
  FORM_SUBMITTED:    'form_submitted',
  EMAIL_SENT:        'email_sent',
  EMAIL_OPENED:      'email_opened',
  EMAIL_CLICKED:     'email_clicked',
  EMAIL_REPLIED:     'email_replied',
  CALL_MADE:         'call_made',
  CALL_ANSWERED:     'call_answered',
  SMS_SENT:          'sms_sent',
  SMS_RECEIVED:      'sms_received',
  DEMO_SCHEDULED:    'demo_scheduled',
  DEMO_HELD:         'demo_held',
  PROPOSAL_SENT:     'proposal_sent',
  CONTRACT_SIGNED:   'contract_signed',
  STAGE_CHANGED:     'stage_changed',
  NOTE_ADDED:        'note_added',
  AD_CLICKED:        'ad_clicked',
  AD_IMPRESSION:     'ad_impression',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_HELD:      'meeting_held',
  CANCEL_CONTACT:    'cancel_contact',
  UNCANCEL_CONTACT:  'uncancel_contact',
  LEAD_UPDATED:      'lead_updated',
  CONTACT_CREATED:   'contact_created',
  CONTACT_IMPORTED:  'contact_imported',
});

export const VALID_ACTIVITY_TYPES = [
  ACTIVITY_TYPE.FORM_SUBMITTED,
  ACTIVITY_TYPE.EMAIL_SENT,    ACTIVITY_TYPE.EMAIL_OPENED,
  ACTIVITY_TYPE.EMAIL_CLICKED, ACTIVITY_TYPE.EMAIL_REPLIED,
  ACTIVITY_TYPE.CALL_MADE,     ACTIVITY_TYPE.CALL_ANSWERED,
  ACTIVITY_TYPE.SMS_SENT,      ACTIVITY_TYPE.SMS_RECEIVED,
  ACTIVITY_TYPE.DEMO_SCHEDULED, ACTIVITY_TYPE.DEMO_HELD,
  ACTIVITY_TYPE.PROPOSAL_SENT, ACTIVITY_TYPE.CONTRACT_SIGNED,
  ACTIVITY_TYPE.STAGE_CHANGED, ACTIVITY_TYPE.NOTE_ADDED,
  ACTIVITY_TYPE.AD_CLICKED,    ACTIVITY_TYPE.AD_IMPRESSION,
  ACTIVITY_TYPE.MEETING_SCHEDULED, ACTIVITY_TYPE.MEETING_HELD,
  ACTIVITY_TYPE.LEAD_UPDATED,
  ACTIVITY_TYPE.CANCEL_CONTACT, ACTIVITY_TYPE.UNCANCEL_CONTACT,
];

// ── Entity Types (for Activity.entityType) ────────────────────────────────────
export const ENTITY_TYPE = Object.freeze({
  CONTACT:  'contact',
  CLIENT:   'client',
  CAMPAIGN: 'campaign',
  TEMPLATE: 'template',
  DOMAIN:   'domain',
});

// ── Activity Actions (shared across all entity types) ─────────────────────────
export const ACTION = Object.freeze({
  CREATE:  'CREATE',
  UPDATE:  'UPDATE',
  CANCEL:  'CANCEL',
  RESTORE: 'RESTORE',
  SEND:    'SEND',
  RESEND:  'RESEND',
  VERIFY:  'VERIFY',
});

export const TIMESTAMP_FILTERS = {
  delivered: { deliveredAt: { not: null } },
  opened:    { openedAt:    { not: null } },
  clicked:   { clickedAt:   { not: null } },
  bounced:   { bouncedAt:   { not: null } },
};

// ── Client Activity Actions (legacy alias) ────────────────────────────────────
export const CLIENT_ACTION = ACTION;

// ── Client Plans ──────────────────────────────────────────────────────────────
export const VALID_CLIENT_PLANS = Object.freeze(['Starter', 'Pro', 'Enterprise']);

// ── Tracked Fields for Change Logging ────────────────────────────────────────
export const TRACKED_CONTACT_FIELDS = Object.freeze([
  'firstName', 'lastName', 'email', 'phone', 'company', 'title',
  'leadScore', 'status', 'contractValue', 'ownedBy',
]);
export const TRACKED_CLIENT_FIELDS = Object.freeze(['name', 'domain', 'industry', 'plan', 'mrr', 'color']);
