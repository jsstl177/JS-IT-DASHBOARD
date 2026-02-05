const request = require('supertest');
const express = require('express');
const employeeSetupRouter = require('../routes/employeeSetup');
const pool = require('../db');
const { getOpenTickets } = require('../services/superOps');

jest.mock('../db');
jest.mock('../services/superOps');

const app = express();
app.use(express.json());
app.use('/api/employee-setup', employeeSetupRouter);

describe('Employee Setup - SuperOps 401 Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display all checklists when SuperOps returns 401 error', async () => {
    // Mock database to return SuperOps settings
    pool.execute = jest.fn()
      .mockResolvedValueOnce([[{ api_key: 'test-key', base_url: 'https://test.superops.ai' }]]) // SuperOps settings
      .mockResolvedValueOnce([[ // All checklists
        { id: 1, employee_name: 'Employee 1', ticket_id: '12102', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', status: 'pending', created_at: new Date(), updated_at: new Date() },
        { id: 2, employee_name: 'Employee 2', ticket_id: '12103', employee_email: 'emp2@test.com', store_number: '124', department: 'HR', status: 'pending', created_at: new Date(), updated_at: new Date() },
        { id: 3, employee_name: 'Employee 3', ticket_id: null, employee_email: 'emp3@test.com', store_number: '125', department: 'Sales', status: 'pending', created_at: new Date(), updated_at: new Date() }
      ]])
      .mockResolvedValue([[]]) // Empty items for each checklist
      .mockResolvedValue([[]]);

    // Mock SuperOps to throw 401 error
    const error = new Error('Request failed with status code 401');
    error.response = { status: 401 };
    getOpenTickets.mockRejectedValue(error);

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3); // All 3 checklists should be returned
    expect(response.body[0].employee_name).toBe('Employee 1');
    expect(response.body[0].ticket_id).toBe('12102');
    expect(response.body[1].employee_name).toBe('Employee 2');
    expect(response.body[2].employee_name).toBe('Employee 3');
    
    // Verify SuperOps was called
    expect(getOpenTickets).toHaveBeenCalledWith('https://test.superops.ai', 'test-key');
  });

  it('should display all checklists when SuperOps is not configured', async () => {
    // Mock database to return no SuperOps settings
    pool.execute = jest.fn()
      .mockResolvedValueOnce([[{ api_key: null, base_url: null }]]) // No SuperOps settings
      .mockResolvedValueOnce([[ // All checklists
        { id: 1, employee_name: 'Employee 1', ticket_id: '12102', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', status: 'pending', created_at: new Date(), updated_at: new Date() }
      ]])
      .mockResolvedValue([[]]); // Empty items

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].ticket_id).toBe('12102');
    
    // SuperOps should not be called when not configured
    expect(getOpenTickets).not.toHaveBeenCalled();
  });

  it('should filter checklists when SuperOps succeeds', async () => {
    // Mock database to return SuperOps settings
    pool.execute = jest.fn()
      .mockResolvedValueOnce([[{ api_key: 'test-key', base_url: 'https://test.superops.ai' }]]) // SuperOps settings
      .mockResolvedValueOnce([[ // All checklists
        { id: 1, employee_name: 'Open Ticket', ticket_id: '12102', employee_email: 'emp1@test.com', store_number: '123', department: 'IT', status: 'pending', created_at: new Date(), updated_at: new Date() },
        { id: 2, employee_name: 'Closed Ticket', ticket_id: '12103', employee_email: 'emp2@test.com', store_number: '124', department: 'HR', status: 'pending', created_at: new Date(), updated_at: new Date() }
      ]])
      .mockResolvedValue([[]]); // Empty items

    // Mock SuperOps to return only ticket 12102 as open
    getOpenTickets.mockResolvedValue({
      items: [
        { id: '1', displayId: '12102', subject: 'Test Ticket', status: 'Open' }
      ],
      totalCount: 1
    });

    const response = await request(app).get('/api/employee-setup');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1); // Only open ticket checklist
    expect(response.body[0].employee_name).toBe('Open Ticket');
    expect(response.body[0].ticket_id).toBe('12102');
  });
});