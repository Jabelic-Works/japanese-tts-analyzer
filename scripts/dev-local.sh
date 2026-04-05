#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
PLAYGROUND_DIR="${REPO_ROOT}/packages/tts-playground"
ANALYZE_URL="${ANALYZE_API_BASE_URL:-http://localhost:8789}"
PLAYGROUND_PORT="${PLAYGROUND_PORT:-8790}"

WRANGLER_ARGS=(
  dev
  --port
  "${PLAYGROUND_PORT}"
  --var
  "ANALYZE_API_BASE_URL:${ANALYZE_URL}"
)

if [[ -n "${ANALYZE_API_TOKEN:-}" ]]; then
  WRANGLER_ARGS+=(
    --var
    "ANALYZE_API_TOKEN:${ANALYZE_API_TOKEN}"
  )
fi

cd "${PLAYGROUND_DIR}"

echo "Starting tts-playground on http://localhost:${PLAYGROUND_PORT}"
echo "Proxying /api/analyze to ${ANALYZE_URL}"
pnpm run build
pnpm exec wrangler "${WRANGLER_ARGS[@]}"
