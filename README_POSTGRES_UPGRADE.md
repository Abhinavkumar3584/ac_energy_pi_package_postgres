# AC Energy Dashboard - PostgreSQL Upgrade

This package is tailored to the uploaded `ac_energy_pi_package` project.

## What is causing the current lag

The existing backend does this inside every `EnergyStore.process_reading()` call:

1. Opens and reads `data/room_energy_control.csv`.
2. Searches the CSV for the room.
3. Rewrites the full CSV through a temporary file + `os.replace()`.
4. The Flask `/api/control` and `/api/history` routes can access the same CSV files under the same `RLock`.

With frequent ESP32 packets, disk I/O grows linearly with packet rate and can block dashboard/API work. The existing `store.live` dictionary is already a good idea and is retained: `/api/live` should remain an in-memory operation.

I also found one malformed/corrupted legacy room row in the uploaded control CSV. The migration script skips IDs containing Unicode replacement characters so that bad row is not imported into PostgreSQL.

## Recommended architecture

```text
ESP32 / ESP-NOW nodes
        |
        v
ESP32 USB gateway
        |
        v
SerialHub (same parsing)
        |
        +--> RAM latest-room dictionary ------> /api/live (fast, no SQL)
        |
        +--> non-blocking queue
                 |
                 v
        PostgreSQL batch writer
        every 10 s OR 1000 packets
                 |
                 +--> ac_energy_logs           raw telemetry
                 +--> room_runtime_state       one current row/room
                 +--> daily_room_summary       one row/room/day
```

The database is therefore **not** placed in the 1-second live UI path.

## Database tables

### `ac_energy_logs`
Raw packet history. `BIGINT` identity key, `TIMESTAMPTZ(6)`, `DOUBLE PRECISION` electrical fields, idempotent `UUID`, and the requested composite latest-reading index:

```sql
CREATE INDEX idx_ac_energy_logs_room_created_desc
ON ac_energy_logs (room_id, created_at DESC);
```

The supplied version also uses `INCLUDE (...)` so common latest-value reads can avoid extra heap access when PostgreSQL chooses an index-only plan.

### `daily_room_summary`
One row per room/day. Monthly graphs, ranking and long historical reports should query this table instead of raw logs.

### `room_runtime_state`
One row per room. Holds today's meter baseline/current kWh and the latest persisted telemetry state. This avoids calculating today's energy by scanning raw packets.

### `room_controls`
Database replacement for `room_energy_control.csv`.

### `rooms`
Room metadata / active state.

## About "sub-millisecond" queries

No database design can honestly *guarantee* sub-millisecond response time: cache state, Raspberry Pi storage, concurrent load, network latency and row count all matter. The `(room_id, created_at DESC)` index and one-row runtime table make the access pattern optimal, but benchmark with `EXPLAIN (ANALYZE, BUFFERS)` on the actual Pi before setting an SLA.

For the dashboard itself, `/api/live` remains in RAM and normally avoids SQL latency entirely.

## Files

- `database/schema.sql` - complete PostgreSQL DDL + indexes.
- `database/queries.sql` - live, monthly comparison and ranking queries.
- `database/maintenance.sql` - 30-day aggregation + chunked raw-log purge.
- `db_store.py` - queue, batch writer, DB fallback spool and PostgreSQL store.
- `app_postgres.py` - Flask backend with the same serial packet parsing/protocol.
- `migrate_csv_to_postgres.py` - imports your existing control/history CSV data.
- `requirements_postgres.txt` - Python packages.
- `install_postgres_pi.sh` - PostgreSQL setup helper.
- `ac-energy-db-maintenance.sh` - retention maintenance command.
- `ac-energy-postgres.service.example` - systemd example.

## Installation on Raspberry Pi

### 1. Back up the current working package

```bash
cp -a ~/ac_energy_pi_package ~/ac_energy_pi_package_before_postgres
```

Do not delete the current CSV files until migration has been checked.

### 2. Install PostgreSQL

From this upgrade folder:

```bash
export DB_PASSWORD='USE_A_STRONG_PASSWORD'
./install_postgres_pi.sh
```

Or install/configure PostgreSQL manually and run:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/maintenance.sql
```

### 3. Create Python venv / dependencies

Inside the AC dashboard project:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_postgres.txt
```

If `psycopg[binary]` is unavailable for a particular Raspberry Pi/Python build, install PostgreSQL development headers and use the C package:

```bash
sudo apt install -y libpq-dev python3-dev build-essential
pip install 'psycopg[c]>=3.2,<4'
```

### 4. Import the current CSV data

```bash
export DATABASE_URL='postgresql://ac_energy:YOUR_PASSWORD@127.0.0.1:5432/ac_energy'
python3 migrate_csv_to_postgres.py ~/ac_energy_pi_package
```

Then verify:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM rooms ORDER BY room_id;"
psql "$DATABASE_URL" -c "SELECT * FROM room_runtime_state ORDER BY room_id;"
psql "$DATABASE_URL" -c "SELECT summary_date,room_id,daily_energy_kwh FROM daily_room_summary ORDER BY summary_date DESC,room_id LIMIT 20;"
```

### 5. Test the PostgreSQL backend without replacing the working backend

Copy `db_store.py` and `app_postgres.py` beside the current `app.py`, and keep the existing `templates/index.html`.

```bash
export DATABASE_URL='postgresql://ac_energy:YOUR_PASSWORD@127.0.0.1:5432/ac_energy'
export AC_DB_FLUSH_SECONDS=10
export AC_DB_BATCH_SIZE=1000
python3 app_postgres.py
```

Open the same dashboard URL:

```text
http://PI_IP:5000
```

The existing HTML `/api/live`, `/api/control`, `/api/history`, `/api/report`, `/api/relay`, `/api/connect`, `/api/disconnect`, `/api/ports`, `/api/status` URLs remain available.

An extra diagnostic endpoint is provided:

```text
/api/db/health
```

It shows queue depth, last PostgreSQL error, last flush time and failure-spool size.

## Batch behavior

Defaults:

```text
flush interval : 10 seconds
batch size     : 1000 packets
max RAM queue  : 50,000 packets
```

A flush happens when either the interval expires or the queue reaches the batch size.

### DB failure behavior

If PostgreSQL becomes unavailable:

1. Serial reading continues.
2. `/api/live` continues to use RAM.
3. A failed drained batch is written to `data/postgres_failed_telemetry.ndjson`.
4. The writer retries with exponential backoff (1 s -> 2 -> 4 -> ... -> 30 s).
5. On reconnection, the spool is replayed before being removed.
6. `ingest_uuid UNIQUE` + `ON CONFLICT DO NOTHING` prevents duplicate telemetry during retry/replay.

The NDJSON file is an emergency write-ahead fallback only; the dashboard never queries it.

## Daily aggregation and 30-day retention

Install a cron entry after everything is stable:

```bash
crontab -e
```

Example:

```cron
15 0 * * * DATABASE_URL='postgresql://ac_energy:YOUR_PASSWORD@127.0.0.1:5432/ac_energy' /opt/ac-energy/ac-energy-db-maintenance.sh >> /var/log/ac-energy-db-maintenance.log 2>&1
```

The SQL function:

```sql
SELECT * FROM aggregate_and_purge_ac_energy(30);
```

first creates any **missing** daily summaries from old raw logs, then removes raw rows older than 30 days in 50,000-row chunks. Existing daily rollover rows are kept as authoritative.

The maintenance script then runs:

```sql
VACUUM (ANALYZE) ac_energy_logs;
```

## Queries for the new UI panels

`database/queries.sql` includes:

1. Latest persisted room status.
2. Current-month room totals = closed daily summaries + today's runtime value.
3. Date-range room ranking sorted by kWh.

For your purple dashboard, the monthly-comparison and ranking APIs should query `daily_room_summary` / `room_runtime_state`, not `ac_energy_logs`.

## Recommended migration sequence

Do **not** switch everything at once.

1. Install PostgreSQL.
2. Import the CSV snapshot.
3. Run `app_postgres.py` manually.
4. Confirm `/api/live` and serial packets.
5. Confirm current daily kWh for ROOM_101/102/103.
6. Confirm history and billing.
7. Test relay ON/OFF.
8. Disconnect PostgreSQL for 30-60 seconds and confirm `/api/live` remains responsive and the spool is created/replayed.
9. Only then change the systemd service from `app.py` to `app_postgres.py`.
10. Keep the old project backup for rollback.
