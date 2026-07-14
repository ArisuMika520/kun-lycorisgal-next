#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -r "$1" ]]; then
  echo "Usage: POSTGRES_PASSWORD=... $0 /path/to/backup.sql-or-dump" >&2
  exit 64
fi

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"

POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-lycorisgal}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_BIN_DIR="${POSTGRES_BIN_DIR:-/opt/postgresql-17.0/bin}"
PSQL_BIN="${PSQL_BIN:-${POSTGRES_BIN_DIR}/psql}"
PG_RESTORE_BIN="${PG_RESTORE_BIN:-${POSTGRES_BIN_DIR}/pg_restore}"
BACKUP_FILE="$1"

if [[ ! -x "$PSQL_BIN" || ! -x "$PG_RESTORE_BIN" ]]; then
  echo "PostgreSQL 17.0 client tools were not found in $POSTGRES_BIN_DIR" >&2
  exit 1
fi

client_version="$($PSQL_BIN --version)"
if [[ "$client_version" != 'psql (PostgreSQL) 17.0' ]]; then
  echo "Refusing restore: psql 17.0 required, got $client_version" >&2
  exit 1
fi

export PGPASSWORD="$POSTGRES_PASSWORD"
trap 'unset PGPASSWORD' EXIT

connection_args=(
  --host "$POSTGRES_HOST"
  --port "$POSTGRES_PORT"
  --username "$POSTGRES_USER"
  --dbname "$POSTGRES_DB"
  --no-password
)

server_version="$({
  "$PSQL_BIN" "${connection_args[@]}" \
    --tuples-only --no-align --command 'SHOW server_version;'
} | xargs)"

if [[ "$server_version" != 17.0* ]]; then
  echo "Refusing restore: PostgreSQL 17.0 required, got $server_version" >&2
  exit 1
fi

case "$BACKUP_FILE" in
  *.sql)
    "$PSQL_BIN" "${connection_args[@]}" \
      --set ON_ERROR_STOP=on < "$BACKUP_FILE"
    ;;
  *)
    "$PG_RESTORE_BIN" --exit-on-error --no-owner --no-privileges \
      "${connection_args[@]}" < "$BACKUP_FILE"
    ;;
esac

echo "Backup restored into PostgreSQL $server_version."
