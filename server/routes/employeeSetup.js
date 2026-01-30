const express = require('express');
const db = require('../db');
const { defaultChecklistItems } = require('../utils/checklistData');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Get all employee setup checklists
router.get('/', asyncHandler(async (req, res) => {
  logger.info('Fetching employee setup checklists');

  const checklists = await getAllChecklists();
  res.json(checklists);
}));

// Create new employee setup checklist
router.post('/', asyncHandler(async (req, res) => {
  const { employee_name, employee_email, store_number, ticket_id, department } = req.body;

  if (!employee_name) {
    return res.status(400).json({ error: 'Employee name is required' });
  }

  logger.info(`Creating checklist for employee: ${employee_name}`);

  const checklistId = await createChecklist({
    employee_name,
    employee_email,
    store_number,
    ticket_id,
    department
  });

  // Create default checklist items
  await createDefaultChecklistItems(checklistId);

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

  logger.info(`Updating checklist item ${itemId} to status: ${status}`);

  await updateChecklistItem(itemId, { status, notes });
  await updateChecklistTimestamp(checklistId);

  // Check if all items are completed
  const checklist = await getChecklistById(checklistId);
  const completedItems = checklist.items.filter(item =>
    item.status === 'completed' || item.status === 'na'
  ).length;
  const totalItems = checklist.items.length;

  if (completedItems === totalItems && checklist.status !== 'completed') {
    await updateChecklistStatus(checklistId, 'completed');
  } else if (completedItems > 0 && checklist.status === 'pending') {
    await updateChecklistStatus(checklistId, 'in_progress');
  }

  const updatedChecklist = await getChecklistById(checklistId);
  res.json(updatedChecklist);
}));

// Update checklist status
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  logger.info(`Updating checklist ${id} status to: ${status}`);

  await updateChecklistStatus(id, status);
  const checklist = await getChecklistById(id);
  res.json(checklist);
}));

// Delete checklist
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  logger.info(`Deleting checklist: ${id}`);

  await deleteChecklist(id);
  res.json({ message: 'Checklist deleted successfully' });
}));

// Helper functions
async function getAllChecklists() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT c.*,
             COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_items,
             COUNT(i.id) as total_items
      FROM employee_setup_checklist c
      LEFT JOIN checklist_items i ON c.id = i.checklist_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function getChecklistById(id) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT c.*,
             COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_items,
             COUNT(i.id) as total_items
      FROM employee_setup_checklist c
      LEFT JOIN checklist_items i ON c.id = i.checklist_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id], (err, checklist) => {
      if (err) reject(err);
      else if (checklist) {
        // Get checklist items
        db.all(`
          SELECT * FROM checklist_items
          WHERE checklist_id = ?
          ORDER BY category, item_name
        `, [id], (err, items) => {
          if (err) reject(err);
          else {
            checklist.items = items;
            resolve(checklist);
          }
        });
      } else {
        resolve(null);
      }
    });
  });
}

async function createChecklist(data) {
  return new Promise((resolve, reject) => {
    const { employee_name, employee_email, store_number, ticket_id, department } = data;
    db.run(`
      INSERT INTO employee_setup_checklist (employee_name, employee_email, store_number, ticket_id, department)
      VALUES (?, ?, ?, ?, ?)
    `, [employee_name, employee_email, store_number, ticket_id, department], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

async function createDefaultChecklistItems(checklistId) {
  const promises = defaultChecklistItems.map(item => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO checklist_items (checklist_id, category, item_name, description)
        VALUES (?, ?, ?, ?)
      `, [checklistId, item.category, item.item_name, item.description], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  });

  return Promise.all(promises);
}

async function updateChecklistItem(itemId, updates) {
  return new Promise((resolve, reject) => {
    const { status, notes } = updates;
    db.run(`
      UPDATE checklist_items
      SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, notes, itemId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function updateChecklistTimestamp(checklistId) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE employee_setup_checklist
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [checklistId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function updateChecklistStatus(checklistId, status) {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE employee_setup_checklist
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, checklistId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function deleteChecklist(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM employee_setup_checklist WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

module.exports = router;