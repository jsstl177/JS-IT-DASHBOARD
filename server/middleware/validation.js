const validator = require('validator');
const { ALLOWED_STATUSES } = require('../utils/constants');

// Input validation middleware
const validateSettings = (req, res, next) => {
  const { service, api_key, base_url } = req.body;

  const errors = [];

  // Required fields
  if (!service) {
    errors.push('Service name is required');
  }

  // Service-specific validations
  if (service) {
    switch (service) {
      case 'uptime-kuma':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid base URL is required for Uptime Kuma');
        }
        break;
      case 'superops':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid base URL is required for SuperOps');
        }
        if (!api_key) {
          errors.push('API key is required for SuperOps');
        }
        break;
      case 'automation-log':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid base URL is required for Automation Log');
        }
        break;
      case 'n8n':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid base URL is required for N8N');
        }
        if (!api_key) {
          errors.push('API key is required for N8N');
        }
        break;
      case 'proxmox':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid base URL is required for Proxmox');
        }
        if (!req.body.username) {
          errors.push('Username is required for Proxmox');
        }
        break;
      case 'powerbi':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid embed URL is required for Power BI');
        }
        break;
      case 'smtp':
        if (!base_url) {
          errors.push('SMTP server host is required');
        }
        if (!api_key) {
          errors.push('SMTP port is required');
        }
        if (!req.body.username) {
          errors.push('SMTP username/sender email is required');
        }
        break;
      default:
        errors.push('Invalid service type');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;

  const errors = [];

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.push('Valid username is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

const validateEmployeeSetup = (req, res, next) => {
  const { employee_name, employee_email, store_number } = req.body;

  const errors = [];

  if (!employee_name || typeof employee_name !== 'string' || employee_name.trim().length === 0) {
    errors.push('Employee name is required');
  }

  if (employee_email && !validator.isEmail(employee_email)) {
    errors.push('Invalid email format');
  }

  if (store_number && !validator.isAlphanumeric(String(store_number))) {
    errors.push('Store number must be alphanumeric');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

const validateStatus = (status) => {
  return ALLOWED_STATUSES.includes(status);
};

// URL validation helper
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Sanitize input helper - trim whitespace only.
// SQL injection is prevented by parameterized queries; XSS is prevented by React's output escaping.
// validator.escape() must NOT be used here as it HTML-encodes characters (e.g. / → &#x2F;) corrupting stored data.
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

module.exports = {
  validateSettings,
  validateLogin,
  validateEmployeeSetup,
  validateStatus,
  sanitizeInput
};
