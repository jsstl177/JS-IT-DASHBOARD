const express = require('express');
const { getNetworkStatus, getMonthlyUptime } = require('../services/uptimeKuma');
const { getOpenTickets, createTicket, getAlerts, getAssets, resolveAlert } = require('../services/superOps');
const { getAutomationLogs } = require('../services/automationLog');
const { getWorkflowExecutions } = require('../services/n8n');
const { getProxmoxStatus } = require('../services/proxmox');
const { getPowerBIEmbedInfo } = require('../services/powerbi');
const { asyncHandler } = require('../middleware/errorHandler');
const { decrypt } = require('../utils/crypto');
const { dbAll, dbGet, dbRun } = require('../utils/dbHelpers');
const { defaultChecklistItems } = require('../utils/checklistData');
const logger = require('../utils/logger');

const router = express.Router();

// Get all dashboard data
router.get('/data', asyncHandler(async (req, res) => {
  logger.info('Fetching dashboard data');

  const settings = await getSettingsFromDB();

  const results = {
    networkStatus: { sourceUrl: null, totalMonitors: 0, items: [] },
    openTickets: { sourceUrl: null, items: [], totalCount: 0 },
    automationLogs: { sourceUrl: null, status: null, items: [] },
    n8nExecutions: { sourceUrl: null, items: [] },
    proxmoxStatus: { sourceUrl: null, items: [] },
    monthlyUptime: { sourceUrl: null, items: [] },
    alerts: { sourceUrl: null, items: [], totalCount: 0 },
    assets: { sourceUrl: null, items: [], totalCount: 0 },
    powerbiInfo: null,
    superOpsDoc: { sourceUrl: null, docUrl: null },
     employeeSetup: []
  };

  // Fetch custom links for the current user
  try {
    const userId = req.user?.id;
    if (userId) {
      const customLinks = await dbAll(
        'SELECT id, label, url, sort_order FROM custom_links WHERE user_id = ? ORDER BY sort_order, created_at',
        [userId]
      );
      results.customLinks = customLinks;
    } else {
      results.customLinks = [];
    }
  } catch (err) {
    logger.warn('Error fetching custom links:', err.message);
    results.customLinks = [];
  }

  // Fetch data from each service with timeout and error handling
  const promises = settings.map(async (setting) => {
    try {
      switch (setting.service) {
        case 'uptime-kuma':
          if (setting.base_url) {
            const [netStatus, monthly] = await Promise.all([
              Promise.race([getNetworkStatus(setting.base_url), timeoutPromise(10000, 'Uptime Kuma timeout')]),
              Promise.race([getMonthlyUptime(setting.base_url), timeoutPromise(10000, 'Uptime Kuma monthly timeout')])
            ]);
            results.networkStatus = netStatus;
            results.monthlyUptime = monthly;
          }
          break;
        case 'superops':
          if (setting.base_url && setting.api_key) {
            const [tickets, alertData, assetData] = await Promise.all([
              Promise.race([getOpenTickets(setting.base_url, setting.api_key), timeoutPromise(10000, 'SuperOps tickets timeout')]),
              Promise.race([getAlerts(setting.base_url, setting.api_key), timeoutPromise(10000, 'SuperOps alerts timeout')]),
              Promise.race([getAssets(setting.base_url, setting.api_key), timeoutPromise(15000, 'SuperOps assets timeout')])
            ]);
            results.openTickets = tickets;
            results.alerts = alertData;
            results.assets = assetData;
            
            // Build SuperOps documentation URL
            const cleanUrl = setting.base_url.replace(/\/+$/, '');
            results.superOpsDoc = {
              sourceUrl: cleanUrl,
              docUrl: `${cleanUrl}/#/rmm/itdoc/Password&&1001`
            };
          }
          break;
        case 'automation-log':
          if (setting.base_url) {
            results.automationLogs = await Promise.race([
              getAutomationLogs(setting.base_url),
              timeoutPromise(10000, 'Automation Log timeout')
            ]);
          }
          break;
        case 'n8n':
          if (setting.base_url && setting.api_key) {
            results.n8nExecutions = await Promise.race([
              getWorkflowExecutions(setting.base_url, setting.api_key),
              timeoutPromise(10000, 'N8N timeout')
            ]);
          }
          break;
        case 'proxmox':
          if (setting.base_url && setting.api_key && setting.api_secret) {
            // API Token authentication: api_key = token ID (e.g., root@pam!dashboard), api_secret = UUID
            results.proxmoxStatus = await Promise.race([
              getProxmoxStatus(setting.base_url, setting.api_key, setting.api_secret),
              timeoutPromise(15000, 'Proxmox timeout')
            ]);
          }
          break;
        case 'powerbi':
          if (setting.base_url) {
            results.powerbiInfo = getPowerBIEmbedInfo(setting.base_url);
          }
          break;
      }
    } catch (error) {
      logger.warn(`Error fetching data for ${setting.service}:`, error.message);
      // Continue with other services - don't fail the entire request
    }
  });

  await Promise.allSettled(promises);

  // Auto-create employee setup checklists from "New Employee:" tickets
  try {
    const tickets = results.openTickets.items || [];
    for (const ticket of tickets) {
      if (
        ticket.title &&
        ticket.title.includes('New Employee:') &&
        ticket.requester &&
        (ticket.requester.toLowerCase().includes('emailapi@powerofjs.com') ||
         ticket.requester.toLowerCase() === 'email api')
      ) {
        const nameMatch = ticket.title.match(/New Employee:\s*(.+)/i);
        if (nameMatch) {
          const employeeName = nameMatch[1].trim();
          const existing = await dbGet(
            'SELECT id FROM employee_setup_checklist WHERE employee_name = ?',
            [employeeName]
          );
          if (!existing) {
            const result = await dbRun(
              'INSERT INTO employee_setup_checklist (employee_name, ticket_id) VALUES (?, ?)',
              [employeeName, ticket.displayId || ticket.id]
            );
            const checklistId = result.lastID;
            for (const item of defaultChecklistItems) {
              await dbRun(
                'INSERT INTO checklist_items (checklist_id, category, item_name, description) VALUES (?, ?, ?, ?)',
                [checklistId, item.category, item.item_name, item.description]
              );
            }
            logger.info(`Auto-created employee setup checklist for: ${employeeName} (ticket: ${ticket.displayId})`);
          }
        }
      }
    }
  } catch (err) {
    logger.warn('Error auto-creating employee checklists:', err.message);
  }

  logger.info('Dashboard data fetched successfully');
  res.json(results);
}));

// Helper function to get settings from database, decrypting sensitive fields
async function getSettingsFromDB() {
  const rows = await dbAll('SELECT * FROM settings');
  return rows.map(row => ({
    ...row,
    api_key: decrypt(row.api_key),
    api_secret: decrypt(row.api_secret),
    password: decrypt(row.password)
  }));
}

// Timeout helper function
function timeoutPromise(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

// Create case via SuperOps API
router.post('/create-case', asyncHandler(async (req, res) => {
  const { customer, description } = req.body;

  if (!customer || !description) {
    return res.status(400).json({ error: 'Customer and description are required' });
  }

  const settings = await getSettingsFromDB();
  const superops = settings.find(s => s.service === 'superops');

  if (!superops || !superops.base_url || !superops.api_key) {
    return res.status(400).json({ error: 'SuperOps is not configured. Please add SuperOps settings first.' });
  }

  const ticket = await createTicket(superops.base_url, superops.api_key, {
    subject: description,
    description: `Customer: ${customer}\n\nIssue: ${description}`
  });

  logger.info(`Case created in SuperOps for customer: ${customer}, ticket: ${ticket.displayId}`);
  res.json({ success: true, ticket });
}));

// Resolve alert via SuperOps API
router.post('/resolve-alert', asyncHandler(async (req, res) => {
  const { alertId } = req.body;

  if (!alertId) {
    return res.status(400).json({ error: 'Alert ID is required' });
  }

  const settings = await getSettingsFromDB();
  const superops = settings.find(s => s.service === 'superops');

  if (!superops || !superops.base_url || !superops.api_key) {
    return res.status(400).json({ error: 'SuperOps is not configured. Please add SuperOps settings first.' });
  }

  const resolvedAlert = await resolveAlert(superops.base_url, superops.api_key, alertId);

  logger.info(`Alert resolved: ${alertId}`);
  res.json({ success: true, alert: resolvedAlert });
}));

// Custom Links CRUD endpoints
router.get('/custom-links', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const links = await dbAll(
    'SELECT id, label, url, sort_order FROM custom_links WHERE user_id = ? ORDER BY sort_order, created_at',
    [userId]
  );
  res.json(links);
}));

router.post('/custom-links', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { label, url } = req.body;
  if (!label || !url) {
    return res.status(400).json({ error: 'Label and URL are required' });
  }

  // Get next sort order
  const maxOrder = await dbGet(
    'SELECT MAX(sort_order) as maxOrder FROM custom_links WHERE user_id = ?',
    [userId]
  );
  const sortOrder = (maxOrder?.maxOrder || 0) + 1;

  const result = await dbRun(
    'INSERT INTO custom_links (user_id, label, url, sort_order) VALUES (?, ?, ?, ?)',
    [userId, label, url, sortOrder]
  );

  logger.info(`Custom link created for user ${userId}: ${label}`);
  res.json({ success: true, id: result.lastID });
}));

router.put('/custom-links/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const linkId = req.params.id;
  const { label, url, sort_order } = req.body;

  if (!label || !url) {
    return res.status(400).json({ error: 'Label and URL are required' });
  }

  const existing = await dbGet(
    'SELECT id FROM custom_links WHERE id = ? AND user_id = ?',
    [linkId, userId]
  );

  if (!existing) {
    return res.status(404).json({ error: 'Link not found' });
  }

  await dbRun(
    'UPDATE custom_links SET label = ?, url = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [label, url, sort_order || 0, linkId, userId]
  );

  logger.info(`Custom link updated for user ${userId}: ${label}`);
  res.json({ success: true });
}));

router.delete('/custom-links/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const linkId = req.params.id;

  const result = await dbRun(
    'DELETE FROM custom_links WHERE id = ? AND user_id = ?',
    [linkId, userId]
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Link not found' });
  }

  logger.info(`Custom link deleted for user ${userId}: ${linkId}`);
  res.json({ success: true });
}));

module.exports = router;
