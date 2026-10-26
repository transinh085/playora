#!/bin/sh
# =============================================================================
# Playora Production Deploy Script (Single VM · Docker Compose)
# =============================================================================
# Usage:
#   ./infra/scripts/deploy.sh <git-commit-sha>
#
# Steps:
#   1. Pull GHCR images for <TAG> (`api`, `worker`, `studio`, `play`, `web`).
#   2. Ensure `valkey` is up and healthy.
#   3. Run one-shot `migrate` (`bun run db:migrate`) and verify exit 0.
#   4. Rolling update of `api`, `worker`, `studio`, `play`, `web`, and `caddy`.
#   5. Smoke-check `/v1/health/ready` until db, redis, and migrations report `ok`.
# =============================================================================
set -eu

TAG="${1:-${TAG:-}}"
if [ -z "${TAG}" ]; then
  printf 'Usage: %s <image-tag-or-commit-sha>\n' "$0" >&2
  exit 1
fi
export TAG

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/infra/compose/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/infra/env/.env.prod}"

if [ ! -f "${ENV_FILE}" ]; then
  printf 'ERROR: env file not found at %s (copy infra/env/prod.env.example to %s)\n' \
    "${ENV_FILE}" "${ENV_FILE}" >&2
  exit 1
fi

log() {
  printf '[%s] [deploy:%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "${TAG}" "$*"
}

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

wait_healthy() {
  service="$1"
  max_attempts="${2:-30}"
  attempt=1
  while [ "${attempt}" -le "${max_attempts}" ]; do
    cid=$(compose ps -q "${service}" 2>/dev/null || true)
    if [ -n "${cid}" ]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${cid}" 2>/dev/null || true)
      if [ "${status}" = "healthy" ]; then
        log "Service ${service} is healthy."
        return 0
      fi
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  log "ERROR: service ${service} failed to become healthy within $((max_attempts * 2))s."
  compose logs --tail=50 "${service}" >&2 || true
  return 1
}

log "1/5 Pulling images for tag ${TAG}..."
compose pull api worker studio play web

log "2/5 Ensuring valkey is running and healthy..."
compose up -d valkey
wait_healthy valkey 15

log "3/5 Running database migrations (migrate service)..."
compose run --rm migrate

log "4/5 Rolling update of application services..."
for svc in api worker studio play web caddy; do
  log "Updating ${svc}..."
  compose up -d --no-deps "${svc}"
  wait_healthy "${svc}" 30
done

log "5/5 Running readiness smoke check (/v1/health/ready)..."
compose exec -T api bun -e "
  const port = process.env.API_PORT || '4000';
  const res = await fetch('http://127.0.0.1:' + port + '/v1/health/ready');
  const body = await res.json();
  if (!res.ok || body.status !== 'ok') {
    console.error('Readiness check failed:', JSON.stringify(body));
    process.exit(1);
  }
  console.log('Readiness check passed:', JSON.stringify(body));
"

log "Deploy ${TAG} succeeded."
