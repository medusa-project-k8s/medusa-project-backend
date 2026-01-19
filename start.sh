#!/bin/sh
set -e

# Wait for postgres to be ready
echo "Waiting for database to be ready..."
until nc -z postgres 5432; do
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
