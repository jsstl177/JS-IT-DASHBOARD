const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { validateLogin, validateSettings, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Sanitize inputs
  const sanitizedUsername = sanitizeInput(username);

  const user = await getUserByUsername(sanitizedUsername);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '24h'
  });

  res.json({ token });
}));

// Get all settings
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const settings = await getAllSettings();
  res.json(settings);
}));

// Update or create setting
router.post('/', authenticateToken, validateSettings, asyncHandler(async (req, res) => {
  const { service, api_key, api_secret, base_url, username, password } = req.body;

  // Sanitize inputs
  const sanitizedData = {
    service: sanitizeInput(service),
    api_key: sanitizeInput(api_key),
    api_secret: sanitizeInput(api_secret),
    base_url: sanitizeInput(base_url),
    username: sanitizeInput(username),
    password: password // Don't sanitize password
  };

  await upsertSetting(sanitizedData);
  res.json({ message: 'Setting updated successfully' });
}));

// Delete setting
router.delete('/:service', authenticateToken, asyncHandler(async (req, res) => {
  const { service } = req.params;
  const sanitizedService = sanitizeInput(service);

  await deleteSetting(sanitizedService);
  res.json({ message: 'Setting deleted successfully' });
}));

// Helper functions for database operations
function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT service, api_key, api_secret, base_url, username FROM settings', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function upsertSetting({ service, api_key, api_secret, base_url, username, password }) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO settings (service, api_key, api_secret, base_url, username, password, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(query, [service, api_key, api_secret, base_url, username, password], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function deleteSetting(service) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM settings WHERE service = ?', [service], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = router;