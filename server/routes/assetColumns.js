const express = require('express');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/errorHandler');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const logger = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

const validateColumns = (req, res, next) => {
  const { columns } = req.body;

  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'columns must be an array' });
  }

  const errors = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (!col.key || typeof col.key !== 'string') {
      errors.push(`Column at index ${i}: key is required and must be a string`);
    }
    if (!col.label || typeof col.label !== 'string') {
      errors.push(`Column at index ${i}: label is required and must be a string`);
    }
    if (typeof col.visible !== 'boolean') {
      errors.push(`Column at index ${i}: visible must be a boolean`);
    }
    if (typeof col.sortOrder !== 'number') {
      errors.push(`Column at index ${i}: sortOrder must be a number`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
};

const DEFAULT_COLUMNS = [
  { key: 'name', label: 'Name', order: 0 },
  { key: 'hostName', label: 'Host', order: 1 },
  { key: 'loggedInUser', label: 'Last Logged In By', order: 2 },
  { key: 'platform', label: 'Platform', order: 3 },
  { key: 'status', label: 'Status', order: 4 },
  { key: 'patchStatus', label: 'Patch Status', order: 5 },
  { key: 'lastCommunicatedTime', label: 'Last Seen', order: 6 },
  { key: 'assetClass', label: 'Asset Class', order: 7 },
  { key: 'client', label: 'Client', order: 8 },
  { key: 'site', label: 'Site', order: 9 },
  { key: 'serialNumber', label: 'Serial Number', order: 10 },
  { key: 'manufacturer', label: 'Manufacturer', order: 11 },
  { key: 'model', label: 'Model', order: 12 }
];

async function ensureUserColumns(userId) {
  const existing = await dbAll(
    'SELECT column_key FROM asset_column_config WHERE user_id = ?',
    [userId]
  );
  
  const existingKeys = new Set(existing.map(col => col.column_key));
  const missing = DEFAULT_COLUMNS.filter(col => !existingKeys.has(col.key));
  
  for (const col of missing) {
    await dbRun(
      'INSERT INTO asset_column_config (user_id, column_key, column_label, visible, sort_order) VALUES (?, ?, ?, ?, ?)',
      [userId, col.key, col.label, col.order < 7, col.order]
    );
  }
}

router.get('/columns', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.query.userId || req.user.id;
  
  await ensureUserColumns(userId);
  
  const columns = await dbAll(
    'SELECT column_key, column_label, visible, sort_order FROM asset_column_config WHERE user_id = ? ORDER BY sort_order',
    [userId]
  );
  
  res.json(columns);
}));

router.post('/columns', authenticateToken, validateColumns, asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user.id;
  const { columns } = req.body;
  
  if (!userId || !Array.isArray(columns)) {
    return res.status(400).json({ error: 'userId and columns array are required' });
  }
  
  for (const col of columns) {
    await dbRun(
      `INSERT INTO asset_column_config (user_id, column_key, column_label, visible, sort_order) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       column_label = VALUES(column_label), 
       visible = VALUES(visible), 
       sort_order = VALUES(sort_order),
       updated_at = CURRENT_TIMESTAMP`,
      [userId, col.key, col.label, col.visible, col.sortOrder]
    );
  }
  
  logger.info(`Asset column config updated for user ${userId}`);
  res.json({ success: true });
}));

router.post('/columns/reset', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user.id;
  
  await dbRun('DELETE FROM asset_column_config WHERE user_id = ?', [userId]);
  
  for (const col of DEFAULT_COLUMNS) {
    await dbRun(
      'INSERT INTO asset_column_config (user_id, column_key, column_label, visible, sort_order) VALUES (?, ?, ?, ?, ?)',
      [userId, col.key, col.label, col.order < 7, col.order]
    );
  }
  
  logger.info(`Asset column config reset to defaults for user ${userId}`);
  res.json({ success: true });
}));

module.exports = router;
