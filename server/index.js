import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes          from './routes/auth.routes.js';
import contactRoutes       from './routes/contacts.routes.js';
import emailTemplateRoutes from './routes/emailTemplates.routes.js';
import companyRoutes       from './routes/companies.routes.js';
import campaignRoutes      from './routes/campaigns.routes.js';
import domainRoutes        from './routes/domains.routes.js';
import groupRoutes         from './routes/groups.routes.js';
import webhookRoutes       from './routes/webhooks.routes.js';
import trackingRoutes      from './routes/tracking.routes.js';
import emailTrackingRoutes from './routes/emailTracking.routes.js';
import sseRoutes           from './routes/sse.routes.js';
import { startEmailWorker } from './workers/emailWorker.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.status(200).json({
    version: "v1",
    message: "Welcome to Prophone CRM API"
  });
});

app.use(cors());
// Webhook route must receive raw body — mount BEFORE express.json()
app.use('/api/webhooks', webhookRoutes);
// Tracking routes — no auth required (email clients call these)
app.use('/api/track',    trackingRoutes);
app.use('/email/track',  emailTrackingRoutes);
// SSE — long-lived connections, no body needed
app.use('/api/sse', sseRoutes);
app.use(express.json({ limit: '15mb' }));

app.use('/api',                 authRoutes);
app.use('/api/contacts',        contactRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/companies',       companyRoutes);
app.use('/api/campaigns',       campaignRoutes);
app.use('/api/domains',         domainRoutes);
app.use('/api/groups',          groupRoutes);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  startEmailWorker();
});
