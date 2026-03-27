#!/bin/bash
# Turbine QC — Resilient startup script
# Ensures PostgreSQL is running before starting the API server

set -e

MAX_RETRIES=10
RETRY_DELAY=2

echo "[start] Checking PostgreSQL..."

for i in $(seq 1 $MAX_RETRIES); do
  if pg_isready -q 2>/dev/null; then
    echo "[start] PostgreSQL is ready."
    break
  fi

  if [ "$i" -eq 1 ]; then
    echo "[start] PostgreSQL is not running. Attempting to start..."
    sudo pg_ctlcluster 16 main start 2>/dev/null || sudo pg_ctlcluster 17 main start 2>/dev/null || true
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[start] ERROR: PostgreSQL failed to start after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "[start] Waiting for PostgreSQL... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_DELAY
done

echo "[start] Starting API server on port ${PORT:-3001}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
