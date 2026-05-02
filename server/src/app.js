require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth.routes');
const usersRoutes    = require('./routes/users.routes');
const clientsRoutes  = require('./routes/clients.routes');
const contactsRoutes = require('./routes/contacts.routes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth',     authRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/clients',  clientsRoutes);
app.use('/api/contacts', contactsRoutes);

app.use((err, req, res, _next) => {
  console.error(err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const prisma = require('./lib/prisma');

const PORT   = process.env.PORT || 8080;
const server = app.listen(PORT, () => console.log(`ProPhone API listening on port ${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use — retrying in 1s`);
    setTimeout(() => server.listen(PORT), 1000);
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
  console.error('Unhandled rejection:', reason);
});
