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

# Copy theme_extractor (Python dependency)
COPY apps/theme_extractor ./apps/theme_extractor

# Build the application
RUN npm run build --workspace=backend

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install Python runtime and native dependencies for faster builds
RUN apk add --no-cache python3 py3-pip bash py3-pandas py3-numpy py3-requests

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --workspace=backend --omit=dev

# Install additional Python dependencies for screener
COPY apps/screener/requirements.txt ./apps/screener/
RUN pip3 install --no-cache-dir --break-system-packages yfinance

# Install additional Python dependencies for theme_extractor
COPY apps/theme_extractor/requirements.txt ./apps/theme_extractor/
RUN pip3 install --no-cache-dir --break-system-packages -r apps/theme_extractor/requirements.txt

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Copy screener
COPY apps/screener ./apps/screener

# Copy theme_extractor
COPY apps/theme_extractor ./apps/theme_extractor

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

# Start the server (migrations are handled by NestJS MigrationService on startup)
CMD ["node", "dist/src/main"]
