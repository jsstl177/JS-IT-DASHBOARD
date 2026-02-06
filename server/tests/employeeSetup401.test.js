const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring modules
jest.mock('../services/superOps', () => ({
  getOpenTickets: jest.fn()
}));
jest.mock('../utils/dbHelpers', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn()
}));
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');

const employeeSetupRouter = require('../routes/employeeSetup');
const { getOpenTickets } = require('../services/superOps');

const app = express();
app.use(express.json());
app.use('/api/employee-setup', employeeSetupRouter);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

describe('Employee Setup - SuperOps 401 Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbRun.mockResolvedValue({ lastID: 0, changes: 1 });
  });

  it('should display all checklists as active when SuperOps returns 401 error', async () => {
    dbGet.mockResolvedValue({ api_key: 'test-key', base_url: 'https://test.superops.ai' });
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'Employee 1', ticket_id: '12102', status: 'pending', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', created_at: new Date(), updated_at: new Date() },
          { id: 2, employee_name: 'Employee 2', ticket_id: '12103', status: 'pending', employee_email: 'emp2@test.com', store_number: '124', department: 'HR', created_at: new Date(), updated_at: new Date() },
          { id: 3, employee_name: 'Employee 3', ticket_id: null, status: 'pending', employee_email: 'emp3@test.com', store_number: '125', department: 'Sales', created_at: new Date(), updated_at: new Date() }
        ]);
      }
      return Promise.resolve([]);
    });

    // SuperOps returns 401 — can't determine ticket status
    const error = new Error('Request failed with status code 401');
    error.response = { status: 401 };
    getOpenTickets.mockRejectedValue(error);

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    // All 3 checklists should be in active since we can't verify tickets
    expect(response.body.active).toHaveLength(3);
    expect(response.body.completed).toHaveLength(0);
    expect(response.body.active[0].employee_name).toBe('Employee 1');
    expect(getOpenTickets).toHaveBeenCalledWith('https://test.superops.ai', 'test-key');
  });

  it('should display all checklists as active when SuperOps is not configured', async () => {
    dbGet.mockResolvedValue({ api_key: null, base_url: null });
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'Employee 1', ticket_id: '12102', status: 'pending', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', created_at: new Date(), updated_at: new Date() }
        ]);
      }
      return Promise.resolve([]);
    });

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    expect(response.body.active).toHaveLength(1);
    expect(response.body.active[0].ticket_id).toBe('12102');
    expect(getOpenTickets).not.toHaveBeenCalled();
  });

  it('should filter checklists when SuperOps succeeds — open stays active, closed auto-completes', async () => {
    dbGet.mockResolvedValue({ api_key: 'test-key', base_url: 'https://test.superops.ai' });
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'Open Ticket', ticket_id: '12102', status: 'pending', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', created_at: new Date(), updated_at: new Date() },
          { id: 2, employee_name: 'Closed Ticket', ticket_id: '12103', status: 'pending', employee_email: 'emp2@test.com', store_number: '124', department: 'HR', created_at: new Date(), updated_at: new Date() }
        ]);
      }
      return Promise.resolve([]);
    });

    // Only ticket 12102 is open
    getOpenTickets.mockResolvedValue({
      items: [{ id: '1', displayId: '12102', subject: 'Test Ticket', status: 'Open' }],
      totalCount: 1
    });

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    expect(response.body.active).toHaveLength(1);
    expect(response.body.active[0].employee_name).toBe('Open Ticket');
    // Closed ticket checklist auto-completed
    expect(response.body.completed).toHaveLength(1);
    expect(response.body.completed[0].employee_name).toBe('Closed Ticket');
    expect(response.body.completed[0].status).toBe('completed');
  });
});
