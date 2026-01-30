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
        if (!req.body.username || !req.body.password) {
          errors.push('Username and password are required for Proxmox');
        }
        break;
      case 'powerbi':
        if (!base_url || !isValidUrl(base_url)) {
          errors.push('Valid embed URL is required for Power BI');
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

// URL validation helper
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Sanitize input helper
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

module.exports = {
  validateSettings,
  validateLogin,
  sanitizeInput
};