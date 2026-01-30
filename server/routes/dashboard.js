const express = require('express');
const db = require('../db');
const { getNetworkStatus } = require('../services/uptimeKuma');
const { getOpenTickets } = require('../services/superOps');
const { getAutomationLogs } = require('../services/automationLog');
const { getWorkflowExecutions } = require('../services/n8n');
const { getProxmoxStatus } = require('../services/proxmox');
const { getPowerBIEmbedInfo } = require('../services/powerbi');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Get all dashboard data
router.get('/data', asyncHandler(async (req, res) => {
  logger.info('Fetching dashboard data');

  const settings = await getSettingsFromDB();

    const results = {
      networkStatus: [],
      openTickets: [],
      automationLogs: [],
      n8nExecutions: [],
      proxmoxStatus: [],
      powerbiInfo: null,
      employeeSetup: []
    };

  // Fetch data from each service with timeout and error handling
  const promises = settings.map(async (setting) => {
    try {
      switch (setting.service) {
        case 'uptime-kuma':
          if (setting.base_url) {
            results.networkStatus = await Promise.race([
              getNetworkStatus(setting.base_url),
              timeoutPromise(10000, 'Uptime Kuma timeout')
            ]);
          }
          break;
        case 'superops':
          if (setting.base_url && setting.api_key) {
            results.openTickets = await Promise.race([
              getOpenTickets(setting.base_url, setting.api_key),
              timeoutPromise(10000, 'SuperOps timeout')
            ]);
          }
          break;
        case 'automation-log':
          if (setting.base_url) {
            results.automationLogs = await Promise.race([
              getAutomationLogs(setting.base_url),
              timeoutPromise(10000, 'Automation Log timeout')
            ]);
          }
          break;
        case 'n8n':
          if (setting.base_url && setting.api_key) {
            results.n8nExecutions = await Promise.race([
              getWorkflowExecutions(setting.base_url, setting.api_key),
              timeoutPromise(10000, 'N8N timeout')
            ]);
          }
          break;
        case 'proxmox':
          if (setting.base_url && setting.username && setting.password) {
            const nodeNames = setting.api_key ? setting.api_key.split(',').map(s => s.trim()) : [];
            results.proxmoxStatus = await Promise.race([
              getProxmoxStatus(setting.base_url, setting.username, setting.password, nodeNames),
              timeoutPromise(15000, 'Proxmox timeout')
            ]);
          }
          break;
        case 'powerbi':
          if (setting.base_url) {
            results.powerbiInfo = getPowerBIEmbedInfo(setting.base_url);
          }
          break;
      }
    } catch (error) {
      logger.warn(`Error fetching data for ${setting.service}:`, error.message);
      // Continue with other services - don't fail the entire request
    }
  });

  await Promise.allSettled(promises);

  logger.info('Dashboard data fetched successfully');
  res.json(results);
}));

// Helper function to get settings from database
function getSettingsFromDB() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
      if (err) {
        logger.error('Database error fetching settings:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Timeout helper function
function timeoutPromise(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

module.exports = router;
