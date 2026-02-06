/**
 * @fileoverview Docker health check script.
 *
 * Called by Docker's HEALTHCHECK directive to determine container health.
 * Makes an HTTP GET to /health and exits with code 0 (healthy) or 1 (unhealthy).
 *
 * Exit codes:
 *   0 - Container is healthy (HTTP 200)
 *   1 - Container is unhealthy (non-200 response, timeout, or connection error)
 */

const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: process.env.PORT || 5000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
