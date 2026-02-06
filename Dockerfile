# =============================================================================
# JS IT Dashboard - Multi-Stage Production Build
# =============================================================================
# Stage 1: Build the React client
# Stage 2: Production runtime with only server code and pre-built client
# =============================================================================

# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better Docker layer caching)
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies (server: production only, client: all for build tooling)
RUN cd server && npm ci --only=production
RUN cd client && npm install

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build the React client for production
RUN cd client && npm run build

# ─── Stage 2: Production Runtime ────────────────────────────────────────────
FROM node:18-alpine

# Install dumb-init for proper PID 1 signal handling in containers
# python3/make/g++ needed for native module compilation (bcrypt, etc.)
RUN apk add --no-cache dumb-init python3 make g++

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy server dependencies and install (production only)
COPY server/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy server source code
COPY server/ ./

# Copy pre-built React client from builder stage
COPY --from=builder /app/client/build ./client/build

# Create logs directory
RUN mkdir -p logs

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose application port
EXPOSE 5000

# Health check: verify the application is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init as PID 1 for proper signal forwarding
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
