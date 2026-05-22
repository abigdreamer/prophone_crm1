import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { findByKey } from '../repositories/posthogProjectRepository.js';
import prisma from '../lib/prisma.js';

const getDefaultProjectId = () => process.env.POSTHOG_PROJECT_ID || '';

function getPosthogHost() {
  return (process.env.POSTHOG_HOST || 'https://us.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com')
    .replace('eu.i.posthog.com', 'eu.posthog.com');
}
const getApiKey = () => process.env.POSTHOG_API_KEY || '';

// ── Date range calculator ──────────────────────────────────────────────────────
function getDateRange(range) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = d => new Date(now - d * 86400000).toISOString();

  switch (range) {
    case 'today':      return { after: today.toISOString(), before: null };
    case 'yesterday': {
      const start = new Date(today); start.setDate(today.getDate() - 1);
      return { after: start.toISOString(), before: today.toISOString() };
    }
    case 'last_hour':  return { after: new Date(now - 3600000).toISOString(), before: null };
    case 'last_24h':   return { after: daysAgo(1),   before: null };
    case 'last_7d':    return { after: daysAgo(7),   before: null };
    case 'last_14d':   return { after: daysAgo(14),  before: null };
    case 'last_30d':   return { after: daysAgo(30),  before: null };
    case 'last_90d':   return { after: daysAgo(90),  before: null };
    case 'last_180d':  return { after: daysAgo(180), before: null };
    case 'last_week': {
      const dow = today.getDay();
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      return { after: startOfLastWeek.toISOString(), before: startOfThisWeek.toISOString() };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 1);
      return { after: start.toISOString(), before: end.toISOString() };
    }
    case 'this_week': {
      const dow = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      return { after: start.toISOString(), before: null };
    }
    case 'this_month':
      return { after: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), before: null };
    case 'year_to_date':
      return { after: new Date(now.getFullYear(), 0, 1).toISOString(), before: null };
    case 'all_time':
      return { after: '2020-01-01T00:00:00.000Z', before: null };
    default:
      return { after: daysAgo(7), before: null };
  }
}

// ── HogQL helpers ─────────────────────────────────────────────────────────────
async function runHogQL(host, apiKey, projectId, query) {
  const res = await fetch(`${host}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PostHog HogQL ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// Returns single scalar value
async function hogql(host, apiKey, projectId, query) {
  const json = await runHogQL(host, apiKey, projectId, query);
  return json?.results?.[0]?.[0] ?? 0;
}

// Returns all rows as array of arrays
async function hogqlRows(host, apiKey, projectId, query) {
  const json = await runHogQL(host, apiKey, projectId, query);
  return json?.results ?? [];
}

// ── Single event detail ───────────────────────────────────────────────────────
export async function getEventDetail(req, res) {
  const projectKey = req.params.project || 'foxtow';
  const uuid       = req.params.uuid    || '';
  if (!uuid) return sendError(res, 'Missing event uuid', 400);

  const host   = getPosthogHost();
  const apiKey = getApiKey();
  if (!apiKey) return sendError(res, 'POSTHOG_API_KEY not configured', 503);

  const projectCfg = await findByKey(projectKey).catch(() => null);
  if (!projectCfg) return sendError(res, `Unknown project: ${projectKey}`, 400);
  const projectId = projectCfg.project_id;

  // Escape uuid — only allow UUID chars
  const safeUuid = uuid.replace(/[^a-f0-9-]/gi, '');

  try {
    const rows = await hogqlRows(host, apiKey, projectId, `
      SELECT uuid, event, timestamp, distinct_id, properties
      FROM events
      WHERE uuid = '${safeUuid}'
      LIMIT 1
    `);

    if (!rows.length) return sendError(res, 'Event not found', 404);

    const [id, event, timestamp, distinct_id, rawProps] = rows[0];
    let properties = {};
    try {
      properties = typeof rawProps === 'string' ? JSON.parse(rawProps) : (rawProps || {});
    } catch { properties = {}; }
    sendSuccess(res, { id, event, timestamp, distinct_id, properties });
  } catch (err) {
    sendServerError(res, err, 'getEventDetail');
  }
}

// ── Controller ────────────────────────────────────────────────────────────────
export async function getProjectAnalytics(req, res) {
  const project = req.params.project || 'foxtow';
  const range   = req.query.range || 'last_7d';
  const page    = Math.max(1, parseInt(req.query.page)  || 1);
  const limit   = 100;

  // Sanitize event name filter — only allow safe chars
  const rawEvent  = req.query.event || '';
  const eventName = /^[\w$. -]{0,120}$/.test(rawEvent) ? rawEvent : '';

  const host   = getPosthogHost();
  const apiKey = getApiKey();
  if (!apiKey) return sendError(res, 'POSTHOG_API_KEY not configured', 503);

  const projectCfg = await findByKey(project).catch(() => null);
  if (!projectCfg) return sendError(res, `Unknown project: ${project}`, 400);
  const projectId = projectCfg.project_id;
  const domain    = projectCfg.domain;

  const { after, before } = getDateRange(range);

  const tsClause = before
    ? `timestamp >= toDateTime('${after.slice(0, 19)}') AND timestamp < toDateTime('${before.slice(0, 19)}')`
    : `timestamp >= toDateTime('${after.slice(0, 19)}')`;

  const domainClause   = `properties.$current_url LIKE '%${domain}%'`;
  const prefixClause   = `startsWith(event, '${project}_')`;
  const projectClause  = `(${domainClause} OR ${prefixClause})`;
  // Count PostHog $pageview + any custom *_page_view variant for this project
  const pageviewClause = `((event = '$pageview' AND ${domainClause}) OR event = '${project}_page_view' OR event = 'page_viewed')`;

  const safeEvent      = eventName.replace(/'/g, "''");
  const eventClause    = eventName ? ` AND event = '${safeEvent}'` : '';
  const filteredClause = `${tsClause} AND ${projectClause}${eventClause}`;

  const offset = (page - 1) * limit;

  try {
    const [totalEvents, pageViews, activeUsers, filteredCount, eventRows, eventNameRows] =
      await Promise.all([
        // Stat cards — always unfiltered by event name
        hogql(host, apiKey, projectId,
          `SELECT count() FROM events WHERE ${tsClause} AND ${projectClause}`),
        hogql(host, apiKey, projectId,
          `SELECT count() FROM events WHERE ${tsClause} AND ${pageviewClause}`),
        hogql(host, apiKey, projectId,
          `SELECT count(DISTINCT distinct_id) FROM events WHERE ${tsClause} AND ${projectClause}`),

        // Total count for current filter (used for pagination)
        eventName
          ? hogql(host, apiKey, projectId,
              `SELECT count() FROM events WHERE ${filteredClause}`)
          : Promise.resolve(null),

        // Events for this page — HogQL OFFSET pagination covers all history
        hogqlRows(host, apiKey, projectId, `
          SELECT uuid, event, timestamp, distinct_id,
                 properties.$current_url,
                 properties.$browser,
                 properties.$os,
                 properties.$geoip_city_name,
                 properties.$geoip_country_name
          FROM events
          WHERE ${filteredClause}
          ORDER BY timestamp DESC
          LIMIT ${limit} OFFSET ${offset}
        `),

        // Unique event names for the dropdown (use unfiltered project clause)
        hogqlRows(host, apiKey, projectId, `
          SELECT DISTINCT event FROM events
          WHERE ${tsClause} AND ${projectClause}
          ORDER BY event
          LIMIT 200
        `),
      ]);

    const totalFiltered = eventName ? Number(filteredCount) : Number(totalEvents);
    const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));

    const events = eventRows.map(([uuid, event, timestamp, distinct_id,
                                    url, browser, os, city, country]) => ({
      id:          uuid        || '',
      event:       event       || '',
      timestamp:   timestamp   || '',
      distinct_id: distinct_id || '',
      properties:  { url: url || '', browser: browser || '', os: os || '', city: city || '', country: country || '' },
    }));

    const eventNames = eventNameRows.map(r => r[0]).filter(Boolean);

    sendSuccess(res, {
      project, range, page, limit, totalPages,
      totalEvents:  Number(totalEvents),
      pageViews:    Number(pageViews),
      activeUsers:  Number(activeUsers),
      filteredCount: totalFiltered,
      events,
      eventNames,
    });
  } catch (err) {
    sendServerError(res, err, 'getProjectAnalytics');
  }
}

// ── Client-scoped analytics (uses client.domain + POSTHOG_PROJECT_ID env) ──────
async function resolveClientContext(clientId) {
  const projectId = getDefaultProjectId();
  if (!projectId) throw Object.assign(new Error('POSTHOG_PROJECT_ID not configured'), { status: 503 });

  let domain = '';
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } }).catch(() => null);
    domain = client?.domain?.trim() || '';
  }
  return { projectId, domain };
}

export async function getClientAnalytics(req, res) {
  const clientId  = req.query.clientId || '';
  const range     = req.query.range || 'last_7d';
  const page      = Math.max(1, parseInt(req.query.page) || 1);
  const limit     = 100;

  const rawEvent  = req.query.event || '';
  const eventName = /^[\w$. -]{0,120}$/.test(rawEvent) ? rawEvent : '';

  const host   = getPosthogHost();
  const apiKey = getApiKey();
  if (!apiKey) return sendError(res, 'POSTHOG_API_KEY not configured', 503);

  let projectId, domain;
  try {
    ({ projectId, domain } = await resolveClientContext(clientId));
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }

  const { after, before } = getDateRange(range);

  const tsClause = before
    ? `timestamp >= toDateTime('${after.slice(0, 19)}') AND timestamp < toDateTime('${before.slice(0, 19)}')`
    : `timestamp >= toDateTime('${after.slice(0, 19)}')`;

  const domainClause  = domain ? `properties.$current_url LIKE '%${domain}%'` : null;
  const scopeClause   = domainClause || '1=1';
  const pageviewScope = domainClause
    ? `(event = '$pageview' AND ${domainClause})`
    : `event = '$pageview'`;

  const safeEvent      = eventName.replace(/'/g, "''");
  const eventClause    = eventName ? ` AND event = '${safeEvent}'` : '';
  const filteredClause = `${tsClause} AND ${scopeClause}${eventClause}`;
  const offset         = (page - 1) * limit;

  try {
    const [totalEvents, pageViews, activeUsers, filteredCount, eventRows, eventNameRows] =
      await Promise.all([
        hogql(host, apiKey, projectId, `SELECT count() FROM events WHERE ${tsClause} AND ${scopeClause}`),
        hogql(host, apiKey, projectId, `SELECT count() FROM events WHERE ${tsClause} AND ${pageviewScope}`),
        hogql(host, apiKey, projectId, `SELECT count(DISTINCT distinct_id) FROM events WHERE ${tsClause} AND ${scopeClause}`),
        eventName
          ? hogql(host, apiKey, projectId, `SELECT count() FROM events WHERE ${filteredClause}`)
          : Promise.resolve(null),
        hogqlRows(host, apiKey, projectId, `
          SELECT uuid, event, timestamp, distinct_id,
                 properties.$current_url,
                 properties.$browser,
                 properties.$os,
                 properties.$geoip_city_name,
                 properties.$geoip_country_name
          FROM events
          WHERE ${filteredClause}
          ORDER BY timestamp DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        hogqlRows(host, apiKey, projectId, `
          SELECT DISTINCT event FROM events
          WHERE ${tsClause} AND ${scopeClause}
          ORDER BY event
          LIMIT 200
        `),
      ]);

    const totalFiltered = eventName ? Number(filteredCount) : Number(totalEvents);
    const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));

    const events = eventRows.map(([uuid, event, timestamp, distinct_id, url, browser, os, city, country]) => ({
      id: uuid || '', event: event || '', timestamp: timestamp || '', distinct_id: distinct_id || '',
      properties: { url: url || '', browser: browser || '', os: os || '', city: city || '', country: country || '' },
    }));

    sendSuccess(res, {
      clientId, domain, range, page, limit, totalPages,
      totalEvents:   Number(totalEvents),
      pageViews:     Number(pageViews),
      activeUsers:   Number(activeUsers),
      filteredCount: totalFiltered,
      events,
      eventNames: eventNameRows.map(r => r[0]).filter(Boolean),
    });
  } catch (err) {
    sendServerError(res, err, 'getClientAnalytics');
  }
}

export async function getClientCharts(req, res) {
  const clientId = req.query.clientId || '';
  const range    = req.query.range || 'last_7d';

  const host   = getPosthogHost();
  const apiKey = getApiKey();
  if (!apiKey) return sendError(res, 'POSTHOG_API_KEY not configured', 503);

  let projectId, domain;
  try {
    ({ projectId, domain } = await resolveClientContext(clientId));
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }

  const { after, before } = getDateRange(range);
  const tsClause = before
    ? `timestamp >= toDateTime('${after.slice(0, 19)}') AND timestamp < toDateTime('${before.slice(0, 19)}')`
    : `timestamp >= toDateTime('${after.slice(0, 19)}')`;

  const domainClause  = domain ? `properties.$current_url LIKE '%${domain}%'` : null;
  const scopeClause   = domainClause || '1=1';
  const pageviewScope = domainClause ? `(event = '$pageview' AND ${domainClause})` : `event = '$pageview'`;

  const hourRanges  = ['today', 'yesterday', 'last_hour', 'last_24h'];
  const granularity = hourRanges.includes(range) ? 'hour' : 'day';
  const tsGroup     = granularity === 'hour' ? 'toStartOfHour(timestamp)' : 'toDate(timestamp)';

  try {
    const [timeRows, geoRows, pageRows, eventTypeRows] = await Promise.all([
      hogqlRows(host, apiKey, projectId, `
        SELECT ${tsGroup} as t, count() as n
        FROM events
        WHERE ${tsClause} AND ${scopeClause}
        GROUP BY t ORDER BY t ASC
      `),
      hogqlRows(host, apiKey, projectId, `
        SELECT properties.$geoip_country_name as country, count() as n
        FROM events
        WHERE ${tsClause} AND ${scopeClause}
          AND isNotNull(properties.$geoip_country_name)
          AND properties.$geoip_country_name != ''
        GROUP BY country ORDER BY n DESC LIMIT 15
      `),
      hogqlRows(host, apiKey, projectId, `
        SELECT properties.$current_url as url, count() as n
        FROM events
        WHERE ${tsClause} AND ${pageviewScope}
          AND isNotNull(properties.$current_url)
          AND properties.$current_url != ''
        GROUP BY url ORDER BY n DESC LIMIT 10
      `),
      hogqlRows(host, apiKey, projectId, `
        SELECT event, count() as n
        FROM events
        WHERE ${tsClause} AND ${scopeClause}
        GROUP BY event ORDER BY n DESC LIMIT 8
      `),
    ]);

    sendSuccess(res, {
      granularity,
      timeSeries: timeRows.map(([t, n])         => ({ t: String(t),              n: Number(n) })),
      geography:  geoRows.map(([country, n])     => ({ country: country || '—',  n: Number(n) })),
      topPages:   pageRows.map(([url, n])        => ({ url: url || '',            n: Number(n) })),
      topEvents:  eventTypeRows.map(([event, n]) => ({ event: event || '',        n: Number(n) })),
    });
  } catch (err) {
    sendServerError(res, err, 'getClientCharts');
  }
}

export async function getClientEventDetail(req, res) {
  const uuid     = req.params.uuid || '';
  const clientId = req.query.clientId || '';
  if (!uuid) return sendError(res, 'Missing event uuid', 400);

  const host   = getPosthogHost();
  const apiKey = getApiKey();
  if (!apiKey) return sendError(res, 'POSTHOG_API_KEY not configured', 503);

  let projectId;
  try {
    ({ projectId } = await resolveClientContext(clientId));
  } catch (err) {
    return sendError(res, err.message, err.status || 400);
  }

  const safeUuid = uuid.replace(/[^a-f0-9-]/gi, '');
  try {
    const rows = await hogqlRows(host, apiKey, projectId, `
      SELECT uuid, event, timestamp, distinct_id, properties
      FROM events WHERE uuid = '${safeUuid}' LIMIT 1
    `);
    if (!rows.length) return sendError(res, 'Event not found', 404);
    const [id, event, timestamp, distinct_id, rawProps] = rows[0];
    let properties = {};
    try { properties = typeof rawProps === 'string' ? JSON.parse(rawProps) : (rawProps || {}); } catch { properties = {}; }
    sendSuccess(res, { id, event, timestamp, distinct_id, properties });
  } catch (err) {
    sendServerError(res, err, 'getClientEventDetail');
  }
}
