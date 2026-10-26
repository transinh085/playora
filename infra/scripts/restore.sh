#!/bin/sh
# =============================================================================
# Playora PostgreSQL Restore Script
# =============================================================================
# Usage:
#   # Restore from an S3 object name or s3:// URI into TARGET_DATABASE_URL (or DATABASE_URL):
#   RESTORE_CONFIRM=yes ./infra/scripts/restore.sh playora-20261026T160000Z.dump
#
#   # Restore from a local .dump file into a drill database:
#   TARGET_DATABASE_URL=postgres://... RESTORE_CONFIRM=yes ./infra/scripts/restore.sh /tmp/playora.dump
# =============================================================================
set -eu

if [ "$#" -lt 1 ]; then
  printf 'Usage: %s <s3-object-name | s3://bucket/key | /path/to/file.dump>\n' "$0" >&2
  exit 1
fi

SOURCE_ARG="$1"
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/infra/env/.env.prod}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

TARGET_DB_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:-}}"
: "${TARGET_DB_URL:?TARGET_DATABASE_URL or DATABASE_URL must be set}"

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  printf 'WARNING: This will overwrite objects in the target database.\n' >&2
  printf 'Re-run with RESTORE_CONFIRM=yes to proceed.\n' >&2
  exit 1
fi

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/playora-restore.XXXXXX")
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT INT TERM

log() {
  printf '[%s] [restore] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

s3_cmd() {
  S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT:-${S3_ENDPOINT:-}}"
  : "${S3_ENDPOINT_URL:?BACKUP_S3_ENDPOINT (or S3_ENDPOINT) must be set}"
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-${S3_ACCESS_KEY:-}}"
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-${S3_SECRET_KEY:-}}"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
  : "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY) must be set}"
  : "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY (or S3_SECRET_KEY) must be set}"

  if command -v aws >/dev/null 2>&1; then
    aws --endpoint-url "${S3_ENDPOINT_URL}" "$@"
  else
    docker run --rm \
      -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
      -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
      -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION}" \
      -v "${WORK_DIR}:${WORK_DIR}" \
      -w "${WORK_DIR}" \
      amazon/aws-cli:2.22.0 \
      --endpoint-url "${S3_ENDPOINT_URL}" "$@"
  fi
}

verify_sha256() {
  dir="$1"
  sha_file="$2"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "${dir}" && sha256sum -c "${sha_file}")
  else
    (cd "${dir}" && shasum -a 256 -c "${sha_file}")
  fi
}

START_EPOCH=$(date +%s)

if [ -f "${SOURCE_ARG}" ]; then
  LOCAL_DUMP="${SOURCE_ARG}"
  log "Using local dump file: ${LOCAL_DUMP}"
else
  case "${SOURCE_ARG}" in
    s3://*)
      S3_URI="${SOURCE_ARG}"
      ;;
    *)
      : "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET must be set when restoring by object name}"
      BACKUP_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
      S3_URI="s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/${SOURCE_ARG}"
      ;;
  esac

  DUMP_BASENAME=$(basename "${S3_URI}")
  LOCAL_DUMP="${WORK_DIR}/${DUMP_BASENAME}"
  LOCAL_SHA="${LOCAL_DUMP}.sha256"

  log "Downloading ${S3_URI}..."
  s3_cmd s3 cp "${S3_URI}" "${LOCAL_DUMP}" --only-show-errors

  if s3_cmd s3 cp "${S3_URI}.sha256" "${LOCAL_SHA}" --only-show-errors 2>/dev/null; then
    log "Verifying SHA-256 checksum..."
    verify_sha256 "${WORK_DIR}" "${LOCAL_SHA}"
  else
    log "No .sha256 sidecar found; continuing without checksum verification."
  fi
fi

if [ ! -s "${LOCAL_DUMP}" ]; then
  log "ERROR: dump file ${LOCAL_DUMP} does not exist or is empty"
  exit 1
fi

log "Running pg_restore into target database..."
if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --clean --if-exists --no-owner --no-acl --single-transaction \
    --dbname="${TARGET_DB_URL}" "${LOCAL_DUMP}"
else
  docker run --rm -i --network host \
    -e TARGET_DB_URL="${TARGET_DB_URL}" \
    postgres:17-alpine \
    sh -ceu 'pg_restore --clean --if-exists --no-owner --no-acl --single-transaction --dbname="$TARGET_DB_URL"' <"${LOCAL_DUMP}"
fi

END_EPOCH=$(date +%s)
ELAPSED=$((END_EPOCH - START_EPOCH))
log "Restore completed in ${ELAPSED}s. Record this duration in docs/operations/runbook.md."
