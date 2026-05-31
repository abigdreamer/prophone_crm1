import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function getUser(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

async function createUser(req, res) {
  const { name, email, password, role = 'Rep', color = '#6366f1' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const id = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { id, name, email, password: hashed, role, color },
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true, createdAt: true },
  });
  res.status(201).json(user);
}

async function updateUser(req, res) {
  const { name, email, role, color, password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (email && email !== user.email) {
    const taken = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: user.id } } });
    if (taken) return res.status(409).json({ error: 'Email already in use' });
  }

  const data = {};
  if (name  !== undefined) data.name  = name;
  if (email !== undefined) data.email = email;
  if (role  !== undefined) data.role  = role;
  if (color !== undefined) data.color = color;
  if (password) data.password = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, avatar: true, color: true, createdAt: true },
  });
  res.json(updated);
}

async function deleteUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}

// All client portal users across all clients — for admin overview
async function listAllPortalUsers(req, res) {
  const users = await prisma.clientUser.findMany({
    include: { client: { select: { id: true, name: true, color: true } } },
    orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
  });
  const safe = users.map(({ password: _pw, ...u }) => u);
  res.json(safe);
}

export { listUsers, getUser, createUser, updateUser, deleteUser, listAllPortalUsers };
