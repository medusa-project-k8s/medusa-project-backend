#!/bin/sh
set -e

# Wait for postgres to be ready
# Use DB_HOST/DB_PORT env vars, or parse from DATABASE_URL
if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
  # Parse host from DATABASE_URL: postgres://user:pass@host:port/db
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
fi

if [ -z "$DB_PORT" ] && [ -n "$DATABASE_URL" ]; then
  # Parse port from DATABASE_URL
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Waiting for database to be ready at ${DB_HOST}:${DB_PORT}..."
until nc -z ${DB_HOST} ${DB_PORT}; do
  echo "Waiting for postgres..."
  sleep 2
done

echo "Database is ready!"

# Build the project first
echo "Building Medusa project..."
npm run build

# Run database migrations
echo "Running database migrations..."
npx medusa db:migrate || echo "Migrations completed or already run"

# Sync database links
echo "Syncing database links..."
npx medusa db:sync-links || echo "Links sync completed"

# Seed the database
echo "Seeding database..."
npx medusa exec ./src/scripts/seed.ts || echo "Seeding skipped or already done"

# Start the production server
echo "Starting Medusa server..."
npm run start
