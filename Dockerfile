# Development Dockerfile for Medusa v2
FROM node:20-alpine

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

# Set working directory
WORKDIR /server

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with npm
RUN npm ci

# Copy source code
COPY . .

# Make start script executable
RUN chmod +x ./start.sh

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the server
CMD ["./start.sh"]
