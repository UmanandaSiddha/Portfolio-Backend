#!/bin/sh
# Run dbmate migrations against the live DATABASE_URL, then exec the CMD.
# Fails fast if migrations don't apply — better than booting with a stale schema.

set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "==> Running dbmate migrations…"
dbmate --no-dump-schema up

echo "==> Starting Node app…"
exec "$@"
