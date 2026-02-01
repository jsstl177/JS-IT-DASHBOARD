const axios = require('axios');
const https = require('https');

const SERVICE_TIMEOUT = 5000;

async function testUptimeKuma(config) {
  const client = axios.create({ baseURL: config.base_url, timeout: SERVICE_TIMEOUT });
  await client.get('/api/status-page/everything');
  return { success: true, message: 'Uptime Kuma is reachable and responding.' };
}

async function testSuperOps(config) {
  const { extractSubdomain } = require('./superOps');
  const subdomain = extractSubdomain(config.base_url);

  const response = await axios.post(
    'https://api.superops.ai/msp',
    {
      query: `query getStatusList { getStatusList { statusId name } }`,
      variables: {}
    },
    {
      timeout: SERVICE_TIMEOUT,
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'CustomerSubDomain': subdomain,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.errors) {
    const msg = response.data.errors.map(e => e.message).join('; ');
    throw new Error(msg);
  }

  return { success: true, message: `SuperOps API authenticated successfully (subdomain: ${subdomain}).` };
}

async function testAutomationLog(config) {
  const client = axios.create({ baseURL: config.base_url, timeout: SERVICE_TIMEOUT });
  await client.get('/logs');
  return { success: true, message: 'Automation Log service is reachable and responding.' };
}

async function testN8N(config) {
  const client = axios.create({
    baseURL: config.base_url,
    timeout: SERVICE_TIMEOUT,
    headers: { 'X-N8N-API-KEY': config.api_key }
  });
  await client.get('/rest/executions', { params: { limit: 1 } });
  return { success: true, message: 'N8N API authenticated successfully.' };
}

async function testProxmox(config) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  await axios.post(`${config.base_url}/api2/json/access/ticket`, {
    username: config.username,
    password: config.password
  }, {
    httpsAgent,
    timeout: SERVICE_TIMEOUT
  });
  return { success: true, message: 'Proxmox authentication successful.' };
}

function testPowerBI(config) {
  const url = config.base_url;
  if (!url) {
    throw new Error('Power BI embed URL is not configured.');
  }
  const powerbiPattern = /^https:\/\/app\.powerbi\.com\/.+/i;
  if (!powerbiPattern.test(url)) {
    throw new Error('Power BI URL does not match the expected format (https://app.powerbi.com/...).');
  }
  return { success: true, message: 'Power BI embed URL format is valid.' };
}

async function testSmtp(config) {
  const nodemailer = require('nodemailer');
  const port = parseInt(config.api_key, 10);
  const transport = nodemailer.createTransport({
    host: config.base_url,
    port,
    secure: port === 465,
    auth: {
      user: config.username,
      pass: config.password
    }
  });
  await transport.verify();
  return { success: true, message: 'SMTP connection and authentication successful.' };
}

async function testServiceConnection(serviceType, config) {
  switch (serviceType) {
    case 'uptime-kuma':
      return testUptimeKuma(config);
    case 'superops':
      return testSuperOps(config);
    case 'automation-log':
      return testAutomationLog(config);
    case 'n8n':
      return testN8N(config);
    case 'proxmox':
      return testProxmox(config);
    case 'powerbi':
      return testPowerBI(config);
    case 'smtp':
      return testSmtp(config);
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

module.exports = { testServiceConnection };
