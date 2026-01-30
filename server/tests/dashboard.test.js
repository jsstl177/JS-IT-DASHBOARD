const request = require('supertest');
const express = require('express');

// Mock all dependencies
jest.mock('../db');
jest.mock('../services/uptimeKuma');
jest.mock('../services/superOps');
jest.mock('../services/automationLog');
jest.mock('../services/n8n');
jest.mock('../services/proxmox');
jest.mock('../services/powerbi');
jest.mock('../utils/logger');

// Import after mocking
const dashboardRoutes = require('../routes/dashboard');
const db = require('../db');
const { getNetworkStatus } = require('../services/uptimeKuma');
const logger = require('../utils/logger');

const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRoutes);

describe('Dashboard Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    db.all.mockImplementation((query, callback) => callback(null, []));
    getNetworkStatus.mockResolvedValue([]);
    logger.info.mockImplementation(() => {});
    logger.warn.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});
  });

  describe('GET /api/dashboard/data', () => {
    it('should return dashboard data successfully', async () => {
      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(response.body).toHaveProperty('networkStatus');
      expect(response.body).toHaveProperty('openTickets');
      expect(response.body).toHaveProperty('automationLogs');
      expect(response.body).toHaveProperty('n8nExecutions');
      expect(response.body).toHaveProperty('proxmoxStatus');
      expect(response.body).toHaveProperty('powerbiInfo');
    });

    it('should handle service errors gracefully', async () => {
      getNetworkStatus.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      // Should still return structure even if services fail
      expect(Array.isArray(response.body.networkStatus)).toBe(true);
    });
  });
});
