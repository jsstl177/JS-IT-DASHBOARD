/**
 * @fileoverview Tests for the Logger utility.
 */

// Mock fs before requiring logger
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  appendFile: jest.fn((path, data, cb) => cb(null))
}));

// Mock the db module to prevent database connection during tests
jest.mock('../db', () => ({
  execute: jest.fn().mockResolvedValue([[]]),
  end: jest.fn().mockResolvedValue(undefined)
}));

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger = require('../utils/logger');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log info messages to console', () => {
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO: Test info message')
    );
  });

  test('should log warn messages to console', () => {
    logger.warn('Test warning');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARN: Test warning')
    );
  });

  test('should log error messages to console', () => {
    logger.error('Test error');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR: Test error')
    );
  });

  test('should include metadata in log output', () => {
    logger.info('Test with meta', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"key":"value"')
    );
  });

  test('should handle Error objects in metadata', () => {
    const error = new Error('Test error object');
    logger.error('Error occurred', error);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test error object')
    );
  });

  test('should handle Error values within metadata object', () => {
    const error = new Error('Nested error');
    logger.error('Error occurred', { error });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Nested error')
    );
  });

  test('should include ISO timestamp in log output', () => {
    logger.info('Timestamp test');
    const logOutput = consoleSpy.mock.calls[0][0];
    // ISO timestamp format: YYYY-MM-DDTHH:MM:SS
    expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  test('should format message with empty metadata', () => {
    const formatted = logger.formatMessage('info', 'No meta');
    expect(formatted).toContain('INFO: No meta');
    expect(formatted).not.toContain('{}');
  });

  test('debug should only log in development mode', () => {
    const originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    logger.debug('Should not appear');
    const callCount = consoleSpy.mock.calls.length;

    process.env.NODE_ENV = 'development';
    logger.debug('Should appear');
    expect(consoleSpy.mock.calls.length).toBe(callCount + 1);

    process.env.NODE_ENV = originalEnv;
  });
});
