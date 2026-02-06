/**
 * @fileoverview Database initialization and connection pool for MariaDB.
 *
 * Creates a connection pool on require() and asynchronously initializes
 * all database tables, runs migrations, seeds default data (admin user,
 * default asset columns, PowerBI config), then exports the pool.
 *
 * @requires mysql2/promise
 * @requires bcryptjs
 * @requires dotenv
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('./utils/logger');

// ─── Connection Pool Configuration ──────────────────────────────────────────

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool is created synchronously so it can be exported immediately.
// Actual connections are established lazily on first query.
const pool = mysql.createPool(dbConfig);

// ─── Table Definitions ──────────────────────────────────────────────────────

/**
 * SQL statements for creating all application tables.
 * Uses CREATE TABLE IF NOT EXISTS for idempotent initialization.
 */
const TABLE_DEFINITIONS = [
  // Service configuration storage (API keys, URLs, credentials)
  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service VARCHAR(255) UNIQUE,
    api_key TEXT,
    api_secret TEXT,
    base_url TEXT,
    username VARCHAR(255),
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // User accounts with bcrypt-hashed passwords
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Employee onboarding checklists (one per new hire)
  `CREATE TABLE IF NOT EXISTS employee_setup_checklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_email VARCHAR(255),
    store_number VARCHAR(255),
    ticket_id VARCHAR(255),
    department VARCHAR(255),
    start_date DATE,
    status VARCHAR(255) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Individual checklist items linked to an employee checklist
  `CREATE TABLE IF NOT EXISTS checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT,
    category VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(255) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES employee_setup_checklist (id) ON DELETE CASCADE
  )`,

  // Per-user asset table column visibility and ordering
  `CREATE TABLE IF NOT EXISTS asset_column_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    column_key VARCHAR(255) NOT NULL,
    column_label VARCHAR(255) NOT NULL,
    visible BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_column (user_id, column_key),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`,

  // Per-user custom quick-access links
  `CREATE TABLE IF NOT EXISTS custom_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user_sort (user_id, sort_order)
  )`
];

// ─── Schema Migrations ──────────────────────────────────────────────────────

/**
 * Runs safe ALTER TABLE migrations. Uses IF NOT EXISTS where supported
 * by MariaDB. Failures are logged but do not halt startup.
 */
async function runMigrations() {
  const migrations = [
    {
      description: 'Add updated_at column to users table',
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    },
    {
      description: 'Add start_date column to employee_setup_checklist',
      sql: `ALTER TABLE employee_setup_checklist ADD COLUMN IF NOT EXISTS start_date DATE`
    }
  ];

  for (const migration of migrations) {
    try {
      await pool.execute(migration.sql);
    } catch (err) {
      // Column may already exist; this is expected
      logger.info(`Migration note: ${migration.description} - ${err.message}`);
    }
  }
}

// ─── Default Data Seeding ───────────────────────────────────────────────────

/**
 * Initializes default asset column configuration for a given user.
 * Only inserts if no columns exist yet for that user.
 *
 * @param {number} userId - The user ID to initialize columns for
 */
async function initializeDefaultAssetColumns(userId) {
  try {
    const existing = await pool.execute(
      'SELECT COUNT(*) as count FROM asset_column_config WHERE user_id = ?',
      [userId]
    );

    if (existing[0][0].count > 0) {
      return; // Already initialized
    }

    const defaultColumns = [
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

    for (const col of defaultColumns) {
      await pool.execute(
        'INSERT INTO asset_column_config (user_id, column_key, column_label, visible, sort_order) VALUES (?, ?, ?, ?, ?)',
        [userId, col.key, col.label, col.order < 7, col.order]
      );
    }

    logger.info('Default asset columns initialized successfully.');
  } catch (err) {
    logger.warn('Warning: Failed to initialize default asset columns:', { error: err.message });
  }
}

// ─── Database Initialization ────────────────────────────────────────────────

/**
 * Main initialization routine. Called once on application startup.
 * Creates tables, runs migrations, and seeds default data.
 */
async function initializeDatabase() {
  try {
    // Create all tables
    for (const query of TABLE_DEFINITIONS) {
      await pool.execute(query);
    }

    // Run schema migrations
    await runMigrations();

    logger.info('Database tables initialized successfully.');

    // Seed default admin user (INSERT IGNORE = skip if already exists)
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      logger.error('FATAL: DEFAULT_ADMIN_PASSWORD environment variable is required. Exiting.');
      process.exit(1);
    }

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(defaultPassword, 10);

    await pool.execute(
      'INSERT IGNORE INTO users (username, password_hash) VALUES (?, ?)',
      ['admin', hash]
    );
    logger.info('Default admin user verified.');

    // Seed default PowerBI configuration
    await pool.execute(
      `INSERT INTO settings (service, base_url) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE base_url = VALUES(base_url)`,
      ['powerbi', 'https://app.powerbi.com/groups/me/reports/919d8b16-e1fd-4633-8bd8-3cdcd1f89102/b5de83ec9295fdc36774?experience=power-bi']
    );

    // Initialize default asset columns for admin user (id=1)
    await initializeDefaultAssetColumns(1);

  } catch (err) {
    logger.error('FATAL: Database initialization failed:', { error: err.message });
    process.exit(1);
  }
}

// Start initialization asynchronously (pool is already usable)
initializeDatabase();

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = pool;
module.exports.initializeDefaultAssetColumns = initializeDefaultAssetColumns;
