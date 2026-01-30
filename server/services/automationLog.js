const axios = require('axios');
const logger = require('../utils/logger');

async function getAutomationLogs(baseUrl) {
  try {
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const response = await client.get('/logs');

    const logs = response.data.logs || response.data || [];
    // Return last 10 logs or recent ones
    return {
      sourceUrl: baseUrl,
      items: logs.slice(-10).map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        source: log.source || 'automation'
      }))
    };
  } catch (error) {
    logger.error('Automation Log API error', { service: 'automation-log', error: error.message });
    return { sourceUrl: baseUrl, items: [] };
  }
}

module.exports = { getAutomationLogs };
