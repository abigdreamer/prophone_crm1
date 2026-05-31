import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { ieq } from '../lib/db-compat.js';

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findFirst({
    where: { email: ieq(email) },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name, userType: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function publicUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function clientLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  let clientUser = await prisma.clientUser.findUnique({
    where: { username },
    include: { client: { select: { id: true, name: true, color: true, isCanceled: true } } },
  });

  // Also allow login with email address
  if (!clientUser) {
    clientUser = await prisma.clientUser.findFirst({
      where: { email: username },
      include: { client: { select: { id: true, name: true, color: true, isCanceled: true } } },
    });
  }

  if (!clientUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!clientUser.isActive) {
    return res.status(403).json({ error: 'Account is disabled. Contact your administrator.' });
  }

  if (clientUser.client.isCanceled) {
    return res.status(403).json({ error: 'Your company account is inactive.' });
  }

  const valid = await bcrypt.compare(password, clientUser.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: clientUser.id,
      username: clientUser.username,
      name: clientUser.name,
      email: clientUser.email,
      role: clientUser.role,
      clientId: clientUser.clientId,
      clientName: clientUser.client.name,
      userType: 'client',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: clientUser.id,
      name: clientUser.name,
      email: clientUser.email,
      username: clientUser.username,
      role: clientUser.role,
      clientId: clientUser.clientId,
      clientName: clientUser.client.name,
      clientColor: clientUser.client.color,
      userType: 'client',
    },
  });
}

async function clientMe(req, res) {
  const clientUser = await prisma.clientUser.findUnique({
    where: { id: req.clientUser.userId },
    include: { client: { select: { id: true, name: true, color: true, domain: true, industry: true, plan: true } } },
  });
  if (!clientUser) return res.status(404).json({ error: 'User not found' });
  const { password: _pw, ...safe } = clientUser;
  res.json({ ...safe, userType: 'client' });
}

export { login, me, publicUsers, clientLogin, clientMe };
