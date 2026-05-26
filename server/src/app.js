import 'dotenv/config';
import dns from 'dns';
// Router DNS (192.168.x.x) often fails to resolve external APIs like api.resend.com.
// Force Node.js to use Google/Cloudflare DNS directly so all outbound SDK calls work.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';

import authRoutes          from './routes/auth.routes.js';
import usersRoutes         from './routes/users.routes.js';
import clientsRoutes       from './routes/clients.routes.js';
import contactsRoutes      from './routes/contacts.routes.js';
import domainsRoutes       from './routes/domains.routes.js';
import emailTemplateRoutes from './routes/emailTemplates.routes.js';
import interactiveRoutes   from './routes/interactive.routes.js';
import campaignRoutes      from './routes/campaigns.routes.js';
import emailRoutes         from './routes/email.routes.js';
import scoringRulesRoutes  from './routes/scoringRules.routes.js';
import templateLinksRoutes from './routes/templateLinks.routes.js';
import settingsRoutes          from './routes/settings.routes.js';
import reportsRoutes           from './routes/reports.routes.js';
import posthogProjectsRoutes   from './routes/posthogProjects.routes.js';
import redditRoutes            from './routes/reddit.routes.js';

import { handleWebhook }                         from './controllers/domains.controller.js';
import { servePage, handleRespond }              from './controllers/interactive.controller.js';
import asyncHandler                              from './utils/asyncHandler.js';
import prisma                                    from './lib/prisma.js';
import { updateDomainTracking }                 from './services/domainService.js';
import { startRedditPoller }                    from './jobs/redditPoller.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhook must receive raw body for signature verification — mount BEFORE express.json()
app.post('/webhooks/resend', express.raw({ type: 'application/json' }), asyncHandler(handleWebhook));

app.use(express.json({ limit: '10mb' }));

// Bypass ngrok browser warning for all requests
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Public interactive pages — no auth, served as HTML
app.get('/i/:token',          asyncHandler(servePage));
app.post('/i/:token/respond', asyncHandler(handleRespond));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth',                authRoutes);
app.use('/api/users',               usersRoutes);
app.use('/api/clients',             clientsRoutes);
app.use('/api/contacts',            contactsRoutes);
app.use('/api/domains',             domainsRoutes);
app.use('/api/email-templates',     emailTemplateRoutes);
app.use('/api/interactive/sessions', interactiveRoutes);
app.use('/api/campaigns',           campaignRoutes);
app.use('/api/email',               emailRoutes);
app.use('/api/scoring-rules',       scoringRulesRoutes);
app.use('/api/tl',                  templateLinksRoutes);
app.use('/api/settings',            settingsRoutes);
app.use('/api/reports',             reportsRoutes);
app.use('/api/posthog-projects',    posthogProjectsRoutes);
app.use('/api/reddit',              redditRoutes);

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}`);
  console.error(err.stack || err.message || err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

async function disableResendTrackingForAllDomains() {
  try {
    const domains = await prisma.domain.findMany({
      where: { status: 'verified', isCanceled: false },
    });
    for (const d of domains) {
      if (!d.resendDomainId) continue;
      try {
        await updateDomainTracking(d.resendDomainId, {
          clickTracking:     false,
          openTracking:      false,
          trackingSubdomain: null,
        });
        console.log(`[startup] Disabled Resend tracking for ${d.domainName}`);
      } catch (err) {
        console.warn(`[startup] Could not disable Resend tracking for ${d.domainName}:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[startup] disableResendTrackingForAllDomains failed:', err.message);
  }
}

const PORT   = process.env.PORT || 8040;
const server = app.listen(PORT, () => {
  console.log(`ProPhone API listening on port ${PORT}`);
  // Immediately remove Resend's own click/open tracking from all verified domains.
  // ProPhone rewrites links with its own tracking pixel — Resend's layer double-wraps them,
  // and if the Resend tracking subdomain (e.g. track.foxtow.com) has no DNS record the link breaks.
  disableResendTrackingForAllDomains();
  startRedditPoller();
});

let _bindRetry = false;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (!_bindRetry) {
      _bindRetry = true;
      setTimeout(() => server.listen(PORT), 1000);
    } else {
      console.error(`\nPort ${PORT} is still in use. Run: kill $(lsof -ti :${PORT})\n`);
      process.exit(1);
    }
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing server`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});
