const axios = require('axios');

async function getWorkflowExecutions(baseUrl, apiKey) {
  try {
    const response = await axios.get(`${baseUrl}/rest/executions`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      },
      timeout: 10000,
      params: {
        limit: 20 // Get last 20 executions
      }
    });

    const executions = response.data.data || [];
    return executions.map(execution => ({
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
      status: execution.status,
      startedAt: execution.startedAt,
      stoppedAt: execution.stoppedAt,
      mode: execution.mode,
      link: `${baseUrl}/workflow/${execution.workflowId}/executions/${execution.id}`
    }));
  } catch (error) {
    console.error('N8N API error:', error.message);
    return [];
  }
}

module.exports = { getWorkflowExecutions };