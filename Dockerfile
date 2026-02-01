# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json server/package-lock.json ./server/
COPY client/package*.json client/package-lock.json ./client/
# Updated lock files

# Install dependencies
RUN cd server && npm ci --only=production
RUN cd client && npm install

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build the client
RUN cd client && npm run build

# Production stage
FROM node:18-alpine

# Install dumb-init and build tools for native dependencies
RUN apk add --no-cache dumb-init python3 make g++

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy server dependencies and source
COPY server/package*.json server/package-lock.json ./
RUN npm install --only=production

# Copy server source
COPY server/ ./
# Updated server code v3

# Copy built client
COPY --from=builder /app/client/build ./client/build

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]