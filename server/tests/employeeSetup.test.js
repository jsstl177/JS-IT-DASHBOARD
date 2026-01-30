// Set environment variables before any imports
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';

// Mock dependencies before requiring modules
jest.mock('../db', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn()
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const db = require('../db');
const employeeSetupRoutes = require('../routes/employeeSetup');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/employee-setup', employeeSetupRoutes);
  // Error handler for Express 5
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

const app = createApp();

// Mock checklist data for responses
const mockChecklist = {
  id: 1,
  employee_name: 'John Doe',
  employee_email: 'john@example.com',
  store_number: 'ST01',
  ticket_id: 'TK-001',
  department: 'IT',
  status: 'pending',
  completed_items: 0,
  total_items: 3,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z'
};

const mockItems = [
  { id: 1, checklist_id: 1, category: 'Email', item_name: 'Setup Email', description: 'Create email account', status: 'pending', notes: null },
  { id: 2, checklist_id: 1, category: 'Email', item_name: 'Set Password', description: 'Set temp password', status: 'pending', notes: null },
  { id: 3, checklist_id: 1, category: 'JEN', item_name: 'Create JEN ID', description: 'Create JEN UserID', status: 'pending', notes: null }
];

describe('Employee Setup Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== GET / ==========
  describe('GET /api/employee-setup/', () => {
    it('should return all checklists', async () => {
      const mockChecklists = [
        { ...mockChecklist },
        { ...mockChecklist, id: 2, employee_name: 'Jane Smith' }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockChecklists);
      });

      const response = await request(app)
        .get('/api/employee-setup/');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].employee_name).toBe('John Doe');
      expect(response.body[1].employee_name).toBe('Jane Smith');
    });

    it('should return empty array when no checklists exist', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/employee-setup/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // ========== POST / ==========
  describe('POST /api/employee-setup/', () => {
    it('should create a new checklist with valid data (returns 201)', async () => {
      // First call: INSERT checklist -> returns lastID
      // Subsequent calls: INSERT checklist items
      // Then: getChecklistById calls db.get and db.all
      let runCallCount = 0;
      db.run.mockImplementation(function (query, params, callback) {
        runCallCount++;
        // First call is the checklist insert
        if (runCallCount === 1) {
          callback.call({ lastID: 1, changes: 1 }, null);
        } else {
          // Subsequent calls are item inserts
          callback.call({ lastID: runCallCount, changes: 1 }, null);
        }
      });

      // db.get for getChecklistById
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { ...mockChecklist });
      });

      // db.all for getChecklistById items
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [...mockItems]);
      });

      const response = await request(app)
        .post('/api/employee-setup/')
        .send({
          employee_name: 'John Doe',
          employee_email: 'john@example.com',
          store_number: 'ST01',
          ticket_id: 'TK-001',
          department: 'IT'
        });

      expect(response.status).toBe(201);
      expect(response.body.employee_name).toBe('John Doe');
      expect(response.body.items).toBeDefined();
    });

    it('should return 400 with missing employee_name', async () => {
      const response = await request(app)
        .post('/api/employee-setup/')
        .send({
          employee_email: 'john@example.com',
          store_number: 'ST01'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 with invalid email format', async () => {
      const response = await request(app)
        .post('/api/employee-setup/')
        .send({
          employee_name: 'John Doe',
          employee_email: 'not-an-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(expect.arrayContaining([
        expect.stringContaining('email')
      ]));
    });

    it('should return 400 with non-alphanumeric store_number', async () => {
      const response = await request(app)
        .post('/api/employee-setup/')
        .send({
          employee_name: 'John Doe',
          store_number: 'ST-01!'
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(expect.arrayContaining([
        expect.stringContaining('alphanumeric')
      ]));
    });
  });

  // ========== GET /:id ==========
  describe('GET /api/employee-setup/:id', () => {
    it('should return a specific checklist with items', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { ...mockChecklist });
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(null, [...mockItems]);
      });

      const response = await request(app)
        .get('/api/employee-setup/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.employee_name).toBe('John Doe');
      expect(response.body.items).toBeDefined();
      expect(response.body.items).toHaveLength(3);
    });

    it('should return 404 for nonexistent checklist', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/employee-setup/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Checklist not found');
    });
  });

  // ========== PATCH /:checklistId/items/:itemId ==========
  describe('PATCH /api/employee-setup/:checklistId/items/:itemId', () => {
    it('should update item status with valid status', async () => {
      // db.run for UPDATE calls
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      // db.get for getChecklistById
      db.get.mockImplementation((query, params, callback) => {
        callback(null, { ...mockChecklist, status: 'in_progress' });
      });

      // db.all for getChecklistById items
      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { ...mockItems[0], status: 'completed' },
          { ...mockItems[1], status: 'pending' },
          { ...mockItems[2], status: 'pending' }
        ]);
      });

      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'completed', notes: 'Done' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.items).toBeDefined();
    });

    it('should return 400 with invalid status', async () => {
      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status value');
    });

    it('should accept "pending" status', async () => {
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      db.get.mockImplementation((query, params, callback) => {
        callback(null, { ...mockChecklist });
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(null, [...mockItems]);
      });

      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'pending' });

      expect(response.status).toBe(200);
    });

    it('should accept "na" status', async () => {
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      db.get.mockImplementation((query, params, callback) => {
        callback(null, { ...mockChecklist });
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { ...mockItems[0], status: 'na' },
          { ...mockItems[1], status: 'pending' },
          { ...mockItems[2], status: 'pending' }
        ]);
      });

      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'na' });

      expect(response.status).toBe(200);
    });

    it('should auto-complete checklist when all items are completed or na', async () => {
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      // getChecklistById: first call returns non-completed checklist, second returns completed
      let getCallCount = 0;
      db.get.mockImplementation((query, params, callback) => {
        getCallCount++;
        if (getCallCount === 1) {
          callback(null, { ...mockChecklist, status: 'in_progress' });
        } else {
          callback(null, { ...mockChecklist, status: 'completed' });
        }
      });

      db.all.mockImplementation((query, params, callback) => {
        callback(null, [
          { ...mockItems[0], status: 'completed' },
          { ...mockItems[1], status: 'completed' },
          { ...mockItems[2], status: 'na' }
        ]);
      });

      const response = await request(app)
        .patch('/api/employee-setup/1/items/3')
        .send({ status: 'na' });

      expect(response.status).toBe(200);
      // Verify that db.run was called to update checklist status to 'completed'
      const runCalls = db.run.mock.calls;
      const statusUpdateCall = runCalls.find(call =>
        call[0].includes('employee_setup_checklist') &&
        call[0].includes('status') &&
        call[1] && call[1][0] === 'completed'
      );
      expect(statusUpdateCall).toBeDefined();
    });
  });

  // ========== DELETE /:id ==========
  describe('DELETE /api/employee-setup/:id', () => {
    it('should delete a checklist', async () => {
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      const response = await request(app)
        .delete('/api/employee-setup/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Checklist deleted successfully');
      expect(db.run).toHaveBeenCalled();
    });

    it('should return 200 even for nonexistent checklist (idempotent delete)', async () => {
      db.run.mockImplementation(function (query, params, callback) {
        callback.call({ changes: 0 }, null);
      });

      const response = await request(app)
        .delete('/api/employee-setup/999');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Checklist deleted successfully');
    });
  });
});
