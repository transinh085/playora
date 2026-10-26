#!/bin/sh
# =============================================================================
# Playora PostgreSQL Logical Backup to S3-Compatible Storage
# =============================================================================
# Usage:
#   ENV_FILE=/opt/playora/infra/env/.env.prod ./infra/scripts/backup.sh
#
# Creates a compressed custom-format `pg_dump` of `DATABASE_URL`, computes a
# SHA-256 digest, uploads both to `s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/`,
# and prunes backups older than `BACKUP_RETENTION_DAYS` (default: 30).
# =============================================================================
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/infra/env/.env.prod}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET must be set}"

S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT:-${S3_ENDPOINT:-}}"
: "${S3_ENDPOINT_URL:?BACKUP_S3_ENDPOINT (or S3_ENDPOINT) must be set}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-${S3_ACCESS_KEY:-}}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-${S3_SECRET_KEY:-}}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY) must be set}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY (or S3_SECRET_KEY) must be set}"

BACKUP_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/playora-backup.XXXXXX")
DUMP_NAME="playora-${TIMESTAMP}.dump"
DUMP_PATH="${WORK_DIR}/${DUMP_NAME}"
SHA_PATH="${DUMP_PATH}.sha256"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT INT TERM

log() {
  printf '[%s] [backup] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

run_pg_dump() {
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --format=custom --compress=6 --no-owner --no-acl "${DATABASE_URL}" >"${DUMP_PATH}"
  else
    docker run --rm --network host \
      -e DATABASE_URL="${DATABASE_URL}" \
      postgres:17-alpine \
      sh -ceu 'pg_dump --format=custom --compress=6 --no-owner --no-acl "$DATABASE_URL"' >"${DUMP_PATH}"
  fi
}

compute_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "${WORK_DIR}" && sha256sum "${DUMP_NAME}" >"${SHA_PATH}")
  else
    (cd "${WORK_DIR}" && shasum -a 256 "${DUMP_NAME}" >"${SHA_PATH}")
  fi
}

s3_cmd() {
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

cutoff_date_utc() {
  days="$1"
  if date -u -d "${days} days ago" +"%Y%m%d" >/dev/null 2>&1; then
    date -u -d "${days} days ago" +"%Y%m%d"
  else
    date -u -v-"${days}"d +"%Y%m%d"
  fi
}

log "Starting pg_dump to ${DUMP_NAME}..."
run_pg_dump

if [ ! -s "${DUMP_PATH}" ]; then
  log "ERROR: dump file ${DUMP_PATH} is empty"
  exit 1
fi

compute_sha256

S3_BASE="s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}"
log "Uploading ${DUMP_NAME} and checksum to ${S3_BASE}/..."
s3_cmd s3 cp "${DUMP_PATH}" "${S3_BASE}/${DUMP_NAME}" --only-show-errors
s3_cmd s3 cp "${SHA_PATH}" "${S3_BASE}/${DUMP_NAME}.sha256" --only-show-errors
log "Upload complete: ${S3_BASE}/${DUMP_NAME}"

CUTOFF_YMD=$(cutoff_date_utc "${RETENTION_DAYS}")
log "Pruning backups in ${S3_BASE}/ older than ${RETENTION_DAYS} days (before ${CUTOFF_YMD})..."

s3_cmd s3 ls "${S3_BASE}/" | while read -r _date _time _size obj_name; do
  case "${obj_name}" in
    playora-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T*.dump*)
      obj_ymd=$(printf '%s' "${obj_name}" | sed -n 's/^playora-\([0-9]\{8\}\)T.*/\1/p')
      if [ -n "${obj_ymd}" ] && [ "${obj_ymd}" -lt "${CUTOFF_YMD}" ]; then
        log "Deleting expired backup object: ${obj_name}"
        s3_cmd s3 rm "${S3_BASE}/${obj_name}" --only-show-errors
      fi
      ;;
    *)
      ;;
  esac
done

log "Backup and retention check finished."
