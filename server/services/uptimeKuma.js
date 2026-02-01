const axios = require('axios');
const logger = require('../utils/logger');
const { MONITOR_STATUS } = require('../utils/constants');

// Parse a user-supplied URL to extract the origin and status-page slug.
// Handles URLs like:
//   https://host                              → origin + slug "everything"
//   https://host/status/myslug               → origin + slug "myslug"
//   https://host/api/status-page/myslug      → origin + slug "myslug"
function parseUptimeKumaUrl(inputUrl) {
  const url = inputUrl.replace(/\/+$/, '');

  const apiMatch = url.match(/^(https?:\/\/[^/]+)\/api\/status-page\/([^/]+)/);
  if (apiMatch) return { origin: apiMatch[1], slug: apiMatch[2] };

  const statusMatch = url.match(/^(https?:\/\/[^/]+)\/status\/([^/]+)/);
  if (statusMatch) return { origin: statusMatch[1], slug: statusMatch[2] };

  const originMatch = url.match(/^(https?:\/\/[^/]+)/);
  return { origin: originMatch ? originMatch[1] : url, slug: 'everything' };
}

async function getNetworkStatus(baseUrl) {
  const { origin, slug } = parseUptimeKumaUrl(baseUrl);

  try {
    const client = axios.create({ baseURL: origin, timeout: 10000 });

    // Fetch status page data and heartbeats in parallel
    const [statusRes, heartbeatRes] = await Promise.all([
      client.get(`/api/status-page/${slug}`),
      client.get(`/api/status-page/heartbeat/${slug}`)
    ]);

    // Extract monitors from publicGroupList
    const groups = statusRes.data.publicGroupList || [];
    const monitors = groups.flatMap(group => group.monitorList || []);

    // heartbeatList is keyed by monitor ID, each value is an array sorted oldest→newest
    const heartbeatList = heartbeatRes.data.heartbeatList || {};
    const uptimeList = heartbeatRes.data.uptimeList || {};

    // Determine current status for each monitor from its latest heartbeat
    const items = [];
    for (const monitor of monitors) {
      const beats = heartbeatList[monitor.id];
      if (!beats || beats.length === 0) continue;

      const latest = beats[beats.length - 1];
      if (latest.status === MONITOR_STATUS.UP) continue;

      let status;
      switch (latest.status) {
        case MONITOR_STATUS.DOWN:
          status = 'down';
          break;
        case MONITOR_STATUS.PENDING:
          status = 'pending';
          break;
        case MONITOR_STATUS.MAINTENANCE:
          status = 'maintenance';
          break;
        default:
          status = 'unknown';
      }

      items.push({
        id: monitor.id,
        name: monitor.name,
        status,
        url: monitor.url || null,
        lastPing: latest.ping,
        uptime: uptimeList[`${monitor.id}_24`] ?? null
      });
    }

    return {
      sourceUrl: `${origin}/status/${slug}`,
      totalMonitors: monitors.length,
      items
    };
  } catch (error) {
    logger.error('Uptime Kuma API error', { service: 'uptime-kuma', error: error.message });
    return { sourceUrl: origin, totalMonitors: 0, items: [] };
  }
}

async function getMonthlyUptime(baseUrl) {
  const { origin, slug } = parseUptimeKumaUrl(baseUrl);

  try {
    const client = axios.create({ baseURL: origin, timeout: 10000 });

    const [statusRes, heartbeatRes] = await Promise.all([
      client.get(`/api/status-page/${slug}`),
      client.get(`/api/status-page/heartbeat/${slug}`)
    ]);

    const groups = statusRes.data.publicGroupList || [];
    const monitors = groups.flatMap(group => group.monitorList || []);
    const uptimeList = heartbeatRes.data.uptimeList || {};

    const items = monitors.map(monitor => ({
      id: monitor.id,
      name: monitor.name,
      uptime: uptimeList[`${monitor.id}_720`] ?? null
    }));

    return {
      sourceUrl: `${origin}/status/${slug}`,
      items
    };
  } catch (error) {
    logger.error('Uptime Kuma monthly uptime API error', { service: 'uptime-kuma', error: error.message });
    return { sourceUrl: origin, items: [] };
  }
}

module.exports = { getNetworkStatus, getMonthlyUptime, parseUptimeKumaUrl };
