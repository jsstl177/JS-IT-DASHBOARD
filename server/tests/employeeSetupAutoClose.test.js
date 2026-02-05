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
jest.mock('../services/superOps', () => ({
  closeTicket: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const { closeTicket } = require('../services/superOps');
const employeeSetupRouter = require('../routes/employeeSetup');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/employee-setup', employeeSetupRouter);
  // Error handler for Express 5
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

const app = createApp();

// Mock checklist data
const mockChecklist = {
  id: 1,
  employee_name: 'Test Employee',
  employee_email: 'test@example.com',
  store_number: '001',
  ticket_id: '12345',
  status: 'in_progress',
  completed_items: 0,
  total_items: 3,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z'
};

const mockItems = [
  { id: 1, checklist_id: 1, category: 'Domain', item_name: 'Setup Domain User', status: 'pending', notes: null },
  { id: 2, checklist_id: 1, category: 'Outlook Email', item_name: 'Request New Employee Email', status: 'pending', notes: null },
  { id: 3, checklist_id: 1, category: 'M365', item_name: 'Assign M365 License', status: 'pending', notes: null }
];

describe('Employee Setup Auto-Close Ticket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    closeTicket.mockResolvedValue({
      ticketId: '12345',
      displayId: '12345',
      status: 'Closed'
    });
  });

  test('should close SuperOps ticket when all checklist items are completed', async () => {
    // Setup: dbRun for UPDATE operations (item update, checklist updated_at, status update)
    dbRun.mockResolvedValue({ changes: 1 });

    // Setup: dbGet calls in order:
    // 1. First getChecklistById (checklist)
    // 2. SuperOps settings
    // 3. Second getChecklistById (checklist after completion)
    dbGet
      .mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' }) // First getChecklistById
      .mockResolvedValueOnce({ api_key: 'test-api-key', base_url: 'https://test.superops.ai' }) // SuperOps settings
      .mockResolvedValueOnce({ ...mockChecklist, status: 'completed' }); // Second getChecklistById

    // Setup: dbAll for getChecklistById items calls (both times - all completed)
    dbAll
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'completed' },
        { ...mockItems[2], status: 'completed' }
      ])
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'completed' },
        { ...mockItems[2], status: 'completed' }
      ]);

    // Mark last item as completed - this should trigger ticket closure
    const response = await request(app)
      .patch('/api/employee-setup/1/items/3')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');

    // Verify closeTicket was called with correct parameters
    expect(closeTicket).toHaveBeenCalledTimes(1);
    expect(closeTicket).toHaveBeenCalledWith(
      'https://test.superops.ai',
      'test-api-key',
      '12345'
    );
  });

  test('should handle ticket closure with N/A items', async () => {
    dbRun.mockResolvedValue({ changes: 1 });

    dbGet
      .mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' })
      .mockResolvedValueOnce({ api_key: 'test-api-key', base_url: 'https://test.superops.ai' })
      .mockResolvedValueOnce({ ...mockChecklist, status: 'completed' });

    dbAll
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'na' },
        { ...mockItems[2], status: 'completed' }
      ])
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'na' },
        { ...mockItems[2], status: 'completed' }
      ]);

    const response = await request(app)
      .patch('/api/employee-setup/1/items/3')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
    expect(closeTicket).toHaveBeenCalledTimes(1);
  });

  test('should not close ticket if checklist has no ticket_id', async () => {
    dbRun.mockResolvedValue({ changes: 1 });

    const checklistWithoutTicket = { ...mockChecklist, ticket_id: null };

    dbGet
      .mockResolvedValueOnce(checklistWithoutTicket)
      .mockResolvedValueOnce({ ...checklistWithoutTicket, status: 'completed' });

    dbAll
      .mockResolvedValueOnce([
        { id: 1, checklist_id: 1, category: 'Domain', item_name: 'Setup Domain User', status: 'completed', notes: null }
      ])
      .mockResolvedValueOnce([
        { id: 1, checklist_id: 1, category: 'Domain', item_name: 'Setup Domain User', status: 'completed', notes: null }
      ]);

    const response = await request(app)
      .patch('/api/employee-setup/1/items/1')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
    expect(closeTicket).not.toHaveBeenCalled();
  });

  test('should not fail if ticket closure fails', async () => {
    closeTicket.mockRejectedValue(new Error('SuperOps API Error'));

    dbRun.mockResolvedValue({ changes: 1 });

    dbGet
      .mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' })
      .mockResolvedValueOnce({ api_key: 'test-api-key', base_url: 'https://test.superops.ai' })
      .mockResolvedValueOnce({ ...mockChecklist, status: 'completed' });

    dbAll
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'completed' },
        { ...mockItems[2], status: 'completed' }
      ])
      .mockResolvedValueOnce([
        { ...mockItems[0], status: 'completed' },
        { ...mockItems[1], status: 'completed' },
        { ...mockItems[2], status: 'completed' }
      ]);

    // Request should still succeed even though ticket closure failed
    const response = await request(app)
      .patch('/api/employee-setup/1/items/3')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(closeTicket).toHaveBeenCalled();
  });

  test('should not close ticket if not all items are completed', async () => {
    dbRun.mockResolvedValue({ changes: 1 });

    dbGet.mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' })
           .mockResolvedValueOnce({ ...mockChecklist, status: 'in_progress' });

    dbAll.mockResolvedValue([
      { ...mockItems[0], status: 'completed' },
      { ...mockItems[1], status: 'completed' },
      { ...mockItems[2], status: 'pending' }
    ]);

    const response = await request(app)
      .patch('/api/employee-setup/1/items/2')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(closeTicket).not.toHaveBeenCalled();
  });

  test('should not close ticket multiple times if already completed', async () => {
    dbRun.mockResolvedValue({ changes: 1 });

    // Checklist is already completed
    dbGet.mockResolvedValueOnce({ ...mockChecklist, status: 'completed' })
           .mockResolvedValueOnce({ ...mockChecklist, status: 'completed' });

    dbAll.mockResolvedValue([
      { ...mockItems[0], status: 'completed' },
      { ...mockItems[1], status: 'completed' },
      { ...mockItems[2], status: 'completed' }
    ]);

    const response = await request(app)
      .patch('/api/employee-setup/1/items/1')
      .send({ status: 'completed' });

    expect(response.status).toBe(200);
    expect(closeTicket).not.toHaveBeenCalled();
  });
});
