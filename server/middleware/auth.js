const jwt = require('jsonwebtoken');

// Use env secret or fallback to the same development fallback used during login
const JWT_SECRET = process.env.JWT_SECRET || 'dev-temporary-secret';
if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET not set — using fallback in middleware (dev only)');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.warn('Auth middleware: missing or invalid Authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    console.error('Auth middleware token verify error:', err && err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
