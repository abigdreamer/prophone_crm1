/**
 * Standardized API response helpers.
 *
 * Success envelope: { success: true, data: any }
 * Error envelope:   { success: false, error: string }
 *
 * Internal errors are logged server-side but never exposed to callers.
 */

export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendError(res, message, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export function sendServerError(res, err, context = '') {
  const label = context ? `[${context}]` : '[server]';
  console.error(`${label} Unhandled error:`, err?.message ?? err);
  return res.status(500).json({ success: false, error: err?.message || 'Something went wrong' });
}
