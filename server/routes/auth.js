const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Use env secret or a temporary fallback to avoid runtime crash if not set
const JWT_SECRET = process.env.JWT_SECRET || 'dev-temporary-secret';
if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET not set — using fallback (dev only)');

router.post('/login', async (req, res) => {
  try {
    console.log('POST /api/auth/login', { body: req.body });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ token, email: admin.email });
  } catch (err) {
    console.error('Auth login error:', err);
    // Return the actual error message temporarily for debugging
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/verify', require('../middleware/auth'), (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
