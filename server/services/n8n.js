/**
 * @fileoverview N8N service for fetching workflow execution history.
 */

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetches recent workflow executions from N8N.
 * @param {string} baseUrl - Base URL of the N8N instance
 * @param {string} apiKey - N8N API key for authentication
 * @returns {Promise<Object>} Object containing sourceUrl and execution items
 */
async function getWorkflowExecutions(baseUrl, apiKey) {
  try {
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: { 'X-N8N-API-KEY': apiKey }
    });

    const response = await client.get('/rest/executions', {
      params: { limit: 20 }
    });

    const executions = response.data.data || [];
    return {
      sourceUrl: baseUrl,
      items: executions.map(execution => ({
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName,
        status: execution.status,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        mode: execution.mode,
        link: `${baseUrl}/workflow/${execution.workflowId}/executions/${execution.id}`
      }))
    };
  } catch (error) {
    logger.error('N8N API error', { service: 'n8n', error: error.message });
    return { sourceUrl: baseUrl, items: [] };
  }
}

module.exports = { getWorkflowExecutions };
