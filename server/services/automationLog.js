const axios = require('axios');

async function getAutomationLogs(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/logs`, {
      timeout: 10000
    });

    const logs = response.data.logs || response.data || [];
    // Return last 10 logs or recent ones
    return logs.slice(-10).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      source: log.source || 'automation'
    }));
  } catch (error) {
    console.error('Automation Log API error:', error.message);
    return [];
  }
}

module.exports = { getAutomationLogs };