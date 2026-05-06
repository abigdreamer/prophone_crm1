/**
 * Tracking configuration.
 *
 * Every value is driven by an environment variable so behaviour can be
 * changed via .env without touching code or redeploying.
 *
 * Variables (all optional — defaults shown):
 *
 *   TRACKING_ENABLED=true
 *     Master switch. Set to "false" to disable all open/click recording.
 *
 *   TRACKING_OPEN_POINTS=1
 *     Lead-score points awarded when an email is opened.
 *
 *   TRACKING_CLICK_POINTS=3
 *     Lead-score points awarded when a tracked link is clicked.
 *
 *   TRACKING_CLICK_IMPLIES_OPEN=true
 *     When a click is recorded but no open has been seen yet (pixel was
 *     blocked by the email client), automatically backfill an open event
 *     so the timeline and open-rate counters are accurate.
 *
 *   TRACKING_MAX_RETRIES=2
 *     How many times to retry a failed tracking write before giving up.
 *     Retries use exponential back-off starting at TRACKING_RETRY_DELAY_MS.
 *
 *   TRACKING_RETRY_DELAY_MS=50
 *     Base delay (ms) for the first retry. Doubles on each attempt.
 *     e.g. 2 retries → waits 50 ms, then 100 ms before giving up.
 */

function envInt(name, fallback) {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const tracking = Object.freeze({
  enabled:          process.env.TRACKING_ENABLED          !== 'false',
  openPoints:       envInt('TRACKING_OPEN_POINTS',           1),
  clickPoints:      envInt('TRACKING_CLICK_POINTS',          3),
  clickImpliesOpen: process.env.TRACKING_CLICK_IMPLIES_OPEN !== 'false',
  maxRetries:       envInt('TRACKING_MAX_RETRIES',           2),
  retryDelayMs:     envInt('TRACKING_RETRY_DELAY_MS',       50),
});
