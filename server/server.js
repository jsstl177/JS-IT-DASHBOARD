const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const { errorHandler, asyncHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const db = require('./db');
const pkg = require('./package.json');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Startup validation for required environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key' || JWT_SECRET === 'your-super-secret-jwt-key-change-this' || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
  logger.error('FATAL: JWT_SECRET is missing or set to a placeholder value. Set a strong secret in your .env file.');
  process.exit(1);
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  logger.error('FATAL: ENCRYPTION_KEY environment variable is required. Set a strong key in your .env file.');
  process.exit(1);
}

// Response compression
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: isProduction
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
      requestId: req.id
    });
  });

  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employee-setup', require('./routes/employeeSetup'));

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  let dbStatus = 'healthy';

  db.get('SELECT 1', [], (err) => {
    if (err) {
      dbStatus = 'degraded';
      logger.warn('Health check: database unreachable', { error: err.message });
    }

    const status = dbStatus === 'healthy' ? 'healthy' : 'degraded';

    res.status(dbStatus === 'healthy' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: pkg.version,
      database: dbStatus
    });
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start the server and store the instance for graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Graceful shutdown with connection draining
function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(() => {
    logger.info('HTTP server closed');
    db.close((err) => {
      if (err) {
        logger.error('Error closing database', { error: err.message });
      } else {
        logger.info('Database connection closed');
      }
      process.exit(0);
    });
  });

  // Force exit after 10 seconds as a safety net
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
