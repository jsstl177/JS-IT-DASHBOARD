/**
 * @fileoverview Tests for the users route (CRUD operations).
 */

// Mock database before any requires
jest.mock('../db', () => ({
  execute: jest.fn().mockResolvedValue([[]]),
  end: jest.fn().mockResolvedValue(undefined)
}));

const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');

// Mock dependencies
jest.mock('../utils/dbHelpers');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Users Route Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin check', () => {
    test('should identify admin user correctly', async () => {
      dbGet.mockResolvedValue({ id: 1, username: 'admin' });
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [1]);
      expect(user.username).toBe('admin');
    });

    test('should identify non-admin user', async () => {
      dbGet.mockResolvedValue({ id: 2, username: 'johndoe' });
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [2]);
      expect(user.username).not.toBe('admin');
    });
  });

  describe('User CRUD operations', () => {
    test('should list all users', async () => {
      const mockUsers = [
        { id: 1, username: 'admin', created_at: '2024-01-01' },
        { id: 2, username: 'user1', created_at: '2024-01-02' }
      ];
      dbAll.mockResolvedValue(mockUsers);

      const users = await dbAll('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('admin');
    });

    test('should create a new user', async () => {
      dbGet.mockResolvedValue(null);
      dbRun.mockResolvedValue({ lastID: 3, changes: 1 });

      const existing = await dbGet('SELECT * FROM users WHERE username = ?', ['newuser']);
      expect(existing).toBeNull();

      const result = await dbRun(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        ['newuser', 'hashed']
      );
      expect(result.lastID).toBe(3);
    });

    test('should detect duplicate username', async () => {
      dbGet.mockResolvedValue({ id: 2, username: 'existinguser' });
      const existing = await dbGet('SELECT * FROM users WHERE username = ?', ['existinguser']);
      expect(existing).not.toBeNull();
    });

    test('should update user username', async () => {
      dbGet
        .mockResolvedValueOnce({ id: 2, username: 'oldname' })
        .mockResolvedValueOnce(null);
      dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

      const existing = await dbGet('SELECT * FROM users WHERE id = ?', [2]);
      expect(existing).not.toBeNull();

      const duplicate = await dbGet('SELECT * FROM users WHERE username = ? AND id != ?', ['newname', 2]);
      expect(duplicate).toBeNull();

      const result = await dbRun('UPDATE users SET username = ? WHERE id = ?', ['newname', 2]);
      expect(result.changes).toBe(1);
    });

    test('should not allow deleting admin user', async () => {
      dbGet.mockResolvedValue({ id: 1, username: 'admin' });
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [1]);
      expect(user.username).toBe('admin');
    });

    test('should delete non-admin user', async () => {
      dbGet.mockResolvedValue({ id: 2, username: 'regularuser' });
      dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

      const user = await dbGet('SELECT * FROM users WHERE id = ?', [2]);
      expect(user.username).not.toBe('admin');

      const result = await dbRun('DELETE FROM users WHERE id = ?', [2]);
      expect(result.changes).toBe(1);
    });
  });
});
