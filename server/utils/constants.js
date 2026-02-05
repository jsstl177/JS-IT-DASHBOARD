/**
 * @fileoverview Application-wide constants for status values and configurations.
 */

/**
 * Monitor status codes used by Uptime Kuma.
 * @enum {number}
 */
const MONITOR_STATUS = {
  DOWN: 0,
  UP: 1,
  PENDING: 2,
  MAINTENANCE: 3
};

/**
 * Status values for employee setup checklists and checklist items.
 * @enum {string}
 */
const CHECKLIST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  NA: 'na'
};

/**
 * Array of valid checklist status values for validation.
 * @type {string[]}
 */
const ALLOWED_STATUSES = [
  CHECKLIST_STATUS.PENDING,
  CHECKLIST_STATUS.IN_PROGRESS,
  CHECKLIST_STATUS.COMPLETED,
  CHECKLIST_STATUS.NA
];

module.exports = { MONITOR_STATUS, CHECKLIST_STATUS, ALLOWED_STATUSES };
