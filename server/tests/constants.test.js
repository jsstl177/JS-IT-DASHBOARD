/**
 * @fileoverview Tests for application constants.
 */

const { MONITOR_STATUS, CHECKLIST_STATUS, ALLOWED_STATUSES } = require('../utils/constants');

describe('Constants', () => {
  describe('MONITOR_STATUS', () => {
    test('should define all Uptime Kuma status codes', () => {
      expect(MONITOR_STATUS.DOWN).toBe(0);
      expect(MONITOR_STATUS.UP).toBe(1);
      expect(MONITOR_STATUS.PENDING).toBe(2);
      expect(MONITOR_STATUS.MAINTENANCE).toBe(3);
    });

    test('should have exactly 4 status codes', () => {
      expect(Object.keys(MONITOR_STATUS)).toHaveLength(4);
    });
  });

  describe('CHECKLIST_STATUS', () => {
    test('should define all checklist status values', () => {
      expect(CHECKLIST_STATUS.PENDING).toBe('pending');
      expect(CHECKLIST_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(CHECKLIST_STATUS.COMPLETED).toBe('completed');
      expect(CHECKLIST_STATUS.NA).toBe('na');
    });

    test('should have exactly 4 status values', () => {
      expect(Object.keys(CHECKLIST_STATUS)).toHaveLength(4);
    });
  });

  describe('ALLOWED_STATUSES', () => {
    test('should contain all checklist status values', () => {
      expect(ALLOWED_STATUSES).toContain('pending');
      expect(ALLOWED_STATUSES).toContain('in_progress');
      expect(ALLOWED_STATUSES).toContain('completed');
      expect(ALLOWED_STATUSES).toContain('na');
    });

    test('should have exactly 4 entries', () => {
      expect(ALLOWED_STATUSES).toHaveLength(4);
    });

    test('should match CHECKLIST_STATUS values', () => {
      const statusValues = Object.values(CHECKLIST_STATUS);
      expect(ALLOWED_STATUSES).toEqual(expect.arrayContaining(statusValues));
      expect(statusValues).toEqual(expect.arrayContaining(ALLOWED_STATUSES));
    });
  });
});
