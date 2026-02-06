/**
 * @fileoverview Standalone utility to reset the admin user's password.
 *
 * Reads the desired password from the DEFAULT_ADMIN_PASSWORD environment
 * variable (falls back to "admin123"), hashes it with bcrypt, and updates
 * (or creates) the admin user row in the database.
 *
 * Usage:
 *   node server/reset-admin-password.js
 *
 * The script waits 2 seconds for the database pool to initialize before
 * executing, then exits with code 0 on success or 1 on failure.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');
const logger = require('./utils/logger');

async function resetAdminPassword() {
  try {
    logger.info('Connecting to database...');

    // Determine the new password from environment or default
    const newPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    logger.info(`Resetting admin password to: ${newPassword}`);

    // Hash the password with bcrypt (10 salt rounds)
    const hash = await bcrypt.hash(newPassword, 10);

    // Attempt to update the existing admin user
    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [hash, 'admin']
    );

    if (result.affectedRows === 0) {
      // Admin user doesn't exist yet — create it
      logger.info('Admin user not found. Creating admin user...');
      await pool.execute(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        ['admin', hash]
      );
      logger.info('Admin user created successfully!');
    } else {
      logger.info('Admin password reset successfully!');
    }

    // Verify the user exists in the database
    const [users] = await pool.execute(
      'SELECT id, username, created_at, updated_at FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length > 0) {
      logger.info('Admin user details:', users[0]);
    }

    logger.info(`You can now login with: admin / ${newPassword}`);
    process.exit(0);
  } catch (error) {
    logger.error('Error resetting admin password:', { error: error.message });
    process.exit(1);
  }
}

// Wait for database pool initialization before running
setTimeout(() => {
  resetAdminPassword();
}, 2000);
