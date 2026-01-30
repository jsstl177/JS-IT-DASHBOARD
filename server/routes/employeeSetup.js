const express = require('express');
const { defaultChecklistItems } = require('../utils/checklistData');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateEmployeeSetup, validateStatus: isValidStatus } = require('../middleware/validation');
const { dbGet, dbAll, dbRun } = require('../utils/dbHelpers');
const { CHECKLIST_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

const router = express.Router();

// Get all employee setup checklists
router.get('/', asyncHandler(async (req, res) => {
  logger.info('Fetching employee setup checklists');

  const checklists = await dbAll(`
    SELECT c.*,
           COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_items,
           COUNT(i.id) as total_items
    FROM employee_setup_checklist c
    LEFT JOIN checklist_items i ON c.id = i.checklist_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);

  res.json(checklists);
}));

// Create new employee setup checklist
router.post('/', validateEmployeeSetup, asyncHandler(async (req, res) => {
  const { employee_name, employee_email, store_number, ticket_id, department } = req.body;

  logger.info(`Creating checklist for employee: ${employee_name}`);

  const result = await dbRun(`
    INSERT INTO employee_setup_checklist (employee_name, employee_email, store_number, ticket_id, department)
    VALUES (?, ?, ?, ?, ?)
  `, [employee_name, employee_email, store_number, ticket_id, department]);

  const checklistId = result.lastID;

  // Create default checklist items
  for (const item of defaultChecklistItems) {
    await dbRun(`
      INSERT INTO checklist_items (checklist_id, category, item_name, description)
      VALUES (?, ?, ?, ?)
    `, [checklistId, item.category, item.item_name, item.description]);
  }

  const checklist = await getChecklistById(checklistId);
  res.status(201).json(checklist);
}));

// Get specific checklist with items
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching checklist: ${id}`);

  const checklist = await getChecklistById(id);
  if (!checklist) {
    return res.status(404).json({ error: 'Checklist not found' });
  }

  res.json(checklist);
}));

// Update checklist item status
router.patch('/:checklistId/items/:itemId', asyncHandler(async (req, res) => {
  const { checklistId, itemId } = req.params;
  const { status, notes } = req.body;

  if (status && !isValidStatus(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  logger.info(`Updating checklist item ${itemId} to status: ${status}`);

  await dbRun(`
    UPDATE checklist_items
    SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, notes, itemId]);

  await dbRun(`
    UPDATE employee_setup_checklist
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [checklistId]);

  // Check if all items are completed
  const checklist = await getChecklistById(checklistId);
  const completedItems = checklist.items.filter(item =>
    item.status === CHECKLIST_STATUS.COMPLETED || item.status === CHECKLIST_STATUS.NA
  ).length;
  const totalItems = checklist.items.length;

  if (completedItems === totalItems && checklist.status !== CHECKLIST_STATUS.COMPLETED) {
    await dbRun(`
      UPDATE employee_setup_checklist
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [CHECKLIST_STATUS.COMPLETED, checklistId]);
  } else if (completedItems > 0 && checklist.status === CHECKLIST_STATUS.PENDING) {
    await dbRun(`
      UPDATE employee_setup_checklist
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [CHECKLIST_STATUS.IN_PROGRESS, checklistId]);
  }

  const updatedChecklist = await getChecklistById(checklistId);
  res.json(updatedChecklist);
}));

// Update checklist status
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidStatus(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  logger.info(`Updating checklist ${id} status to: ${status}`);

  await dbRun(`
    UPDATE employee_setup_checklist
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, id]);

  const checklist = await getChecklistById(id);
  res.json(checklist);
}));

// Delete checklist
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Deleting checklist: ${id}`);

  await dbRun('DELETE FROM employee_setup_checklist WHERE id = ?', [id]);
  res.json({ message: 'Checklist deleted successfully' });
}));

// Helper function
async function getChecklistById(id) {
  const checklist = await dbGet(`
    SELECT c.*,
           COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_items,
           COUNT(i.id) as total_items
    FROM employee_setup_checklist c
    LEFT JOIN checklist_items i ON c.id = i.checklist_id
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);

  if (!checklist) return null;

  const items = await dbAll(`
    SELECT * FROM checklist_items
    WHERE checklist_id = ?
    ORDER BY category, item_name
  `, [id]);

  checklist.items = items;
  return checklist;
}

module.exports = router;
