# Multi-stage Dockerfile for Medusa v2 backend

########################
# 1) Build stage
########################
FROM node:20-alpine AS builder

# Install netcat for health checks (if you use it in scripts)
RUN apk add --no-cache netcat-openbsd

WORKDIR /server

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (prod + dev) for build
RUN npm ci

# Copy source code
COPY . .

# Build the Medusa project (compiles TS, etc.)
RUN npm run build

########################
# 2) Runtime stage
########################
FROM node:20-alpine AS runner

# Install netcat for health checks (used by docker-compose healthcheck)
RUN apk add --no-cache netcat-openbsd

WORKDIR /server

ENV NODE_ENV=production

# Copy package files and install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built app and any runtime files from builder
COPY --from=builder /server/start.sh ./start.sh
COPY --from=builder /server/medusa-config.ts ./medusa-config.ts
COPY --from=builder /server/src/admin ./src/admin

# Make start script executable
RUN chmod +x ./start.sh

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the server
CMD ["./start.sh"]
