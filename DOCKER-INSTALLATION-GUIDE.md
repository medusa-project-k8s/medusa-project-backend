# Medusa Docker Installation Guide

This guide will help you install and run a Medusa application using Docker. This is an alternative to the standard `create-medusa-app` installation method and is particularly useful if you prefer using Docker or want to avoid manual PostgreSQL setup.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** - Usually included with Docker Desktop
- **Git CLI tool** - [Install Git](https://git-scm.com/downloads)

## Step-by-Step Installation

### 1. Clone Medusa Starter Repository

Clone the Medusa Starter repository into a directory named `my-medusa-store`:

```bash
git clone https://github.com/medusajs/medusa-starter-default.git --depth=1 my-medusa-store
```

Navigate into the newly created directory:

```bash
cd my-medusa-store
```

All subsequent steps should be performed inside this directory.

### 2. Create docker-compose.yml

Create a file named `docker-compose.yml` in the root of your project with the following content:

```yaml
services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: medusa_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: medusa-store
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - medusa_network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: medusa_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - medusa_network

  # Medusa Server
  # This service runs the Medusa backend application
  # and the admin dashboard.
  medusa:
    build: .
    container_name: medusa_backend
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    ports:
      - "9000:9000"
      - "5173:5173"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa-store
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    volumes:
      - .:/server
      - /server/node_modules
    networks:
      - medusa_network

volumes:
  postgres_data:

networks:
  medusa_network:
    driver: bridge
```

**What this file does:**

- **postgres**: PostgreSQL database service that stores your Medusa application's data
- **redis**: Redis service that stores session data
- **medusa**: Medusa service that runs the server and admin dashboard, connecting to PostgreSQL and Redis

You can add environment variables either in the `environment` section of the medusa service or in a separate `.env` file.

#### Important: Multiple Local Projects

If this isn't your first Medusa project with Docker on your machine, make sure to:

- **Change container names** to avoid conflicts (e.g., `medusa_postgres_myproject`)
- **Change volume names** to avoid conflicts (e.g., `postgres_data_myproject`)
- **Change network name** to avoid conflicts (e.g., `medusa_network_myproject`)
- **Change ports** to avoid conflicts:
  - PostgreSQL: `"5433:5432"`
  - Redis: `"6380:6379"`
  - Medusa server: `"9001:9000"`
  - Medusa Admin: `"5174:5173"`
- **Update DATABASE_URL and REDIS_URL** environment variables accordingly

### 3. Create start.sh

Create a script file named `start.sh` that runs database migrations and starts the Medusa development server:

```bash
#!/bin/sh

# Run migrations and start server
echo "Running database migrations..."
npx medusa db:migrate

echo "Seeding database..."
npm run seed || echo "Seeding failed, continuing..."

echo "Starting Medusa development server..."
npm run dev
```

**Important for Windows Users:** Ensure that the `start.sh` file uses LF line endings instead of CRLF. Git on Windows can sometimes automatically convert line endings, which causes errors when running the script inside the Linux-based Docker container. Learn how to configure your environment to maintain LF line endings in [this guide from GitHub](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings).

Make the script executable (not necessary on Windows, but recommended on macOS and Linux):

```bash
chmod +x start.sh
```

### 4. Create Dockerfile

Create a file named `Dockerfile` with the following content:

```dockerfile
# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Copy package files and npm config
COPY package.json package-lock.json ./

# Install all dependencies using npm
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the development server
CMD ["./start.sh"]
```

**Note:** While it's more common to use `/app` as the working directory, it's highly recommended to use `/server` for the Medusa service to avoid conflicts with Medusa Admin customizations.

### 5. Install Dependencies

The Medusa Starter repository has a `yarn.lock` file that was generated by installing dependencies with Yarn v1.22.19.

If you're using a different Yarn version, or you're using NPM, you need to install the dependencies again to ensure compatibility with the Docker setup:

```bash
npm install --legacy-peer-deps
```

This will update `yarn.lock` or generate a `package-lock.json` file, depending on your package manager.

### 6. Update Scripts in package.json

Add the following scripts to your `package.json` file:

```json
{
  "scripts": {
    // Other scripts...
    "docker:up": "docker compose up --build -d",
    "docker:down": "docker compose down"
  }
}
```

**What these scripts do:**

- `docker:up`: Starts the development server in a Docker container as a background process
- `docker:down`: Stops and removes the Docker containers

### 7. Update Medusa Configuration

#### Disable SSL for PostgreSQL Connection

To avoid SSL errors when connecting to PostgreSQL, add the following configurations in `medusa-config.ts`:

```typescript
import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    // ... your existing config
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
    },
  },
})
```

#### Add Vite Configuration for Medusa Admin

To ensure the Medusa Admin dashboard works correctly in Docker with Hot Module Replacement (HMR), add the following Vite configuration in `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  // ... your existing config
  admin: {
    vite: (config) => {
      return {
        ...config,
        server: {
          ...config.server,
          host: "0.0.0.0",
          // Allow all hosts when running in Docker (development mode)
          // In production, this should be more restrictive
          allowedHosts: [
            "localhost",
            ".localhost",
            "127.0.0.1",
          ],
          hmr: {
            ...config.server?.hmr,
            // HMR websocket port inside container
            port: 5173, 
            // Port browser connects to (exposed in docker-compose.yml)
            clientPort: 5173,
          },
        },
      }
    },
  },
})
```

This configures the Vite development server to listen on all network interfaces (`0.0.0.0`) and sets up HMR to work correctly within the Docker environment.

### 8. Add .dockerignore

Create a `.dockerignore` file to ensure only necessary files are copied into the Docker image:

```
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git
.gitignore
README.md
.env.test
.nyc_output
coverage
.DS_Store
*.log
dist
build
```

### 9. Create .env File

You can add environment variables either in the `environment` section of the medusa service in `docker-compose.yml` or in a separate `.env` file.

If you don't want to use a `.env` file, you can remove the `env_file` section from the medusa service in `docker-compose.yml`.

Otherwise, copy the `.env.template` file to `.env` and update the values as needed:

```bash
cp .env.template .env
```

### 10. Start the Medusa Application with Docker

All configurations are now ready! Start the Medusa application using Docker:

```bash
npm run docker:up
```

Docker will:
- Pull the necessary images
- Start the PostgreSQL and Redis services
- Build the Medusa service
- Run the development server in a Docker container

Check the logs to ensure everything is running smoothly:

```bash
docker compose logs -f
```

Once you see the following message, the Medusa server and admin are ready:

```
✔ Server is ready on port: 9000 – 3ms
info:    Admin URL → http://localhost:9000/app
```

You can now access:
- **Medusa server**: http://localhost:9000
- **Medusa Admin dashboard**: http://localhost:9000/app

## Create Admin User

To create an admin user, run the following command:

```bash
docker compose run --rm medusa npx medusa user -e admin@example.com -p supersecret
```

Replace `admin@example.com` and `supersecret` with your desired email and password.

You can now log in to the Medusa Admin dashboard at http://localhost:9000/app using the email and password you just created.

## Stop the Medusa Application

To stop the Medusa application running in Docker:

```bash
npm run docker:down
```

This command stops and removes the Docker containers created by the `docker-compose.yml` file.

**Note:** This doesn't delete any data in your application or its database. You can start the server again using the `docker:up` command.

## Check Logs

You can check the logs of the Medusa application running in Docker:

```bash
docker compose logs -f medusa
```

This command shows the logs of the medusa service, allowing you to see any errors or messages from the Medusa application.

## Troubleshooting

### start.sh Not Found Error

If you get the following error when starting the Medusa application with Docker:

```
medusa_backend exited with code 127 (restarting)
medusa_backend   | /usr/local/bin/docker-entrypoint.sh: exec: line 11: ./start.sh: not found
```

This is a common error for Windows users. It usually occurs when the `start.sh` file uses CRLF line endings instead of LF.

**Solution:** Ensure that the `start.sh` file uses LF line endings. You can configure Git to maintain LF line endings by following [this guide from GitHub](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings).

### Couldn't Find X File or Directory Errors

If you encounter errors indicating that certain files or directories couldn't be found, make sure you're running the commands from the root directory of your Medusa application (the same directory where the `docker-compose.yml` file is located).

For example, if you run the `docker:up` command and see an error like:

```
error Couldn't find a package.json file in "/"
```

**Solution:** Ensure that your terminal's current working directory is the root of your Medusa application, then try running the command again.

### Container Name Conflicts

If you're running multiple Medusa projects with Docker or have previously run this guide, you may encounter container name conflicts.

**Solution:** Ensure that the `container_name` values in your `docker-compose.yml` file are unique for each project. You can modify them by appending a unique identifier to each name.

For example, change:

```yaml
container_name: medusa_postgres
```

to:

```yaml
container_name: medusa_postgres_myproject
```

## Summary

This guide has walked you through:

1. ✅ Cloning the Medusa Starter repository
2. ✅ Creating `docker-compose.yml` with PostgreSQL, Redis, and Medusa services
3. ✅ Creating `start.sh` script for migrations and server startup
4. ✅ Creating `Dockerfile` for the Medusa service
5. ✅ Installing dependencies
6. ✅ Updating `package.json` scripts
7. ✅ Configuring Medusa for Docker (SSL and Vite settings)
8. ✅ Creating `.dockerignore` file
9. ✅ Setting up `.env` file
10. ✅ Starting the application with Docker

Your Medusa application should now be running successfully in Docker! 🎉
