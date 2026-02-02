require('dotenv').config();

const mysql = require('mysql2/promise');

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

// Create pool synchronously so it's available immediately on require()
const pool = mysql.createPool(dbConfig);

async function initializeDatabase() {
  try {
    const tableQueries = [
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

      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS employee_setup_checklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        employee_email VARCHAR(255),
        store_number VARCHAR(255),
        ticket_id VARCHAR(255),
        department VARCHAR(255),
        status VARCHAR(255) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

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
      )`
    ];

    for (const query of tableQueries) {
      await pool.execute(query);
    }

    console.log('Database tables initialized successfully.');

    // Insert default admin user
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.error('FATAL: DEFAULT_ADMIN_PASSWORD environment variable is required. Exiting.');
      process.exit(1);
    }

    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const hash = await bcrypt.hash(defaultPassword, saltRounds);

    await pool.execute(
      'INSERT IGNORE INTO users (username, password_hash) VALUES (?, ?)',
      ['admin', hash]
    );

    console.log('Default admin user inserted successfully.');

    await initializeDefaultAssetColumns(1);

  } catch (err) {
    console.error('FATAL: Database initialization failed:', err.message);
    process.exit(1);
  }
}

async function initializeDefaultAssetColumns(userId) {
  try {
    const existing = await pool.execute(
      'SELECT COUNT(*) as count FROM asset_column_config WHERE user_id = ?',
      [userId]
    );
    
    if (existing[0][0].count > 0) {
      return;
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

    console.log('Default asset columns initialized successfully.');
  } catch (err) {
    console.warn('Warning: Failed to initialize default asset columns:', err.message);
  }
}

// Initialize tables asynchronously
initializeDatabase();

// Export the pool immediately (pool object is valid before connections are made)
module.exports = pool;
module.exports.initializeDefaultAssetColumns = initializeDefaultAssetColumns;
