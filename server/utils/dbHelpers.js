/**
 * @fileoverview Database helper functions for MySQL/MariaDB operations.
 * Provides convenient wrappers around the connection pool.
 */

const pool = require('../db');

/**
 * Executes a SQL query and returns the first row.
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Object|null>} First row or null if no results
 */
async function dbGet(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

/**
 * Executes a SQL query and returns all rows.
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Array>} Array of result rows
 */
async function dbAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Executes a SQL query that modifies data (INSERT, UPDATE, DELETE).
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<{lastID: number, changes: number}>} Object containing last insert ID and affected rows
 */
async function dbRun(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { lastID: result.insertId, changes: result.affectedRows };
}

module.exports = { dbGet, dbAll, dbRun };
