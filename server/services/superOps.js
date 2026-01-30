const axios = require('axios');

async function getOpenTickets(baseUrl, apiKey) {
  try {
    const response = await axios.get(`${baseUrl}/api/tickets`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      params: {
        status: 'open' // Assuming API accepts status filter
      }
    });

    const tickets = response.data.tickets || response.data || [];
    return tickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title || ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      assignee: ticket.assignee,
      link: `${baseUrl}/ticket/${ticket.id}`
    }));
  } catch (error) {
    console.error('SuperOps API error:', error.message);
    return [];
  }
}

module.exports = { getOpenTickets };