import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes          from './routes/auth.routes.js';
import contactRoutes       from './routes/contacts.routes.js';
import emailTemplateRoutes from './routes/emailTemplates.routes.js';
import companyRoutes       from './routes/companies.routes.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/api',                 authRoutes);
app.use('/api/contacts',        contactRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/companies',       companyRoutes);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
