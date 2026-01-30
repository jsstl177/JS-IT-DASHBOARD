const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple file logger
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  }

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

  writeToFile(message) {
    // Use async file writes to avoid blocking the event loop
    fs.appendFile(this.logFile, message, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err.message);
      }
    });
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    console.log(formattedMessage.trim());

    // Write to file in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(formattedMessage);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }
}

module.exports = new Logger();
