const {
  validateSettings,
  validateLogin,
  validateEmployeeSetup,
  validateStatus,
  sanitizeInput
} = require('../middleware/validation');

// Helper to create mock Express req/res/next
function createMocks(body = {}) {
  const req = { body };
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Validation Middleware', () => {

  // ========== validateSettings ==========
  describe('validateSettings', () => {
    it('should reject request with missing service name', () => {
      const { req, res, next } = createMocks({ base_url: 'http://example.com' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('Validation failed');
      expect(res.jsonData.details).toContain('Service name is required');
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid service type', () => {
      const { req, res, next } = createMocks({ service: 'unknown-service', base_url: 'http://example.com' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toContain('Invalid service type');
      expect(next).not.toHaveBeenCalled();
    });

    // uptime-kuma
    it('should pass for valid uptime-kuma settings', () => {
      const { req, res, next } = createMocks({ service: 'uptime-kuma', base_url: 'http://uptime.local:3001' });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject uptime-kuma without base_url', () => {
      const { req, res, next } = createMocks({ service: 'uptime-kuma' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('base URL')
      ]));
    });

    it('should reject uptime-kuma with invalid base_url', () => {
      const { req, res, next } = createMocks({ service: 'uptime-kuma', base_url: 'not-a-url' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    // superops
    it('should pass for valid superops settings', () => {
      const { req, res, next } = createMocks({ service: 'superops', base_url: 'https://superops.example.com', api_key: 'abc123' });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject superops without api_key', () => {
      const { req, res, next } = createMocks({ service: 'superops', base_url: 'https://superops.example.com' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('API key')
      ]));
    });

    it('should reject superops without base_url', () => {
      const { req, res, next } = createMocks({ service: 'superops', api_key: 'abc123' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    // automation-log
    it('should pass for valid automation-log settings', () => {
      const { req, res, next } = createMocks({ service: 'automation-log', base_url: 'http://logs.local:8080' });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject automation-log without base_url', () => {
      const { req, res, next } = createMocks({ service: 'automation-log' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    // n8n
    it('should pass for valid n8n settings', () => {
      const { req, res, next } = createMocks({ service: 'n8n', base_url: 'https://n8n.local', api_key: 'n8nkey' });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject n8n without api_key', () => {
      const { req, res, next } = createMocks({ service: 'n8n', base_url: 'https://n8n.local' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject n8n without base_url', () => {
      const { req, res, next } = createMocks({ service: 'n8n', api_key: 'n8nkey' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    // proxmox
    it('should pass for valid proxmox settings', () => {
      const { req, res, next } = createMocks({
        service: 'proxmox',
        base_url: 'https://proxmox.local:8006',
        username: 'root@pam',
        password: 'secret'
      });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject proxmox without username', () => {
      const { req, res, next } = createMocks({ service: 'proxmox', base_url: 'https://proxmox.local:8006' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('Username is required')
      ]));
    });

    it('should reject proxmox without base_url', () => {
      const { req, res, next } = createMocks({ service: 'proxmox', username: 'root@pam', password: 'secret' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    // powerbi
    it('should pass for valid powerbi settings', () => {
      const { req, res, next } = createMocks({ service: 'powerbi', base_url: 'https://app.powerbi.com/reports/abc-123' });
      validateSettings(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject powerbi without base_url', () => {
      const { req, res, next } = createMocks({ service: 'powerbi' });
      validateSettings(req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });

  // ========== validateLogin ==========
  describe('validateLogin', () => {
    it('should pass with valid username and password', () => {
      const { req, res, next } = createMocks({ username: 'admin', password: 'password123' });
      validateLogin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing username', () => {
      const { req, res, next } = createMocks({ password: 'password123' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('username')
      ]));
    });

    it('should reject empty username', () => {
      const { req, res, next } = createMocks({ username: '', password: 'password123' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject whitespace-only username', () => {
      const { req, res, next } = createMocks({ username: '   ', password: 'password123' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject non-string username', () => {
      const { req, res, next } = createMocks({ username: 12345, password: 'password123' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject missing password', () => {
      const { req, res, next } = createMocks({ username: 'admin' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('Password')
      ]));
    });

    it('should reject empty password', () => {
      const { req, res, next } = createMocks({ username: 'admin', password: '' });
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject both fields missing', () => {
      const { req, res, next } = createMocks({});
      validateLogin(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details.length).toBe(2);
    });
  });

  // ========== validateEmployeeSetup ==========
  describe('validateEmployeeSetup', () => {
    it('should pass with valid employee data', () => {
      const { req, res, next } = createMocks({
        employee_name: 'John Doe',
        employee_email: 'john@example.com',
        store_number: 'ST01'
      });
      validateEmployeeSetup(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should pass with only employee_name (email and store_number optional)', () => {
      const { req, res, next } = createMocks({ employee_name: 'Jane Doe' });
      validateEmployeeSetup(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing employee_name', () => {
      const { req, res, next } = createMocks({ employee_email: 'john@example.com' });
      validateEmployeeSetup(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('Employee name')
      ]));
    });

    it('should reject empty employee_name', () => {
      const { req, res, next } = createMocks({ employee_name: '' });
      validateEmployeeSetup(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject whitespace-only employee_name', () => {
      const { req, res, next } = createMocks({ employee_name: '   ' });
      validateEmployeeSetup(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid email format', () => {
      const { req, res, next } = createMocks({
        employee_name: 'John Doe',
        employee_email: 'not-an-email'
      });
      validateEmployeeSetup(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('email')
      ]));
    });

    it('should reject non-alphanumeric store_number', () => {
      const { req, res, next } = createMocks({
        employee_name: 'John Doe',
        store_number: 'ST-01!'
      });
      validateEmployeeSetup(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.details).toEqual(expect.arrayContaining([
        expect.stringContaining('alphanumeric')
      ]));
    });

    it('should allow numeric store_number', () => {
      const { req, res, next } = createMocks({
        employee_name: 'John Doe',
        store_number: 42
      });
      validateEmployeeSetup(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ========== validateStatus ==========
  describe('validateStatus', () => {
    it('should return true for "pending"', () => {
      expect(validateStatus('pending')).toBe(true);
    });

    it('should return true for "in_progress"', () => {
      expect(validateStatus('in_progress')).toBe(true);
    });

    it('should return true for "completed"', () => {
      expect(validateStatus('completed')).toBe(true);
    });

    it('should return true for "na"', () => {
      expect(validateStatus('na')).toBe(true);
    });

    it('should return false for invalid status "done"', () => {
      expect(validateStatus('done')).toBe(false);
    });

    it('should return false for invalid status "active"', () => {
      expect(validateStatus('active')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateStatus('')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateStatus(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateStatus(null)).toBe(false);
    });
  });

  // ========== sanitizeInput ==========
  describe('sanitizeInput', () => {
    it('should preserve special characters without HTML encoding', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).toBe('<script>alert("xss")</script>');
    });

    it('should preserve & character', () => {
      const result = sanitizeInput('foo & bar');
      expect(result).toBe('foo & bar');
    });

    it('should preserve URLs with slashes', () => {
      const result = sanitizeInput('https://example.com/path');
      expect(result).toBe('https://example.com/path');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should trim and preserve content', () => {
      const result = sanitizeInput('  <b>bold</b>  ');
      expect(result).toBe('<b>bold</b>');
    });

    it('should return non-string inputs unchanged (number)', () => {
      expect(sanitizeInput(42)).toBe(42);
    });

    it('should return non-string inputs unchanged (null)', () => {
      expect(sanitizeInput(null)).toBeNull();
    });

    it('should return non-string inputs unchanged (undefined)', () => {
      expect(sanitizeInput(undefined)).toBeUndefined();
    });

    it('should return non-string inputs unchanged (object)', () => {
      const obj = { key: 'value' };
      expect(sanitizeInput(obj)).toBe(obj);
    });

    it('should return non-string inputs unchanged (boolean)', () => {
      expect(sanitizeInput(true)).toBe(true);
    });
  });
});
