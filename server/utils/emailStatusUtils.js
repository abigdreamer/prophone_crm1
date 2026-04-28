export const STATUS_PRIORITY = {
  pending:   1,
  queued:    2,
  sent:      3,
  delivered: 4,
  opened:    5,
  clicked:   6,
  bounced:   7,
  failed:    0,
};

export function shouldAdvance(current, next) {
  if (current === 'bounced') return false;
  if (next    === 'bounced') return true;
  return (STATUS_PRIORITY[next] ?? 0) > (STATUS_PRIORITY[current] ?? 0);
}

const RESEND_EVENT_MAP = {
  delivered:  'delivered',
  opened:     'opened',
  clicked:    'clicked',
  bounced:    'bounced',
  complained: 'bounced',
  failed:     'failed',
  sent:       'sent',
};

export function resendEventToStatus(event) {
  return RESEND_EVENT_MAP[event] ?? null;
}
