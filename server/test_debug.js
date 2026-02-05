const request = require('supertest');
const express = require('express');
const { dbAll } = require('./utils/dbHelpers');

// Mock dependencies
jest.mock('./services/superOps', () => ({
  getOpenTickets: jest.fn()
}));
jest.mock('./utils/dbHelpers', () => ({
  dbGet: jest.fn(),
  dbAll: jest.fn(),
  dbRun: jest.fn()
}));

const employeeSetupRoutes = require('./routes/employeeSetup');
const { getOpenTickets } = require('./services/superOps');

const app = express();
app.use(express.json());
app.use('/api', employeeSetupRoutes);

// Test
dbAll.mockResolvedValue([
  { id: 1, employee_name: 'Test' }
]);
getOpenTickets.mockResolvedValue([]);

request(app)
  .get('/api/employee-setup')
  .then(res => {
    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(res.body));
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
