// Set environment variables before any imports
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';

// Mock all dependencies before requiring modules
jest.mock('../db', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn()
}));
jest.mock('../services/uptimeKuma');
jest.mock('../services/superOps');
jest.mock('../services/automationLog');
jest.mock('../services/n8n');
jest.mock('../services/proxmox');
jest.mock('../services/powerbi');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Import after mocking
const request = require('supertest');
const express = require('express');
const dashboardRoutes = require('../routes/dashboard');
const db = require('../db');
const { getNetworkStatus } = require('../services/uptimeKuma');
const { getOpenTickets } = require('../services/superOps');
const { getAutomationLogs } = require('../services/automationLog');
const { getWorkflowExecutions } = require('../services/n8n');
const { getProxmoxStatus } = require('../services/proxmox');
const { getPowerBIEmbedInfo } = require('../services/powerbi');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

const app = createApp();

describe('Dashboard Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock: db.all with 3-arg callback pattern (query, params, callback)
    db.all.mockImplementation((query, params, callback) => {
      callback(null, []);
    });

    // Default mocks for all services - return { sourceUrl, items } format
    getNetworkStatus.mockResolvedValue({ sourceUrl: null, items: [] });
    getOpenTickets.mockResolvedValue({ sourceUrl: null, items: [] });
    getAutomationLogs.mockResolvedValue({ sourceUrl: null, items: [] });
    getWorkflowExecutions.mockResolvedValue({ sourceUrl: null, items: [] });
    getProxmoxStatus.mockResolvedValue({ sourceUrl: null, items: [] });
    getPowerBIEmbedInfo.mockReturnValue(null);
  });

  describe('GET /api/dashboard/data', () => {
    it('should return dashboard data successfully with correct structure', async () => {
      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(response.body).toHaveProperty('networkStatus');
      expect(response.body).toHaveProperty('openTickets');
      expect(response.body).toHaveProperty('automationLogs');
      expect(response.body).toHaveProperty('n8nExecutions');
      expect(response.body).toHaveProperty('proxmoxStatus');
      expect(response.body).toHaveProperty('powerbiInfo');
      expect(response.body).toHaveProperty('employeeSetup');

      // Verify { sourceUrl, items } structure
      expect(response.body.networkStatus).toHaveProperty('sourceUrl');
      expect(response.body.networkStatus).toHaveProperty('items');
      expect(response.body.openTickets).toHaveProperty('sourceUrl');
      expect(response.body.openTickets).toHaveProperty('items');
    });

    it('should return data from configured services', async () => {
      // Mock settings with uptime-kuma configured
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { service: 'uptime-kuma', base_url: 'http://uptime.local', api_key: null, api_secret: null, password: null }
        ]);
      });

      getNetworkStatus.mockResolvedValue({
        sourceUrl: 'http://uptime.local/status/everything',
        items: [
          { id: 1, name: 'Server', status: 'down', url: 'http://server', lastPing: 0, uptime: 80 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(response.body.networkStatus.sourceUrl).toBe('http://uptime.local/status/everything');
      expect(response.body.networkStatus.items).toHaveLength(1);
      expect(response.body.networkStatus.items[0].name).toBe('Server');
    });

    it('should handle service errors gracefully', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { service: 'uptime-kuma', base_url: 'http://uptime.local', api_key: null, api_secret: null, password: null }
        ]);
      });

      getNetworkStatus.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      // Should still return structure even if services fail
      expect(response.body.networkStatus).toBeDefined();
      expect(response.body.networkStatus).toHaveProperty('items');
    });

    it('should handle database errors', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Database connection failed'));
      });

      const response = await request(app)
        .get('/api/dashboard/data');

      // Express 5 may propagate the error differently, but should not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should call services with correct parameters', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { service: 'superops', base_url: 'https://superops.com', api_key: 'key123', api_secret: null, password: null },
          { service: 'n8n', base_url: 'https://n8n.local', api_key: 'n8nkey', api_secret: null, password: null }
        ]);
      });

      getOpenTickets.mockResolvedValue({ sourceUrl: 'https://superops.com/ticket', items: [] });
      getWorkflowExecutions.mockResolvedValue({ sourceUrl: 'https://n8n.local', items: [] });

      await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(getOpenTickets).toHaveBeenCalledWith('https://superops.com', 'key123');
      expect(getWorkflowExecutions).toHaveBeenCalledWith('https://n8n.local', 'n8nkey');
    });

    it('should call proxmox with correct parameters including node names', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          {
            service: 'proxmox',
            base_url: 'https://proxmox.local:8006',
            api_key: 'node1,node2',
            api_secret: null,
            username: 'root@pam',
            password: 'secret'
          }
        ]);
      });

      getProxmoxStatus.mockResolvedValue({ sourceUrl: 'https://proxmox.local:8006', items: [] });

      await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(getProxmoxStatus).toHaveBeenCalledWith(
        'https://proxmox.local:8006',
        'root@pam',
        'secret',
        ['node1', 'node2']
      );
    });

    it('should handle Power BI embed info', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { service: 'powerbi', base_url: 'https://app.powerbi.com/reports/abc-123', api_key: null, api_secret: null, password: null }
        ]);
      });

      getPowerBIEmbedInfo.mockReturnValue({
        embedUrl: 'https://app.powerbi.com/reports/abc-123',
        reportId: 'abc-123',
        sourceUrl: 'https://app.powerbi.com/reports/abc-123',
        accessToken: null
      });

      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(response.body.powerbiInfo).toBeDefined();
      expect(response.body.powerbiInfo.reportId).toBe('abc-123');
    });

    it('should handle timeout scenario (service takes too long)', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { service: 'uptime-kuma', base_url: 'http://uptime.local', api_key: null, api_secret: null, password: null }
        ]);
      });

      // Simulate a service that rejects due to timeout
      getNetworkStatus.mockRejectedValue(new Error('Uptime Kuma timeout'));

      const response = await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      // The dashboard route uses Promise.allSettled so it should still return defaults
      expect(response.body.networkStatus).toBeDefined();
    });

    it('should not call services when no settings are configured', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(getNetworkStatus).not.toHaveBeenCalled();
      expect(getOpenTickets).not.toHaveBeenCalled();
      expect(getAutomationLogs).not.toHaveBeenCalled();
      expect(getWorkflowExecutions).not.toHaveBeenCalled();
      expect(getProxmoxStatus).not.toHaveBeenCalled();
    });

    it('should skip services that lack required settings', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          // superops without api_key should be skipped
          { service: 'superops', base_url: 'https://superops.com', api_key: null, api_secret: null, password: null },
          // n8n without base_url should be skipped
          { service: 'n8n', base_url: null, api_key: 'key', api_secret: null, password: null }
        ]);
      });

      await request(app)
        .get('/api/dashboard/data')
        .expect(200);

      expect(getOpenTickets).not.toHaveBeenCalled();
      expect(getWorkflowExecutions).not.toHaveBeenCalled();
    });
  });
});
