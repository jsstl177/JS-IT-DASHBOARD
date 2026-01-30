const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dashboard.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  const tableQueries = [
    // Settings table for API keys and credentials
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT UNIQUE,
      api_key TEXT,
      api_secret TEXT,
      base_url TEXT,
      username TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // User table for authentication
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // New employee setup checklist table
    `CREATE TABLE IF NOT EXISTS employee_setup_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      employee_email TEXT,
      store_number TEXT,
      ticket_id TEXT,
      department TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Checklist items table
    `CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES employee_setup_checklist (id) ON DELETE CASCADE
    )`
  ];

  let hasError = false;

  tableQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err) {
        console.error(`Error creating table (query ${index + 1}):`, err.message);
        hasError = true;
        if (index === tableQueries.length - 1) {
          console.error('FATAL: Database initialization failed. Exiting.');
          process.exit(1);
        }
      }

      // After last table is created successfully, insert default admin
      if (index === tableQueries.length - 1 && !hasError) {
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        if (!defaultPassword) {
          console.error('FATAL: DEFAULT_ADMIN_PASSWORD environment variable is required. Exiting.');
          process.exit(1);
        }

        const bcrypt = require('bcryptjs');
        const saltRounds = 10;

        bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
          if (err) {
            console.error('Error hashing default password:', err.message);
            return;
          }
          db.run(
            'INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)',
            ['admin', hash]
          );
        });
      }
    });
  });
});

module.exports = db;
