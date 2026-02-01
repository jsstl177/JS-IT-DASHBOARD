// Set environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
process.env.DEFAULT_ADMIN_PASSWORD = 'testpassword';

// Mock dependencies before requiring modules
jest.mock('../utils/dbHelpers', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));
// Disable rate limiter in tests by making it a pass-through middleware
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next();
});

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const settingsRoutes = require('../routes/settings');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', settingsRoutes);
  // Error handler for Express 5
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

const app = createApp();

// Helper to generate a valid JWT token
function generateToken(payload = { id: 1, username: 'admin' }) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Settings Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== POST /login ==========
  describe('POST /api/settings/login', () => {
    it('should return a token with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10);

      dbGet.mockResolvedValue({ id: 1, username: 'admin', password_hash: hashedPassword });

      const response = await request(app)
        .post('/api/settings/login')
        .send({ username: 'admin', password: 'testpassword' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      // Verify the token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.username).toBe('admin');
    });

    it('should return 401 with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      dbGet.mockResolvedValue({ id: 1, username: 'admin', password_hash: hashedPassword });

      const response = await request(app)
        .post('/api/settings/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when user is not found', async () => {
      dbGet.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/settings/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 with missing username', async () => {
      const response = await request(app)
        .post('/api/settings/login')
        .send({ password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 with missing password', async () => {
      const response = await request(app)
        .post('/api/settings/login')
        .send({ username: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .post('/api/settings/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ========== GET / ==========
  describe('GET /api/settings/', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/settings/');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/settings/')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return settings with valid token', async () => {
      const token = generateToken();
      const mockSettings = [
        { service: 'uptime-kuma', api_key: null, api_secret: null, base_url: 'http://uptime.local', username: null },
        { service: 'superops', api_key: 'plain-key', api_secret: null, base_url: 'https://superops.com', username: null }
      ];

      dbAll.mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/settings/')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].service).toBe('uptime-kuma');
    });

    it('should return empty array when no settings exist', async () => {
      const token = generateToken();

      dbAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/settings/')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 403 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, username: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Small delay to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/settings/')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });
  });

  // ========== POST / ==========
  describe('POST /api/settings/', () => {
    it('should save settings with valid token and data', async () => {
      const token = generateToken();

      dbRun.mockResolvedValue({ lastID: 1, changes: 1 });

      const response = await request(app)
        .post('/api/settings/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service: 'uptime-kuma',
          base_url: 'http://uptime.local:3001'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Setting updated successfully');
      expect(dbRun).toHaveBeenCalled();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/settings/')
        .send({
          service: 'uptime-kuma',
          base_url: 'http://uptime.local:3001'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with missing service', async () => {
      const token = generateToken();

      const response = await request(app)
        .post('/api/settings/')
        .set('Authorization', `Bearer ${token}`)
        .send({ base_url: 'http://example.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 with invalid service type', async () => {
      const token = generateToken();

      const response = await request(app)
        .post('/api/settings/')
        .set('Authorization', `Bearer ${token}`)
        .send({ service: 'invalid-service', base_url: 'http://example.com' });

      expect(response.status).toBe(400);
    });

    it('should encrypt sensitive fields before saving', async () => {
      const token = generateToken();

      dbRun.mockResolvedValue({ lastID: 1, changes: 1 });

      await request(app)
        .post('/api/settings/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service: 'superops',
          base_url: 'https://superops.com',
          api_key: 'my-secret-api-key'
        });

      // Verify dbRun was called with encrypted api_key (should contain colons from encryption format)
      const callParams = dbRun.mock.calls[0][1];
      // The api_key param (index 1) should be encrypted (contain colons)
      expect(callParams[1]).toContain(':');
    });
  });

  // ========== DELETE /:service ==========
  describe('DELETE /api/settings/:service', () => {
    it('should delete setting with valid token', async () => {
      const token = generateToken();

      dbRun.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/settings/uptime-kuma')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Setting deleted successfully');
      expect(dbRun).toHaveBeenCalled();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .delete('/api/settings/uptime-kuma');

      expect(response.status).toBe(401);
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .delete('/api/settings/uptime-kuma')
        .set('Authorization', 'Bearer badtoken');

      expect(response.status).toBe(403);
    });
  });
});
