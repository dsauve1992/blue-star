# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install Python for screener functionality
RUN apk add --no-cache python3 py3-pip bash

# Copy root package files for workspaces
COPY package*.json ./
COPY turbo.json ./

# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --workspace=backend

# Copy backend source
COPY apps/backend ./apps/backend

# Copy screener (Python dependency)
COPY apps/screener ./apps/screener

# Build the application
RUN npm run build --workspace=backend

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install Python runtime for screener
RUN apk add --no-cache python3 py3-pip bash

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --workspace=backend --omit=dev

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Copy screener
COPY apps/screener ./apps/screener

# Copy database migrations
COPY apps/backend/database.json ./apps/backend/
COPY apps/backend/migrations ./apps/backend/migrations

# Set working directory to backend
WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Run migrations and start the server
CMD ["sh", "-c", "npm run migrate:up || true && node dist/main"]
