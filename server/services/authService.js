import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';
import * as userRepo from '../repositories/userRepository.js';

export async function validateCredentials(email, password) {
  const user = await userRepo.findByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  return valid ? user : null;
}

export function buildTokenPayload(user) {
  return {
    id:           user.id,
    email:        user.email,
    name:         user.name,
    role:         user.role,
    avatar:       user.avatar,
    color:        user.color,
    prophone_id:  user.prophone_id,
    company_name: user.company?.name || '',
    plan:         user.company?.plan || '',
  };
}

export function issueToken(payload) {
  return signToken(payload);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
