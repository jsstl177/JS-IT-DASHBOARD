/**
 * @fileoverview Simple file-based logger with console output.
 * Logs are written to daily files in production mode and always output to console.
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logger class for application-wide logging with file persistence.
 * Handles info, warn, error, and debug levels with automatic file rotation by date.
 */
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  }

  /**
   * Formats a log message with timestamp, level, message, and metadata.
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Log message
   * @param {Object|Error} meta - Additional metadata or Error object
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();

    // Handle Error objects in meta
    let processedMeta = meta;
    if (meta instanceof Error) {
      processedMeta = { message: meta.message, stack: meta.stack };
    } else if (typeof meta === 'object' && meta !== null) {
      // Process any Error values within the meta object
      processedMeta = {};
      for (const [key, value] of Object.entries(meta)) {
        if (value instanceof Error) {
          processedMeta[key] = { message: value.message, stack: value.stack };
        } else {
          processedMeta[key] = value;
        }
      }
    }

    const metaString = processedMeta && Object.keys(processedMeta).length ? ` ${JSON.stringify(processedMeta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}\n`;
  }

  /**
   * Writes a log message to the daily log file asynchronously.
   * @param {string} message - Formatted log message to write
   */
  writeToFile(message) {
    // Use async file writes to avoid blocking the event loop
    fs.appendFile(this.logFile, message, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err.message);
      }
    });
  }

  /**
   * Core logging method used by all log level methods.
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Log message
   * @param {Object|Error} meta - Additional metadata or Error object
   */
  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    console.log(formattedMessage.trim());

    // Write to file in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(formattedMessage);
    }
  }

  /**
   * Logs an informational message.
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Logs a warning message.
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Logs an error message.
   * @param {string} message - Log message
   * @param {Object|Error} meta - Additional metadata or Error object
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  /**
   * Logs a debug message (only in development mode).
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }
}

module.exports = new Logger();
