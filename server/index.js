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
import { startEmailWorker } from './workers/emailWorker.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
// Webhook route must receive raw body — mount BEFORE express.json()
app.use('/api/webhooks', webhookRoutes);
app.use(express.json());

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
