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
      link: tenantUrl.replace(/\/+$/, '')
    }));

    return {
      sourceUrl: tenantUrl.replace(/\/+$/, ''),
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

const CLIENT_LIST_QUERY = `
query getClientList($input: ListInfoInput!) {
  getClientList(input: $input) {
    clients {
      accountId
      name
    }
    listInfo {
      totalCount
    }
  }
}`;

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

async function getFirstClient(tenantUrl, apiKey) {
  const subdomain = extractSubdomain(tenantUrl);

  const response = await axios.post(
    SUPEROPS_API_URL,
    {
      query: CLIENT_LIST_QUERY,
      variables: {
        input: { page: 1, pageSize: 1 }
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

  const clients = response.data.data?.getClientList?.clients;
  if (!clients || clients.length === 0) {
    throw new Error('No clients found in SuperOps');
  }

  return { accountId: clients[0].accountId, name: clients[0].name };
}

async function createTicket(tenantUrl, apiKey, { subject, description }) {
  const subdomain = extractSubdomain(tenantUrl);

  // Look up the first client to satisfy the required client field
  const client = await getFirstClient(tenantUrl, apiKey);

  const response = await axios.post(
    SUPEROPS_API_URL,
    {
      query: CREATE_TICKET_MUTATION,
      variables: {
        input: {
          subject,
          description,
          source: 'FORM',
          ticketType: 'INCIDENT',
          requestType: 'INCIDENT',
          client: { accountId: client.accountId }
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
    logger.error('SuperOps createTicket errors', { errors: response.data.errors });
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
    link: tenantUrl.replace(/\/+$/, '')
  };
}

const ALERT_LIST_QUERY = `
query getAlertList($input: ListInfoInput!) {
  getAlertList(input: $input) {
    alerts {
      id
      message
      createdTime
      status
      severity
      asset
      policy
    }
    listInfo {
      totalCount
      hasMore
    }
  }
}`;

async function getAlerts(tenantUrl, apiKey) {
  const subdomain = extractSubdomain(tenantUrl);

  try {
    const response = await axios.post(
      SUPEROPS_API_URL,
      {
        query: ALERT_LIST_QUERY,
        variables: {
          input: {
            page: 1,
            pageSize: 100,
            condition: {
              attribute: 'status',
              operator: 'notIncludes',
              value: ['Resolved', 'Closed']
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
      logger.error('SuperOps getAlertList errors', {
        service: 'superops',
        errors: response.data.errors
      });
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const data = response.data.data?.getAlertList;
    if (!data) {
      logger.warn('SuperOps returned no alert list data');
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const alerts = (data.alerts || []).map(alert => ({
      id: alert.id,
      message: alert.message,
      createdTime: alert.createdTime,
      status: alert.status,
      severity: alert.severity,
      asset: alert.asset?.name || alert.asset || null,
      policy: alert.policy?.name || alert.policy || null,
      link: tenantUrl.replace(/\/+$/, '')
    }));

    return {
      sourceUrl: tenantUrl.replace(/\/+$/, ''),
      items: alerts,
      totalCount: data.listInfo?.totalCount || alerts.length
    };
  } catch (error) {
    logger.error('SuperOps getAlerts error', {
      service: 'superops',
      error: error.message,
      status: error.response?.status
    });
    return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
  }
}

const ASSET_LIST_QUERY = `
query getAssetList($input: ListInfoInput!) {
  getAssetList(input: $input) {
    assets {
      assetId
      name
      assetClass
      client
      site
      serialNumber
      manufacturer
      model
      hostName
      platform
      status
      lastCommunicatedTime
    }
    listInfo {
      totalCount
      hasMore
    }
  }
}`;

async function getAssets(tenantUrl, apiKey) {
  const subdomain = extractSubdomain(tenantUrl);

  try {
    const response = await axios.post(
      SUPEROPS_API_URL,
      {
        query: ASSET_LIST_QUERY,
        variables: {
          input: {
            page: 1,
            pageSize: 500
          }
        }
      },
      {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'CustomerSubDomain': subdomain,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      logger.error('SuperOps getAssetList errors', {
        service: 'superops',
        errors: response.data.errors
      });
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const data = response.data.data?.getAssetList;
    if (!data) {
      logger.warn('SuperOps returned no asset list data');
      return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
    }

    const assets = (data.assets || []).map(asset => ({
      id: asset.assetId,
      name: asset.name,
      assetClass: asset.assetClass?.name || asset.assetClass || null,
      client: asset.client?.name || asset.client || null,
      site: asset.site?.name || asset.site || null,
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      hostName: asset.hostName,
      platform: asset.platform,
      status: asset.status,
      lastCommunicatedTime: asset.lastCommunicatedTime,
      link: tenantUrl.replace(/\/+$/, '')
    }));

    return {
      sourceUrl: tenantUrl.replace(/\/+$/, ''),
      items: assets,
      totalCount: data.listInfo?.totalCount || assets.length
    };
  } catch (error) {
    logger.error('SuperOps getAssets error', {
      service: 'superops',
      error: error.message,
      status: error.response?.status
    });
    return { sourceUrl: tenantUrl, items: [], totalCount: 0 };
  }
}

module.exports = { getOpenTickets, createTicket, extractSubdomain, getAlerts, getAssets };
