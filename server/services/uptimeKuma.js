/**
 * @fileoverview Uptime Kuma service for fetching monitor status and uptime data.
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { MONITOR_STATUS } = require('../utils/constants');

/**
 * Parse a user-supplied URL to extract the origin and status-page slug.
// Handles URLs like:
//   https://host                              → origin + slug "everything"
//   https://host/status/myslug               → origin + slug "myslug"
//   https://host/api/status-page/myslug      → origin + slug "myslug"
 * @param {string} inputUrl - User-supplied Uptime Kuma URL
 * @returns {{origin: string, slug: string}} Object with origin URL and slug
 */
function parseUptimeKumaUrl(inputUrl) {
  const url = inputUrl.replace(/\/+$/, '');

  const apiMatch = url.match(/^(https?:\/\/[^/]+)\/api\/status-page\/([^/]+)/);
  if (apiMatch) return { origin: apiMatch[1], slug: apiMatch[2] };

  const statusMatch = url.match(/^(https?:\/\/[^/]+)\/status\/([^/]+)/);
  if (statusMatch) return { origin: statusMatch[1], slug: statusMatch[2] };

  const originMatch = url.match(/^(https?:\/\/[^/]+)/);
  return { origin: originMatch ? originMatch[1] : url, slug: 'everything' };
}

/**
 * Fetches network status from Uptime Kuma, returning only down/alerting monitors.
 * @param {string} baseUrl - Base URL of the Uptime Kuma status page
 * @returns {Promise<Object>} Object containing sourceUrl, totalMonitors, and items (down monitors only)
 */
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

/**
 * Fetches 30-day uptime percentage for all monitors.
 * @param {string} baseUrl - Base URL of the Uptime Kuma status page
 * @returns {Promise<Object>} Object containing sourceUrl and items with uptime percentages
 */
async function getMonthlyUptime(baseUrl) {
  const { origin, slug } = parseUptimeKumaUrl(baseUrl);

  try {
    const client = axios.create({ baseURL: origin, timeout: 10000 });

    const statusRes = await client.get(`/api/status-page/${slug}`);
    const groups = statusRes.data.publicGroupList || [];
    const monitors = groups.flatMap(group => group.monitorList || []);

    // Fetch 30-day uptime per monitor via the badge API (no auth required)
    const uptimeResults = await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const res = await client.get(`/api/badge/${monitor.id}/uptime/720`, { timeout: 5000, responseType: 'text' });
          const match = res.data.match(/>(\d+(?:\.\d+)?)%</);
          return match ? parseFloat(match[1]) / 100 : null;
        } catch {
          return null;
        }
      })
    );

    const items = monitors.map((monitor, idx) => ({
      id: monitor.id,
      name: monitor.name,
      uptime: uptimeResults[idx]
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

/**
 * Fetches 7-day uptime percentage for all monitors.
 * @param {string} baseUrl - Base URL of the Uptime Kuma status page
 * @returns {Promise<Object>} Object containing sourceUrl and items with uptime percentages
 */
async function getWeeklyUptime(baseUrl) {
  const { origin, slug } = parseUptimeKumaUrl(baseUrl);

  try {
    const client = axios.create({ baseURL: origin, timeout: 10000 });

    const statusRes = await client.get(`/api/status-page/${slug}`);
    const groups = statusRes.data.publicGroupList || [];
    const monitors = groups.flatMap(group => group.monitorList || []);

    // Fetch 7-day uptime per monitor via the badge API (no auth required)
    const uptimeResults = await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const res = await client.get(`/api/badge/${monitor.id}/uptime/168`, { timeout: 5000, responseType: 'text' });
          const match = res.data.match(/>(\d+(?:\.\d+)?)%</);
          return match ? parseFloat(match[1]) / 100 : null;
        } catch {
          return null;
        }
      })
    );

    const items = monitors.map((monitor, idx) => ({
      id: monitor.id,
      name: monitor.name,
      uptime: uptimeResults[idx]
    }));

    return {
      sourceUrl: `${origin}/status/${slug}`,
      items
    };
  } catch (error) {
    logger.error('Uptime Kuma weekly uptime API error', { service: 'uptime-kuma', error: error.message });
    return { sourceUrl: origin, items: [] };
  }
}

module.exports = { getNetworkStatus, getMonthlyUptime, getWeeklyUptime, parseUptimeKumaUrl };
