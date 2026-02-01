const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { validateLogin, validateSettings, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { encrypt, decrypt } = require('../utils/crypto');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const { testServiceConnection } = require('../services/connectionTester');
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

  const sanitizedService = sanitizeInput(service);

  // Check if this service already exists so we can preserve blank sensitive fields
  const existing = await dbGet(
    'SELECT api_key, api_secret, password FROM settings WHERE service = ?',
    [sanitizedService]
  );

  // For NEW settings that require a password, enforce it here (after the DB lookup).
  // Edits are fine — the existing password is preserved from the DB.
  const passwordServices = ['proxmox', 'smtp'];
  if (!existing && passwordServices.includes(sanitizedService) && !password) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [`Password is required for new ${sanitizedService} configuration`]
    });
  }

  // For sensitive fields: if the incoming value is empty/blank, keep the existing DB value
  // Trim password to handle whitespace, then check if it has actual content
  const trimmedPassword = typeof password === 'string' ? password.trim() : password;
  const hasPassword = trimmedPassword && trimmedPassword.length > 0;
  
  const sanitizedData = {
    service: sanitizedService,
    api_key: api_key ? encrypt(sanitizeInput(api_key)) : (existing?.api_key || encrypt('')),
    api_secret: api_secret ? encrypt(sanitizeInput(api_secret)) : (existing?.api_secret || encrypt('')),
    base_url: sanitizeInput(base_url),
    username: sanitizeInput(username),
    password: hasPassword ? encrypt(trimmedPassword) : (existing?.password || encrypt('')),
  };


  const query = `
    INSERT INTO settings (service, api_key, api_secret, base_url, username, password, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE
    api_key = VALUES(api_key),
    api_secret = VALUES(api_secret),
    base_url = VALUES(base_url),
    username = VALUES(username),
    password = VALUES(password),
    updated_at = CURRENT_TIMESTAMP
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

// Test service connection
router.post('/test/:service', authenticateToken, asyncHandler(async (req, res) => {
  const { service } = req.params;

  const setting = await dbGet(
    'SELECT service, api_key, api_secret, base_url, username, password FROM settings WHERE service = ?',
    [service]
  );

  if (!setting) {
    return res.json({ success: false, message: `No configuration found for ${service}.` });
  }

  const config = {
    ...setting,
    api_key: decrypt(setting.api_key),
    api_secret: decrypt(setting.api_secret),
    password: decrypt(setting.password)
  };

  const OUTER_TIMEOUT = 8000;

  try {
    const result = await Promise.race([
      testServiceConnection(service, config),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection test timed out after 8 seconds.')), OUTER_TIMEOUT)
      )
    ]);
    res.json(result);
  } catch (err) {
    let message = err.message || 'Connection test failed.';

    if (err.code === 'ECONNREFUSED') {
      message = `Connection refused. Verify the service is running and the URL is correct.`;
    } else if (err.code === 'ENOTFOUND') {
      message = `Host not found. Check the base URL for typos.`;
    } else if (err.code === 'ECONNABORTED') {
      message = `Connection timed out. The service may be slow or unreachable.`;
    } else if (err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        message = `Authentication failed (HTTP ${status}). Check your API key or credentials.`;
      } else {
        message = `Service returned HTTP ${status}.`;
      }
    }

    res.json({ success: false, message });
  }
}));

// Delete setting
router.delete('/:service', authenticateToken, asyncHandler(async (req, res) => {
  const { service } = req.params;
  const sanitizedService = sanitizeInput(service);

  await dbRun('DELETE FROM settings WHERE service = ?', [sanitizedService]);
  res.json({ message: 'Setting deleted successfully' });
}));

module.exports = router;
