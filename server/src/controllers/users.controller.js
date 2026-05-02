const prisma = require('../lib/prisma');

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

module.exports = { listUsers, getUser };
