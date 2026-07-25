#!/usr/bin/env bash
# Run the Python worker locally without Docker.
# Loads .env from this directory and execs `python -m src.main`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo "Missing .env in $HERE" >&2
  exit 1
fi

# Pick venv python if present, else fall back to system python.
if [ -x venv/bin/python ]; then
  PY=venv/bin/python
else
  PY=python3
fi

exec "$PY" -m src.main "$@"
