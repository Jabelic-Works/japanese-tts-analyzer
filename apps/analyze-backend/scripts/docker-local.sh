#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

IMAGE_NAME="${ANALYZE_BACKEND_LOCAL_IMAGE:-japanese-tts-analyzer-analyze-backend-local}"
CONTAINER_NAME="${ANALYZE_BACKEND_LOCAL_CONTAINER:-japanese-tts-analyzer-analyze-backend-local}"
PORT="${ANALYZE_BACKEND_PORT:-8789}"

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

docker_pid=""
stopping="false"

handle_stop_signal() {
  if [[ "${stopping}" == "true" ]]; then
    return
  fi

  stopping="true"
  trap - INT TERM

  echo
  echo "Stopping ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true

  if [[ -n "${docker_pid}" ]]; then
    wait "${docker_pid}" 2>/dev/null || true
  fi

  exit 130
}

trap cleanup EXIT
trap handle_stop_signal INT TERM

cd "${APP_DIR}"

echo "Building analyze-backend..."
pnpm run build

echo "Building Docker image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" -f Dockerfile .

cleanup

echo "Starting ${CONTAINER_NAME} on http://localhost:${PORT}"
echo "Press Ctrl-C to stop."
docker run --name "${CONTAINER_NAME}" --rm -p "${PORT}:8080" "${IMAGE_NAME}" &
docker_pid="$!"

set +e
wait "${docker_pid}"
exit_code="$?"
set -e

exit "${exit_code}"
