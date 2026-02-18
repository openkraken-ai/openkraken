#!/usr/bin/env bash
# Database initialization script for OpenKraken orchestrator
# Creates storage directories and runs database migrations

set -euo pipefail

# Configuration
STORAGE_DATA_DIR="./storage/data"
DATABASE_PATH="${STORAGE_DATA_DIR}/openkraken.db"

echo "=== OpenKraken Database Initialization ==="
echo "Database path: ${DATABASE_PATH}"

# Create storage directories if they don't exist
echo "Ensuring storage directories exist..."
mkdir -p "${STORAGE_DATA_DIR}"
mkdir -p "./storage/sandbox"

# Run database migrations using the migration runner
echo ""
echo "Running database migrations..."
cd "$(dirname "$0")/.."
bun run scripts/db/migrate.ts

echo ""
echo "=== Database initialization complete ==="
