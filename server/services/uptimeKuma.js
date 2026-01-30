const axios = require('axios');
const logger = require('../utils/logger');
const { MONITOR_STATUS } = require('../utils/constants');

async function getNetworkStatus(baseUrl) {
  try {
    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const response = await client.get('/api/status-page/everything');

    const monitors = response.data.monitors || [];
    // Filter only down or alerting monitors
    const issues = monitors.filter(monitor =>
      monitor.status === MONITOR_STATUS.DOWN || monitor.status === MONITOR_STATUS.ALERTING
    );

    return {
      sourceUrl: `${baseUrl}/status/everything`,
      items: issues.map(monitor => ({
        id: monitor.id,
        name: monitor.name,
        status: monitor.status === MONITOR_STATUS.DOWN ? 'down' : 'alerting',
        url: monitor.url,
        lastPing: monitor.ping,
        uptime: monitor.uptime
      }))
    };
  } catch (error) {
    logger.error('Uptime Kuma API error', { service: 'uptime-kuma', error: error.message });
    return { sourceUrl: baseUrl, items: [] };
  }
}

module.exports = { getNetworkStatus };
