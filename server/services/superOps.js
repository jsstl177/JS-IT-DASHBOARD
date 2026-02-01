const axios = require('axios');
const logger = require('../utils/logger');

const SUPEROPS_API_URL = 'https://api.superops.ai/msp';

const TICKET_LIST_QUERY = `
query getTicketList($input: ListInfoInput!) {
  getTicketList(input: $input) {
    tickets {
      ticketId
      displayId
      subject
      status
      priority
      createdTime
      updatedTime
      technician
      requester
      client
      site
    }
    listInfo {
      totalCount
      hasMore
    }
  }
}`;

function extractSubdomain(tenantUrl) {
  try {
    const url = new URL(tenantUrl);
    const parts = url.hostname.split('.');
    // e.g. johnstonesupply-thewinesgroup.superops.ai → johnstonesupply-thewinesgroup
    if (parts.length >= 3 && parts.slice(-2).join('.') === 'superops.ai') {
      return parts.slice(0, -2).join('.');
    }
    return url.hostname;
  } catch {
    return tenantUrl;
  }
}

async function getOpenTickets(tenantUrl, apiKey) {
  const subdomain = extractSubdomain(tenantUrl);

  try {
    const response = await axios.post(
      SUPEROPS_API_URL,
      {
        query: TICKET_LIST_QUERY,
        variables: {
          input: {
            page: 1,
            pageSize: 100,
            condition: {
              attribute: 'status',
              operator: 'notIncludes',
              value: ['Resolved', 'Closed', 'Waiting on third party', 'On Hold']
            }
          }
        }
      },
      {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'CustomerSubDomain': subdomain,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      logger.error('SuperOps GraphQL errors', {
        service: 'superops',
        errors: response.data.errors
      });
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const data = response.data.data?.getTicketList;
    if (!data) {
      logger.warn('SuperOps returned no ticket list data');
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const tickets = (data.tickets || []).map(ticket => ({
      id: ticket.ticketId,
      displayId: ticket.displayId,
      title: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdTime: ticket.createdTime,
      updatedTime: ticket.updatedTime,
      technician: ticket.technician?.name || ticket.technician || null,
      requester: ticket.requester?.name || ticket.requester || null,
      client: ticket.client?.name || ticket.client || null,
      site: ticket.site?.name || ticket.site || null,
      link: `${tenantUrl.replace(/\/+$/, '')}/servicedesk/tickets/${ticket.displayId}`
    }));

    return {
      sourceUrl: `${tenantUrl.replace(/\/+$/, '')}/servicedesk/tickets`,
      items: tickets,
      totalCount: data.listInfo?.totalCount || tickets.length
    };
  } catch (error) {
    logger.error('SuperOps API error', {
      service: 'superops',
      error: error.message,
      status: error.response?.status
    });
    return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
  }
}

const CREATE_TICKET_MUTATION = `
mutation createTicket($input: CreateTicketInput!) {
  createTicket(input: $input) {
    ticketId
    displayId
    subject
    status
    priority
  }
}`;

async function createTicket(tenantUrl, apiKey, { subject, description }) {
  const subdomain = extractSubdomain(tenantUrl);

  const response = await axios.post(
    SUPEROPS_API_URL,
    {
      query: CREATE_TICKET_MUTATION,
      variables: {
        input: {
          subject,
          description
        }
      }
    },
    {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'CustomerSubDomain': subdomain,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.errors) {
    const msg = response.data.errors.map(e => e.message).join('; ');
    throw new Error(msg);
  }

  const ticket = response.data.data?.createTicket;
  if (!ticket) {
    throw new Error('SuperOps returned no ticket data');
  }

  return {
    ticketId: ticket.ticketId,
    displayId: ticket.displayId,
    subject: ticket.subject,
    link: `${tenantUrl.replace(/\/+$/, '')}/servicedesk/tickets/${ticket.displayId}`
  };
}

module.exports = { getOpenTickets, createTicket, extractSubdomain };
