// Set environment variables before any imports
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';

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

const request = require('supertest');
const express = require('express');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
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
    it('should return active and completed checklists', async () => {
      const mockChecklists = [
        { ...mockChecklist, status: 'pending' },
        { ...mockChecklist, id: 2, employee_name: 'Jane Smith', status: 'completed' }
      ];

      // First call: dbAll for checklists list query
      // Subsequent calls: dbAll for items per checklist
      dbAll
        .mockResolvedValueOnce(mockChecklists)
        .mockResolvedValueOnce([...mockItems])
        .mockResolvedValueOnce([...mockItems]);

      const response = await request(app)
        .get('/api/employee-setup/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('completed');
      expect(Array.isArray(response.body.active)).toBe(true);
      expect(Array.isArray(response.body.completed)).toBe(true);
      expect(response.body.active).toHaveLength(1);
      expect(response.body.completed).toHaveLength(1);
      expect(response.body.active[0].employee_name).toBe('John Doe');
      expect(response.body.completed[0].employee_name).toBe('Jane Smith');
    });

    it('should return empty arrays when no checklists exist', async () => {
      dbAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/employee-setup/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ active: [], completed: [] });
    });
  });

  // ========== POST / ==========
  describe('POST /api/employee-setup/', () => {
    it('should create a new checklist with valid data (returns 201)', async () => {
      // dbRun for INSERT checklist -> returns lastID
      // Subsequent dbRun calls for item inserts
      dbRun.mockResolvedValue({ lastID: 1, changes: 1 });

      // dbGet for getChecklistById
      dbGet.mockResolvedValue({ ...mockChecklist });

      // dbAll for getChecklistById items
      dbAll.mockResolvedValue([...mockItems]);

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
      dbGet.mockResolvedValue({ ...mockChecklist });
      dbAll.mockResolvedValue([...mockItems]);

      const response = await request(app)
        .get('/api/employee-setup/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.employee_name).toBe('John Doe');
      expect(response.body.items).toBeDefined();
      expect(response.body.items).toHaveLength(3);
    });

    it('should return 404 for nonexistent checklist', async () => {
      dbGet.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/employee-setup/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Checklist not found');
    });
  });

  // ========== PATCH /:checklistId/items/:itemId ==========
  describe('PATCH /api/employee-setup/:checklistId/items/:itemId', () => {
    it('should update item status with valid status', async () => {
      // dbRun for UPDATE calls
      dbRun.mockResolvedValue({ changes: 1 });

      // dbGet for getChecklistById
      dbGet.mockResolvedValue({ ...mockChecklist, status: 'in_progress' });

      // dbAll for getChecklistById items
      dbAll.mockResolvedValue([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'pending' },
        { ...mockItems[2], status: 'pending' }
      ]);

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
      dbRun.mockResolvedValue({ changes: 1 });
      dbGet.mockResolvedValue({ ...mockChecklist });
      dbAll.mockResolvedValue([...mockItems]);

      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'pending' });

      expect(response.status).toBe(200);
    });

    it('should accept "na" status', async () => {
      dbRun.mockResolvedValue({ changes: 1 });
      dbGet.mockResolvedValue({ ...mockChecklist });
      dbAll.mockResolvedValue([
        { ...mockItems[0], status: 'na' },
        { ...mockItems[1], status: 'pending' },
        { ...mockItems[2], status: 'pending' }
      ]);

      const response = await request(app)
        .patch('/api/employee-setup/1/items/1')
        .send({ status: 'na' });

      expect(response.status).toBe(200);
    });

    it('should auto-complete checklist when all items are completed or na', async () => {
      dbRun.mockResolvedValue({ changes: 1 });

      // getChecklistById: first call returns non-completed, second returns completed
      dbGet
        .mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' })
        .mockResolvedValueOnce({ ...mockChecklist, status: 'completed' });

      dbAll.mockResolvedValue([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'completed' },
        { ...mockItems[2], status: 'na' }
      ]);

      const response = await request(app)
        .patch('/api/employee-setup/1/items/3')
        .send({ status: 'na' });

      expect(response.status).toBe(200);
      // Verify that dbRun was called to update checklist status to 'completed'
      const runCalls = dbRun.mock.calls;
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
      dbRun.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/employee-setup/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Checklist deleted successfully');
      expect(dbRun).toHaveBeenCalled();
    });

    it('should return 200 even for nonexistent checklist (idempotent delete)', async () => {
      dbRun.mockResolvedValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/employee-setup/999');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Checklist deleted successfully');
    });
  });
});
