import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

async function listClientUsers(req, res) {
  const { clientId } = req.params;
  const users = await prisma.clientUser.findMany({
    where: { clientId },
    select: { id: true, name: true, email: true, username: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
}

async function createClientUser(req, res) {
  const { clientId } = req.params;
  const { name, email, username, password, role = 'viewer' } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username, and password are required' });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const existing = await prisma.clientUser.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.clientUser.create({
    data: { clientId, name, email: email || null, username, password: hashed, role },
    select: { id: true, clientId: true, name: true, email: true, username: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json(user);
}

async function updateClientUser(req, res) {
  const { clientId, userId } = req.params;
  const { name, email, username, password, role, isActive } = req.body;

  const user = await prisma.clientUser.findFirst({ where: { id: userId, clientId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username) {
    const taken = await prisma.clientUser.findUnique({ where: { username } });
    if (taken) return res.status(409).json({ error: 'Username already taken' });
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email || null;
  if (username !== undefined) data.username = username;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 10);

  const updated = await prisma.clientUser.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, username: true, role: true, isActive: true, createdAt: true },
  });

  res.json(updated);
}

async function deleteClientUser(req, res) {
  const { clientId, userId } = req.params;
  const user = await prisma.clientUser.findFirst({ where: { id: userId, clientId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await prisma.clientUser.delete({ where: { id: userId } });
  res.json({ ok: true });
}

export { listClientUsers, createClientUser, updateClientUser, deleteClientUser };
