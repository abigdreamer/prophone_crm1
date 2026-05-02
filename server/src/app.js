require('dotenv').config();
// Force IPv4 DNS — prevents timeouts on systems where IPv6 is unavailable
require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth.routes');
const usersRoutes    = require('./routes/users.routes');
const clientsRoutes  = require('./routes/clients.routes');
const contactsRoutes = require('./routes/contacts.routes');
const domainsRoutes  = require('./routes/domains.routes');
const { handleWebhook } = require('./controllers/domains.controller');
const asyncHandler   = require('./utils/asyncHandler');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhook must receive raw body for signature verification — mount BEFORE express.json()
app.post('/webhooks/resend', express.raw({ type: 'application/json' }), asyncHandler(handleWebhook));

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth',     authRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/clients',  clientsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/domains',  domainsRoutes);

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}`);
  console.error(err.stack || err.message || err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const prisma = require('./lib/prisma');

const PORT   = process.env.PORT || 8080;
const server = app.listen(PORT, () => console.log(`ProPhone API listening on port ${PORT}`));

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
