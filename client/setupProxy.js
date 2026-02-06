/**
 * @fileoverview Development proxy configuration for Create React App.
 *
 * Proxies all /api requests from the React dev server (port 3000)
 * to the Express backend (port 5001 in Docker, 5000 locally).
 * This avoids CORS issues during development.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );
};
