#!/bin/bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must be set}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "SELECT * FROM aggregate_and_purge_ac_energy(30);" \
  -c "VACUUM (ANALYZE) ac_energy_logs;"
