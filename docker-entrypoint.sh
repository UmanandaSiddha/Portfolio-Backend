#!/bin/sh
# Bring the database up to date, then exec the Node app. Fails fast if the
# database is unreachable or migrations don't apply — better than booting
# against a stale schema.

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

# Wait for Postgres to be reachable (handles compose start ordering).
# `dbmate status` exits non-zero if it can't connect.
echo "==> Waiting for database…"
for i in $(seq 1 30); do
  if dbmate status >/dev/null 2>&1; then
    echo "    reachable."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    still unreachable after 60s — aborting." >&2
    exit 1
  fi
  sleep 2
done

# Create the database if it doesn't exist. `dbmate create` errors when the DB
# already exists; swallow that so the step is idempotent.
echo "==> Ensuring database exists…"
dbmate create 2>/dev/null || true

# Apply any pending migrations.
echo "==> Running dbmate migrations…"
dbmate --no-dump-schema up

echo "==> Starting Node app…"
exec "$@"
