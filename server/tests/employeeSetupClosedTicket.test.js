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

const employeeSetupRoutes = require('../routes/employeeSetup');
const { getOpenTickets } = require('../services/superOps');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', employeeSetupRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

const app = createApp();

describe('Employee Setup - Closed Ticket Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock dbGet to return SuperOps settings by default
    dbGet.mockResolvedValue({
      api_key: 'test-api-key',
      base_url: 'https://test.superops.com'
    });
    // Mock dbRun for auto-complete updates
    dbRun.mockResolvedValue({ lastID: 0, changes: 1 });
  });

  it('should include checklists with no ticket ID in active and auto-complete closed ticket checklists', async () => {
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'Employee No Ticket', status: 'pending' },
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001', status: 'pending' }
        ]);
      }
      return Promise.resolve([]);
    });

    // No open tickets — TK-001 is closed
    getOpenTickets.mockResolvedValue({ items: [], totalCount: 0 });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    // No-ticket checklist stays active
    expect(response.body.active).toHaveLength(1);
    expect(response.body.active[0].employee_name).toBe('Employee No Ticket');
    // Closed-ticket checklist auto-completed
    expect(response.body.completed).toHaveLength(1);
    expect(response.body.completed[0].employee_name).toBe('Test Employee');
    expect(response.body.completed[0].status).toBe('completed');
  });

  it('should auto-complete checklists with closed tickets', async () => {
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001', status: 'in_progress' }
        ]);
      }
      return Promise.resolve([]);
    });

    getOpenTickets.mockResolvedValue({ items: [], totalCount: 0 });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(response.body.active).toHaveLength(0);
    expect(response.body.completed).toHaveLength(1);
    expect(response.body.completed[0].status).toBe('completed');
    // Verify the DB was updated
    expect(dbRun).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE employee_setup_checklist'),
      expect.arrayContaining(['completed', 2])
    );
  });

  it('should include checklists with open tickets in active', async () => {
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001', status: 'pending' }
        ]);
      }
      return Promise.resolve([]);
    });

    getOpenTickets.mockResolvedValue({
      items: [{ id: 'TK-001', displayId: 'TK-001' }],
      totalCount: 1
    });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(response.body.active).toHaveLength(1);
    expect(response.body.active[0].ticket_id).toBe('TK-001');
    expect(response.body.completed).toHaveLength(0);
  });

  it('should handle multiple checklists with mixed ticket statuses', async () => {
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'No Ticket Employee', status: 'pending' },
          { id: 2, employee_name: 'Open Ticket Employee', ticket_id: 'TK-001', status: 'pending' },
          { id: 3, employee_name: 'Closed Ticket Employee', ticket_id: 'TK-002', status: 'pending' }
        ]);
      }
      return Promise.resolve([]);
    });

    getOpenTickets.mockResolvedValue({
      items: [{ id: 'TK-001', displayId: 'TK-001' }],
      totalCount: 1
    });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    // Active: no-ticket + open-ticket
    expect(response.body.active).toHaveLength(2);
    expect(response.body.active.find(c => c.employee_name === 'No Ticket Employee')).toBeDefined();
    expect(response.body.active.find(c => c.employee_name === 'Open Ticket Employee')).toBeDefined();
    // Completed: closed-ticket auto-completed
    expect(response.body.completed).toHaveLength(1);
    expect(response.body.completed[0].employee_name).toBe('Closed Ticket Employee');
    expect(response.body.completed[0].status).toBe('completed');
  });
});
