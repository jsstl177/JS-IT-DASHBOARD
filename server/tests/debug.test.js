const request = require('supertest');
const express = require('express');
const { dbAll } = require('../utils/dbHelpers');

// Mock dependencies
jest.mock('../services/superOps', () => ({
  getOpenTickets: jest.fn()
}));
jest.mock('../utils/dbHelpers', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn()
}));

const employeeSetupRoutes = require('../routes/employeeSetup');
const { getOpenTickets } = require('../services/superOps');

const app = express();
app.use(express.json());
app.use('/api', employeeSetupRoutes);

describe('Debug test', () => {
  it('should show error', async () => {
    dbAll.mockResolvedValue([
      { id: 1, employee_name: 'Test' }
    ]);
    getOpenTickets.mockResolvedValue([]);

    const res = await request(app).get('/api/employee-setup');
    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(res.body));
  });
});
