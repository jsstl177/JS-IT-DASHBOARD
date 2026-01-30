const axios = require('axios');
const logger = require('../utils/logger');

async function getOpenTickets(baseUrl, apiKey) {
  try {
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const response = await client.get('/api/tickets', {
      params: { status: 'open' }
    });

    const tickets = response.data.tickets || response.data || [];
    return {
      sourceUrl: `${baseUrl}/ticket`,
      items: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title || ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        assignee: ticket.assignee,
        link: `${baseUrl}/ticket/${ticket.id}`
      }))
    };
  } catch (error) {
    logger.error('SuperOps API error', { service: 'superops', error: error.message });
    return { sourceUrl: baseUrl, items: [] };
  }
}

module.exports = { getOpenTickets };
