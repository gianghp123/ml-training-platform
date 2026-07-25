#!/usr/bin/env bash
# Start the dev stack locally without Docker for the app services.
# Assumes Postgres / Redis / MinIO are already running (via docker compose up).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PIDS=()

cleanup() {
  echo
  echo "[dev] stopping children..."
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

if [ ! -d node_modules ]; then
  echo "[dev] node_modules missing → npm install"
  npm install
fi

if [ ! -d apps/services/worker/venv ]; then
  echo "[dev] worker venv missing → creating"
  python3 -m venv apps/services/worker/venv
  apps/services/worker/venv/bin/pip install -r apps/services/worker/requirements.txt
fi

if [ ! -f apps/services/worker/.env ]; then
  echo "[dev] apps/services/worker/.env missing → abort. Copy .env.example there." >&2
  exit 1
fi

echo "[dev] building Node packages (turbo)"
npm run build

echo "[dev] running API migrations"
npm run migration:run -w apps/services/api

echo "[dev] starting Python worker (apps/services/worker/run.sh)"
(
  cd apps/services/worker
  ./run.sh
) &
PIDS+=($!)

echo "[dev] starting API (apps/services/api)"
npm run dev -w apps/services/api &
PIDS+=($!)

echo "[dev] starting Web (apps/web)"
npm run dev -w apps/web &
PIDS+=($!)

echo
echo "[dev] up. Ctrl-C to stop all. PIDs: ${PIDS[*]}"
echo "  API:  http://localhost:3001"
echo "  Web:  http://localhost:3000"
echo "  MinIO console: http://localhost:9001"
echo

wait
