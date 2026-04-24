import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { signToken } from '../middleware/auth.js';
import { tenantWhere, canAccessTenant } from '../lib/tenant.js';

// Public — returns one user per role (super_admin, admin, manager) for the quick-login picker.
// No passwords or sensitive data returned.
export async function quickUsers(req, res) {
  try {
    const roles = ['super_admin', 'admin', 'manager'];
    const results = await Promise.all(
      roles.map(role =>
        prisma.user.findFirst({
          where: { role },
          select: { id: true, name: true, email: true, role: true, avatar: true, color: true },
          orderBy: { created_at: 'asc' },
        })
      )
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where:   { email: { equals: email, mode: 'insensitive' } },
      include: { company: { select: { name: true, plan: true } } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id:           user.id,
      email:        user.email,
      name:         user.name,
      role:         user.role,
      avatar:       user.avatar,
      color:        user.color,
      prophone_id:  user.prophone_id,   // null for super_admin
      company_name: user.company?.name || '',
      plan:         user.company?.plan || '',
    };

    res.json({ user: payload, token: signToken(payload) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// List users — scoped to caller's company; super_admin sees all (or filtered via ?prophone_id=)
export async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: tenantWhere(req),
      select: { id: true, prophone_id: true, email: true, name: true, role: true, avatar: true, color: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create user
// - super_admin role  → prophone_id must be null (global user, no company)
// - admin / rep role  → prophone_id is required
//   · super_admin caller can supply any prophone_id in the body
//   · admin caller always creates within their own company
export async function createUser(req, res) {
  const { email, password, name, role = 'rep', avatar, color, prophone_id } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can create super admin accounts' });
  }

  let targetTenant;
  if (role === 'super_admin') {
    // Super admins are global — they must not be tied to any company.
    targetTenant = null;
  } else if (req.user.role === 'super_admin') {
    // Super admin creating an admin/rep must specify which company they belong to.
    if (!prophone_id) {
      return res.status(400).json({ error: 'prophone_id is required when creating admin or rep users' });
    }
    targetTenant = prophone_id;
  } else {
    // Admin creating a user within their own company.
    targetTenant = req.user.prophone_id;
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        prophone_id: targetTenant,
        email,
        password:    hashed,
        name,
        role,
        avatar: avatar || name.split(' ').map(w => w[0]).join('').toUpperCase(),
        color:  color  || '#6366f1',
      },
      select: { id: true, prophone_id: true, email: true, name: true, role: true, avatar: true, color: true, created_at: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Update user — admin can update within their own company; super_admin can update anyone
export async function updateUser(req, res) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canAccessTenant(req, target.prophone_id)) return res.status(403).json({ error: 'Forbidden' });

    const { name, role, avatar, color, password } = req.body;

    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can assign the super admin role' });
    }

    const data = {};
    if (name   !== undefined) data.name   = name;
    if (role   !== undefined) data.role   = role;
    if (avatar !== undefined) data.avatar = avatar;
    if (color  !== undefined) data.color  = color;
    if (password) data.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, prophone_id: true, email: true, name: true, role: true, avatar: true, color: true, created_at: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete user — admin can delete within their own company; super_admin can delete anyone
export async function deleteUser(req, res) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canAccessTenant(req, target.prophone_id)) return res.status(403).json({ error: 'Forbidden' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
