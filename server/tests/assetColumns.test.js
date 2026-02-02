const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const assetColumnsRouter = require('../routes/assetColumns');
const { dbAll, dbRun } = require('../utils/dbHelpers');

jest.mock('../utils/dbHelpers');

const app = express();
app.use(express.json());
app.use('/api/asset-columns', assetColumnsRouter);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const generateToken = (userId = 1) => {
  return jwt.sign({ id: userId, username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Asset Columns API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/asset-columns/columns', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/asset-columns/columns')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/asset-columns/columns')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should fetch columns with valid token', async () => {
      dbAll.mockResolvedValue([
        { column_key: 'name', column_label: 'Name', visible: 1, sort_order: 0 }
      ]);

      const token = generateToken();
      const response = await request(app)
        .get('/api/asset-columns/columns')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('column_key', 'name');
    });
  });

  describe('POST /api/asset-columns/columns', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/asset-columns/columns')
        .send({ userId: 1, columns: [] })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should return 400 with missing data', async () => {
      const token = generateToken();
      const response = await request(app)
        .post('/api/asset-columns/columns')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'columns must be an array');
    });

    it('should save columns with valid token and data', async () => {
      dbRun.mockResolvedValue({ insertId: 1 });

      const columns = [
        { key: 'name', label: 'Name', visible: true, sortOrder: 0 }
      ];

      const token = generateToken();
      const response = await request(app)
        .post('/api/asset-columns/columns')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 1, columns })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/asset-columns/columns/reset', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/asset-columns/columns/reset')
        .send({ userId: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reset columns with valid token', async () => {
      dbRun.mockResolvedValue({ affectedRows: 1 });

      const token = generateToken();
      const response = await request(app)
        .post('/api/asset-columns/columns/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});
