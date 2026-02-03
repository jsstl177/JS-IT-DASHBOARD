const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { validateUserCreate, validateUserUpdate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const logger = require('../utils/logger');

const router = express.Router();

// JWT secret from environment (same as settings)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Import authentication middleware from settings route
const authenticateToken = (req, res, next) => {
  const jwt = require('jsonwebtoken');
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

// Check if user is admin
const requireAdmin = async (req, res, next) => {
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || user.username !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const users = await dbAll(
    'SELECT id, username, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
}));

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, validateUserCreate, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const sanitizedUsername = sanitizeInput(username);

  // Check if username already exists
  const existingUser = await dbGet('SELECT * FROM users WHERE username = ?', [sanitizedUsername]);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert new user
  const result = await dbRun(
    'INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [sanitizedUsername, passwordHash]
  );

  logger.info('New user created', { userId: result.insertId, username: sanitizedUsername, createdBy: req.user.id });
  res.status(201).json({ 
    id: result.insertId, 
    username: sanitizedUsername, 
    message: 'User created successfully' 
  });
}));

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateUserUpdate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  const sanitizedUsername = username ? sanitizeInput(username) : null;

  // Check if user exists
  const existingUser = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  if (!existingUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent editing the admin username
  if (existingUser.username === 'admin' && sanitizedUsername && sanitizedUsername !== 'admin') {
    return res.status(403).json({ error: 'Cannot change admin username' });
  }

  // Check if new username already exists (if changing username)
  if (sanitizedUsername && sanitizedUsername !== existingUser.username) {
    const duplicateUser = await dbGet('SELECT * FROM users WHERE username = ? AND id != ?', [sanitizedUsername, id]);
    if (duplicateUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  // Build update query
  let updates = [];
  let params = [];

  if (sanitizedUsername) {
    updates.push('username = ?');
    params.push(sanitizedUsername);
  }

  if (password && password.length > 0) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  await dbRun(query, params);

  logger.info('User updated', { userId: id, updatedBy: req.user.id });
  res.json({ message: 'User updated successfully' });
}));

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent deleting the admin user
  if (user.username === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin user' });
  }

  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  await dbRun('DELETE FROM users WHERE id = ?', [id]);

  logger.info('User deleted', { userId: id, username: user.username, deletedBy: req.user.id });
  res.json({ message: 'User deleted successfully' });
}));

module.exports = router;