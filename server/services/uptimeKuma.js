const axios = require('axios');

async function getNetworkStatus(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/status-page/everything`, {
      timeout: 10000
    });

    const monitors = response.data.monitors || [];
    // Filter only down or alerting monitors
    const issues = monitors.filter(monitor =>
      monitor.status === 0 || monitor.status === 2 // 0=down, 2=alerting
    );

    return issues.map(monitor => ({
      id: monitor.id,
      name: monitor.name,
      status: monitor.status === 0 ? 'down' : 'alerting',
      url: monitor.url,
      lastPing: monitor.ping,
      uptime: monitor.uptime
    }));
  } catch (error) {
    console.error('Uptime Kuma API error:', error.message);
    return [];
  }
}

module.exports = { getNetworkStatus };