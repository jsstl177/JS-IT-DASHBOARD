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

  } catch (err) {
    console.error('FATAL: Database initialization failed:', err.message);
    process.exit(1);
  }
}

// Initialize tables asynchronously
initializeDatabase();

// Export the pool immediately (pool object is valid before connections are made)
module.exports = pool;
