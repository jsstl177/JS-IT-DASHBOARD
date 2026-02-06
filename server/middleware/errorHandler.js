/**
 * @fileoverview Centralized error handling middleware for Express.
 *
 * Provides three exports:
 *  - errorHandler: global error-handling middleware (4 args)
 *  - asyncHandler: wraps async route handlers to forward rejected promises
 *  - notFoundHandler: catches requests that matched no route
 *
 * In production, stack traces are hidden from the response body.
 */

const logger = require('../utils/logger');

/**
 * Global error handling middleware.
 * Logs the error with context and returns a sanitised JSON response.
 *
 * @param {Error} err - The error thrown or passed via next(err)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (unused but required by Express)
 */
const errorHandler = (err, req, res, next) => {
  // Log full details for debugging
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Map well-known error types to appropriate HTTP status codes
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.code === 'ER_DUP_ENTRY') {
    // MariaDB/MySQL unique constraint violation
    statusCode = 409;
    message = 'Database constraint violation';
  } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Never expose stack traces to clients in production
  const errorResponse = {
    error: message,
    ...(req.id && { requestId: req.id }),
    ...(isDevelopment && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Wraps an async route handler so that any rejected promise is forwarded
 * to Express error-handling middleware via next(err).
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware that catches async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Catch-all middleware for requests that did not match any route.
 * Creates a 404 error and passes it to the error handler.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};
