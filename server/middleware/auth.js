import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'prophone-secret-change-me';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}
