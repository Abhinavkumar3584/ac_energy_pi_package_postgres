#!/bin/bash
set -euo pipefail

DB_NAME="${DB_NAME:-ac_energy}"
DB_USER="${DB_USER:-ac_energy}"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_THIS_PASSWORD}"

sudo apt update
sudo apt install -y postgresql postgresql-contrib python3-venv

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='${DB_NAME}')\gexec
SQL

export PGPASSWORD="$DB_PASSWORD"
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f database/schema.sql
psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f database/maintenance.sql

echo
echo "PostgreSQL database created."
echo "Set this before running the backend:"
echo "export DATABASE_URL='postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}'"
