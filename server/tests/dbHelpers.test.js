/**
 * @fileoverview Tests for database helper functions.
 */

// Mock the database pool
jest.mock('../db', () => ({
  execute: jest.fn()
}));

const pool = require('../db');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');

describe('Database Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dbGet', () => {
    test('should return the first row from results', async () => {
      const mockRow = { id: 1, username: 'admin' };
      pool.execute.mockResolvedValue([[mockRow, { id: 2, username: 'user' }]]);

      const result = await dbGet('SELECT * FROM users WHERE id = ?', [1]);
      expect(result).toEqual(mockRow);
      expect(pool.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
    });

    test('should return null when no rows found', async () => {
      pool.execute.mockResolvedValue([[]]);

      const result = await dbGet('SELECT * FROM users WHERE id = ?', [999]);
      expect(result).toBeNull();
    });

    test('should use empty array as default params', async () => {
      pool.execute.mockResolvedValue([[{ count: 5 }]]);

      await dbGet('SELECT COUNT(*) as count FROM users');
      expect(pool.execute).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users', []);
    });
  });

  describe('dbAll', () => {
    test('should return all rows', async () => {
      const mockRows = [
        { id: 1, username: 'admin' },
        { id: 2, username: 'user1' },
        { id: 3, username: 'user2' }
      ];
      pool.execute.mockResolvedValue([mockRows]);

      const result = await dbAll('SELECT * FROM users');
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockRows);
    });

    test('should return empty array when no rows', async () => {
      pool.execute.mockResolvedValue([[]]);

      const result = await dbAll('SELECT * FROM users WHERE id > ?', [1000]);
      expect(result).toEqual([]);
    });
  });

  describe('dbRun', () => {
    test('should return lastID and changes for INSERT', async () => {
      pool.execute.mockResolvedValue([{ insertId: 5, affectedRows: 1 }]);

      const result = await dbRun(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        ['newuser', 'hash']
      );
      expect(result).toEqual({ lastID: 5, changes: 1 });
    });

    test('should return changes for UPDATE', async () => {
      pool.execute.mockResolvedValue([{ insertId: 0, affectedRows: 3 }]);

      const result = await dbRun(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id > ?',
        [0]
      );
      expect(result).toEqual({ lastID: 0, changes: 3 });
    });

    test('should return 0 changes for DELETE with no matches', async () => {
      pool.execute.mockResolvedValue([{ insertId: 0, affectedRows: 0 }]);

      const result = await dbRun('DELETE FROM users WHERE id = ?', [999]);
      expect(result).toEqual({ lastID: 0, changes: 0 });
    });
  });
});
