/**
 * @fileoverview Automation log service for fetching automation status and logs.
 */

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetches automation logs and status from the automation log service.
 * @param {string} baseUrl - Base URL of the automation log service
 * @returns {Promise<Object>} Object containing sourceUrl, status, and log items
 */
async function getAutomationLogs(baseUrl) {
  try {
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    // Fetch logs and status in parallel
    const [logsRes, statusRes] = await Promise.all([
      client.get('/api/logs'),
      client.get('/api/status')
    ]);

    const logs = logsRes.data.logs || [];
    const status = statusRes.data || {};

    return {
      sourceUrl: baseUrl,
      status: {
        color: status.status_color || '#666666',
        running: !!status.automation_running,
        queueCount: status.queue_count || 0,
        cooldownRemaining: status.cooldown_remaining || 0,
        fileCounts: status.file_counts || { total_files: 0, new_accounts: 0, purchasing_po: 0 },
        tasks: status.tasks || []
      },
      items: logs
    };
  } catch (error) {
    logger.error('Automation Log API error', { service: 'automation-log', error: error.message });
    return { sourceUrl: baseUrl, status: null, items: [] };
  }
}

module.exports = { getAutomationLogs };
