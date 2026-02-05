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
const { dbGet } = require('../utils/dbHelpers');

const employeeSetupRoutes = require('../routes/employeeSetup');
const { getOpenTickets } = require('../services/superOps');

// Build Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', employeeSetupRoutes);
  // Error handler for Express 5
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
  });

  it('should include checklists with no ticket ID regardless of open tickets', async () => {
    // Mock: one checklist without ticket, one with closed ticket
    const { dbAll } = require('../utils/dbHelpers');
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'Employee No Ticket' },
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001' }
        ]);
      }
      // Return empty for items to avoid circular reference
      return Promise.resolve([]);
    });

    // Mock no open tickets (TK-001 is closed)
    getOpenTickets.mockResolvedValue({
      items: [],
      totalCount: 0
    });

    const response = await request(app).get('/api/');
    console.log('Response status:', response.status);
    if (response.body.error) {
      console.log('Error message:', response.body.error);
    }

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Should include the checklist without a ticket
    const noTicketChecklist = response.body.find(c => c.employee_name === 'Employee No Ticket');
    expect(noTicketChecklist).toBeDefined();

    // Should NOT include the checklist with a closed ticket (TK-001) when open tickets can't be fetched
    const closedTicketChecklist = response.body.find(c => c.ticket_id === 'TK-001');
    expect(closedTicketChecklist).toBeUndefined();
  });

  it('should filter out checklists with closed tickets', async () => {
    // Mock: checklist with closed ticket
    const { dbAll } = require('../utils/dbHelpers');
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001' }
        ]);
      }
      // Return empty for items to avoid circular reference
      return Promise.resolve([]);
    });

    // Mock no open tickets (TK-001 is closed)
    getOpenTickets.mockResolvedValue({
      items: [],
      totalCount: 0
    });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Should NOT include the checklist with a closed ticket (TK-001) when open tickets can't be fetched
    const closedTicketChecklist = response.body.find(c => c.ticket_id === 'TK-001');
    expect(closedTicketChecklist).toBeUndefined();
  });

  it('should include checklists with open tickets', async () => {
    // Mock: checklist with open ticket
    const { dbAll } = require('../utils/dbHelpers');
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 2, employee_name: 'Test Employee', ticket_id: 'TK-001' }
        ]);
      }
      // Return empty for items to avoid circular reference
      return Promise.resolve([]);
    });

    // Mock: TK-001 is an open ticket
    getOpenTickets.mockResolvedValue({
      items: [
        { id: 'TK-001', displayId: 'TK-001' }
      ],
      totalCount: 1
    });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Should include the checklist with an open ticket (TK-001)
    const openTicketChecklist = response.body.find(c => c.ticket_id === 'TK-001');
    expect(openTicketChecklist).toBeDefined();
    expect(openTicketChecklist.employee_name).toBe('Test Employee');
  });

  it('should handle multiple checklists with mixed ticket statuses', async () => {
    // Mock: three checklists - one without ticket, one with open ticket, one with closed ticket
    const { dbAll } = require('../utils/dbHelpers');
    dbAll.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN checklist_items')) {
        return Promise.resolve([
          { id: 1, employee_name: 'No Ticket Employee' },
          { id: 2, employee_name: 'Open Ticket Employee', ticket_id: 'TK-001' },
          { id: 3, employee_name: 'Closed Ticket Employee', ticket_id: 'TK-002' }
        ]);
      }
      // Return empty for items to avoid circular reference
      return Promise.resolve([]);
    });

    // Mock: only TK-001 is open
    getOpenTickets.mockResolvedValue({
      items: [
        { id: 'TK-001', displayId: 'TK-001' }
      ],
      totalCount: 1
    });

    const response = await request(app).get('/api/');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Should include the checklist without a ticket
    const noTicketChecklist = response.body.find(c => c.employee_name === 'No Ticket Employee');
    expect(noTicketChecklist).toBeDefined();

    // Should include the checklist with an open ticket (TK-001)
    const openTicketChecklist = response.body.find(c => c.ticket_id === 'TK-001');
    expect(openTicketChecklist).toBeDefined();
    expect(openTicketChecklist.employee_name).toBe('Open Ticket Employee');

    // Should NOT include the checklist with a closed ticket (TK-002)
    const closedTicketChecklist = response.body.find(c => c.ticket_id === 'TK-002');
    expect(closedTicketChecklist).toBeUndefined();
  });
});