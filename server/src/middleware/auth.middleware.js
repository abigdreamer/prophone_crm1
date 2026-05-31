import jwt from 'jsonwebtoken';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Block client portal users from accessing admin-only routes
    if (payload.userType === 'client') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware for client portal routes — only accepts client user tokens
function requireClientAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.userType !== 'client') {
      return res.status(403).json({ error: 'Client portal access only' });
    }
    req.clientUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware for routes accessible by both admins and client users
function requireAnyAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.userType === 'client') {
      req.clientUser = payload;
    } else {
      req.user = payload;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default requireAuth;
export { requireClientAuth, requireAnyAuth };
