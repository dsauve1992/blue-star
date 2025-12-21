# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files for workspaces
COPY package*.json ./
COPY turbo.json ./

# Copy frontend package files
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm ci --workspace=frontend

# Copy frontend source
COPY apps/frontend ./apps/frontend

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_KINDE_CLIENT_ID
ARG VITE_KINDE_DOMAIN
ARG VITE_KINDE_AUDIENCE
ARG VITE_KINDE_REDIRECT_URI
ARG VITE_KINDE_LOGOUT_URI

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KINDE_CLIENT_ID=$VITE_KINDE_CLIENT_ID
ENV VITE_KINDE_DOMAIN=$VITE_KINDE_DOMAIN
ENV VITE_KINDE_AUDIENCE=$VITE_KINDE_AUDIENCE
ENV VITE_KINDE_REDIRECT_URI=$VITE_KINDE_REDIRECT_URI
ENV VITE_KINDE_LOGOUT_URI=$VITE_KINDE_LOGOUT_URI

# Build the application
RUN npm run build --workspace=frontend

# Production stage - Nginx to serve static files
FROM nginx:alpine AS production

# Install curl for reliable health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
