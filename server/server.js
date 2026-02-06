/**
 * @fileoverview Main Express application server for the JS IT Dashboard.
 *
 * This server provides a REST API for aggregating IT monitoring data from
 * multiple sources (SuperOps, Uptime Kuma, Proxmox, N8N, etc.) and serves
 * the React frontend in production mode.
 *
 * Features:
 * - JWT-based authentication with role-based access control
 * - AES-256-GCM encryption for credentials at rest
 * - Rate limiting, security headers, and CORS protection
 * - Graceful shutdown with connection draining
 * - Health check endpoint for Docker container monitoring
 *
 * @requires express
 * @requires cors
 * @requires compression
 * @requires helmet
 * @requires jsonwebtoken
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { errorHandler, asyncHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const db = require('./db');
const pkg = require('./package.json');

// ─── Application Setup ──────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Environment Validation ─────────────────────────────────────────────────
// Validate required secrets are set and not using placeholder values

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

// ─── Middleware Stack ───────────────────────────────────────────────────────

// Gzip compression for all responses
app.use(compression());

// Security headers via Helmet (CSP, X-Frame-Options, HSTS, etc.)
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

// Rate limiting: prevent abuse on all API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: isProduction ? 100 : 1000, // stricter in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration: restrict origins in production
const corsOptions = {
  origin: isProduction
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with size limits to prevent payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID: unique identifier for each request (used in logging and error responses)
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging: log method, URL, duration, and status code
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

// Static file serving: hashed assets are long-cached; index.html is never cached
app.use(express.static(path.join(__dirname, 'client/build'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ─── Authentication Middleware ───────────────────────────────────────────────

/**
 * JWT authentication middleware for protected routes.
 * Extracts and validates the Bearer token from the Authorization header.
 * On success, attaches decoded user payload to req.user.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ─── Route Registration ─────────────────────────────────────────────────────

// Protected routes: require JWT authentication
app.use('/api/dashboard', authenticateToken, require('./routes/dashboard'));
app.use('/api/employee-setup', authenticateToken, require('./routes/employeeSetup'));
app.use('/api/asset-columns', authenticateToken, require('./routes/assetColumns'));

// Self-authenticating routes: handle their own JWT verification internally
app.use('/api/settings', require('./routes/settings'));
app.use('/api/users', require('./routes/users'));

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * Health check endpoint for Docker and load balancer monitoring.
 * Returns 200 if healthy, 503 if database is unreachable.
 */
app.get('/health', asyncHandler(async (req, res) => {
  let dbStatus = 'healthy';

  try {
    await db.execute('SELECT 1');
  } catch (err) {
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
}));

// ─── SPA Catch-All ──────────────────────────────────────────────────────────

// Serve index.html for all non-API routes (React Router support)
app.get('/{*splat}', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// ─── Error Handling ─────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Startup ─────────────────────────────────────────────────────────

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

/**
 * Handles graceful shutdown by closing HTTP connections and database pool.
 * Uses a 10-second timeout as a safety net to force exit if draining stalls.
 *
 * @param {string} signal - The signal that triggered shutdown (SIGTERM or SIGINT)
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await db.end();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database', { error: err.message });
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if connections don't drain
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
