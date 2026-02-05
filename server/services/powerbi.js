/**
 * @fileoverview Power BI service for parsing embed URLs.
 */

const logger = require('../utils/logger');

/**
 * Extracts Power BI report information from an embed URL.
 * @param {string} embedUrl - Power BI embed URL
 * @returns {Object|null} Object containing embedUrl, reportId, sourceUrl, and accessToken
 * @returns {null} Returns null if parsing fails
 */
function getPowerBIEmbedInfo(embedUrl) {
  try {
    // Extract report ID from URL
    const urlMatch = embedUrl.match(/reports\/([a-f0-9\-]+)/i);
    const reportId = urlMatch ? urlMatch[1] : null;

    return {
      embedUrl: embedUrl,
      reportId: reportId,
      sourceUrl: embedUrl,
      accessToken: null
    };
  } catch (error) {
    logger.error('Power BI URL parsing error', { service: 'powerbi', error: error.message });
    return null;
  }
}

module.exports = { getPowerBIEmbedInfo };
