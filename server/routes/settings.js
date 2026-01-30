const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { validateLogin, validateSettings, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { encrypt, decrypt } = require('../utils/crypto');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const logger = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Stricter rate limiter for login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Fields that should be encrypted at rest
const SENSITIVE_FIELDS = ['api_key', 'api_secret', 'password'];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Login endpoint
router.post('/login', loginLimiter, validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Sanitize inputs
  const sanitizedUsername = sanitizeInput(username);

  const user = await dbGet('SELECT * FROM users WHERE username = ?', [sanitizedUsername]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    logger.warn('Failed login attempt', { username: sanitizedUsername, ip: req.ip });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '24h'
  });

  res.json({ token });
}));

// Get all settings
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const settings = await dbAll(
    'SELECT service, api_key, api_secret, base_url, username FROM settings'
  );

  // Decrypt sensitive fields before sending
  const decryptedSettings = settings.map(setting => ({
    ...setting,
    api_key: decrypt(setting.api_key),
    api_secret: decrypt(setting.api_secret),
  }));

  res.json(decryptedSettings);
}));

// Update or create setting
router.post('/', authenticateToken, validateSettings, asyncHandler(async (req, res) => {
  const { service, api_key, api_secret, base_url, username, password } = req.body;

  // Sanitize inputs
  const sanitizedData = {
    service: sanitizeInput(service),
    api_key: encrypt(sanitizeInput(api_key)),
    api_secret: encrypt(sanitizeInput(api_secret)),
    base_url: sanitizeInput(base_url),
    username: sanitizeInput(username),
    password: encrypt(password) // Encrypt password at rest
  };

  const query = `
    INSERT OR REPLACE INTO settings (service, api_key, api_secret, base_url, username, password, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  await dbRun(query, [
    sanitizedData.service,
    sanitizedData.api_key,
    sanitizedData.api_secret,
    sanitizedData.base_url,
    sanitizedData.username,
    sanitizedData.password
  ]);

  res.json({ message: 'Setting updated successfully' });
}));

// Delete setting
router.delete('/:service', authenticateToken, asyncHandler(async (req, res) => {
  const { service } = req.params;
  const sanitizedService = sanitizeInput(service);

  await dbRun('DELETE FROM settings WHERE service = ?', [sanitizedService]);
  res.json({ message: 'Setting deleted successfully' });
}));

module.exports = router;
