#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
PLAYGROUND_DIR="${REPO_ROOT}/packages/tts-playground"
DEV_VARS_PATH="${PLAYGROUND_DIR}/.dev.vars"
BACKUP_PATH="${PLAYGROUND_DIR}/.dev.vars.backup"
ANALYZE_URL="${ANALYZE_API_BASE_URL:-http://localhost:8789}"

restore_dev_vars() {
  if [[ -f "${BACKUP_PATH}" ]]; then
    mv "${BACKUP_PATH}" "${DEV_VARS_PATH}"
    return
  fi

  rm -f "${DEV_VARS_PATH}"
}

trap restore_dev_vars EXIT

rm -f "${BACKUP_PATH}"

if [[ -f "${DEV_VARS_PATH}" ]]; then
  mv "${DEV_VARS_PATH}" "${BACKUP_PATH}"
fi

printf 'ANALYZE_API_BASE_URL=%s\n' "${ANALYZE_URL}" > "${DEV_VARS_PATH}"

cd "${REPO_ROOT}"

echo "Starting tts-playground with ANALYZE_API_BASE_URL=${ANALYZE_URL}"
pnpm --filter @japanese-tts-analyzer/tts-playground preview:worker
