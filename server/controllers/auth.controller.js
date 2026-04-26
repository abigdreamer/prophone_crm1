import { tenantWhere, canAccessTenant } from '../lib/tenant.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { validateCredentials, buildTokenPayload, issueToken, hashPassword } from '../services/authService.js';
import * as userRepo    from '../repositories/userRepository.js';
import * as companyRepo from '../repositories/companyRepository.js';

export async function quickUsers(req, res) {
  try {
    const users = await userRepo.findQuickUsers();
    sendSuccess(res, users);
  } catch (err) {
    sendServerError(res, err, 'quickUsers');
  }
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return sendError(res, 'Email and password are required', 400);

  try {
    const user = await validateCredentials(email, password);
    if (!user) return sendError(res, 'Invalid credentials', 401);

    const payload = buildTokenPayload(user);
    sendSuccess(res, { user: payload, token: issueToken(payload) });
  } catch (err) {
    sendServerError(res, err, 'login');
  }
}

export async function getUsers(req, res) {
  try {
    const users = await userRepo.findMany(tenantWhere(req));
    sendSuccess(res, users);
  } catch (err) {
    sendServerError(res, err, 'getUsers');
  }
}

export async function createUser(req, res) {
  const { email, password, name, role = 'rep', avatar, color, prophone_id } = req.body ?? {};

  if (!email || !password || !name) {
    return sendError(res, 'email, password, and name are required', 400);
  }
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return sendError(res, 'Admin access required', 403);
  }
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return sendError(res, 'Only super admins can create super admin accounts', 403);
  }

  let targetTenant;
  if (role === 'super_admin') {
    targetTenant = null;
  } else if (req.user.role === 'super_admin') {
    if (!prophone_id) return sendError(res, 'prophone_id is required when creating admin or rep users', 400);
    targetTenant = prophone_id;
  } else {
    targetTenant = req.user.prophone_id;
  }

  try {
    const hashed = await hashPassword(password);
    const user = await userRepo.createUser({
      prophone_id: targetTenant,
      email,
      password:    hashed,
      name,
      role,
      avatar: avatar || name.split(' ').map(w => w[0]).join('').toUpperCase(),
      color:  color  || '#6366f1',
    });
    sendSuccess(res, user, 201);
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 'Email already exists', 409);
    sendServerError(res, err, 'createUser');
  }
}

export async function updateUser(req, res) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return sendError(res, 'Admin access required', 403);
  }

  try {
    const target = await userRepo.findById(req.params.id);
    if (!target) return sendError(res, 'User not found', 404);
    if (!canAccessTenant(req, target.prophone_id)) return sendError(res, 'Forbidden', 403);

    const { name, role, avatar, color, password } = req.body ?? {};
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return sendError(res, 'Only super admins can assign the super admin role', 403);
    }

    const data = {};
    if (name     !== undefined) data.name   = name;
    if (role     !== undefined) data.role   = role;
    if (avatar   !== undefined) data.avatar = avatar;
    if (color    !== undefined) data.color  = color;
    if (password)               data.password = await hashPassword(password);

    const user = await userRepo.updateUser(req.params.id, data);
    sendSuccess(res, user);
  } catch (err) {
    sendServerError(res, err, 'updateUser');
  }
}

export async function deleteUser(req, res) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return sendError(res, 'Admin access required', 403);
  }

  try {
    const target = await userRepo.findById(req.params.id);
    if (!target) return sendError(res, 'User not found', 404);
    if (!canAccessTenant(req, target.prophone_id)) return sendError(res, 'Forbidden', 403);
    if (target.id === req.user.id) return sendError(res, 'Cannot delete your own account', 400);

    await userRepo.removeUser(req.params.id);
    sendSuccess(res, { ok: true });
  } catch (err) {
    sendServerError(res, err, 'deleteUser');
  }
}

export async function getCompanies(req, res) {
  try {
    const companies = await companyRepo.findAllSummary();
    sendSuccess(res, companies);
  } catch (err) {
    sendServerError(res, err, 'getCompanies');
  }
}

export async function selectCompany(req, res) {
  const { prophone_id } = req.body ?? {};
  try {
    const { iat, exp, ...base } = req.user;

    if (!prophone_id) {
      const payload = { ...base, prophone_id: null, company_name: '', plan: '' };
      return sendSuccess(res, { token: issueToken(payload), user: payload });
    }

    const company = await companyRepo.findByPhoneId(prophone_id);
    if (!company) return sendError(res, 'Company not found', 404);

    const payload = { ...base, prophone_id, company_name: company.name, plan: company.plan };
    sendSuccess(res, { token: issueToken(payload), user: payload });
  } catch (err) {
    sendServerError(res, err, 'selectCompany');
  }
}
