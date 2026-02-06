/**
 * @fileoverview Tests for the error handling middleware.
 */

const { errorHandler, asyncHandler, notFoundHandler } = require('../middleware/errorHandler');

// Suppress logger output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      id: 'test-request-id',
      get: jest.fn().mockReturnValue('test-agent'),
      originalUrl: '/test'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    test('should return 500 for generic errors', () => {
      const err = new Error('Something went wrong');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Something went wrong' })
      );
    });

    test('should return 400 for ValidationError', () => {
      const err = new Error('Invalid input');
      err.name = 'ValidationError';
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation Error' })
      );
    });

    test('should return 401 for UnauthorizedError', () => {
      const err = new Error('Not authorized');
      err.name = 'UnauthorizedError';
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
    });

    test('should return 409 for ER_DUP_ENTRY', () => {
      const err = new Error('Duplicate entry');
      err.code = 'ER_DUP_ENTRY';
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Database constraint violation' })
      );
    });

    test('should return 503 for ECONNREFUSED', () => {
      const err = new Error('Connection refused');
      err.code = 'ECONNREFUSED';
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    test('should return 503 for ENOTFOUND', () => {
      const err = new Error('Host not found');
      err.code = 'ENOTFOUND';
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    test('should use custom statusCode from error', () => {
      const err = new Error('Custom error');
      err.statusCode = 422;
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    test('should include requestId in response', () => {
      const err = new Error('Test error');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'test-request-id' })
      );
    });

    test('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const err = new Error('Dev error');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.any(String) })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('should NOT include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new Error('Prod error');
      errorHandler(err, mockReq, mockRes, mockNext);

      const jsonArg = mockRes.json.mock.calls[0][0];
      expect(jsonArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    test('should call the wrapped function', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(fn);

      await wrapped(mockReq, mockRes, mockNext);

      expect(fn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    test('should catch rejected promises and pass to next', async () => {
      const err = new Error('Async error');
      const fn = jest.fn().mockRejectedValue(err);
      const wrapped = asyncHandler(fn);

      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
    });

    test('should catch thrown errors in async functions and pass to next', async () => {
      const err = new Error('Thrown error');
      const fn = jest.fn().mockImplementation(async () => { throw err; });
      const wrapped = asyncHandler(fn);

      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  describe('notFoundHandler', () => {
    test('should create a 404 error and pass to next', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not Found - /test',
          statusCode: 404
        })
      );
    });
  });
});
