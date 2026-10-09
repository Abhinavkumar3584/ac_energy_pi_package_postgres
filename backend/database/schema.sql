-- AC Energy Monitoring - PostgreSQL schema
-- Target: PostgreSQL 14+
-- Designed for Raspberry Pi / edge deployments with high-frequency telemetry.

BEGIN;

CREATE TABLE IF NOT EXISTS rooms (
    room_id              VARCHAR(64) PRIMARY KEY,
    room_name            VARCHAR(128) NOT NULL,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
    updated_at           TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp()
);

-- Replaces room_energy_control.csv. This table is small and changes infrequently.
CREATE TABLE IF NOT EXISTS room_controls (
    room_id              VARCHAR(64) PRIMARY KEY REFERENCES rooms(room_id) ON DELETE CASCADE,
    daily_limit_kwh      DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (daily_limit_kwh >= 0),
    tariff_per_kwh       NUMERIC(12,4) NOT NULL DEFAULT 8.50 CHECK (tariff_per_kwh >= 0),
    cutoff_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    relay_state          VARCHAR(8) NOT NULL DEFAULT 'ON' CHECK (relay_state IN ('ON','OFF')),
    cutoff_time          TIMESTAMPTZ(6),
    updated_at           TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp()
);

-- Current per-room state. One row per room, so live/day calculations never scan raw logs.
CREATE TABLE IF NOT EXISTS room_runtime_state (
    room_id               VARCHAR(64) PRIMARY KEY REFERENCES rooms(room_id) ON DELETE CASCADE,
    state_date            DATE,
    day_start_meter_kwh   DOUBLE PRECISION,
    current_daily_kwh     DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_meter_kwh        DOUBLE PRECISION,
    last_update           TIMESTAMPTZ(6),
    node_mac              VARCHAR(32),
    voltage               DOUBLE PRECISION,
    current_amp           DOUBLE PRECISION,
    power_w               DOUBLE PRECISION,
    frequency_hz          DOUBLE PRECISION,
    power_factor          DOUBLE PRECISION,
    pzem_ok               BOOLEAN,
    packet_count          BIGINT,
    updated_at            TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp()
);

-- Raw telemetry. ingest_uuid makes retries idempotent after a DB/network failure.
CREATE TABLE IF NOT EXISTS ac_energy_logs (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ingest_uuid           UUID NOT NULL UNIQUE,
    room_id               VARCHAR(64) NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    node_mac              VARCHAR(32),
    voltage               DOUBLE PRECISION,
    current_amp           DOUBLE PRECISION,
    power_w               DOUBLE PRECISION,
    meter_energy_kwh      DOUBLE PRECISION,
    daily_energy_kwh      DOUBLE PRECISION,
    frequency_hz          DOUBLE PRECISION,
    power_factor          DOUBLE PRECISION,
    pzem_ok               BOOLEAN,
    relay_state           VARCHAR(8),
    packet_count          BIGINT,
    created_at            TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp()
);

-- Critical latest-reading index requested by the dashboard.
-- INCLUDE helps PostgreSQL satisfy common latest-value queries with fewer heap reads.
CREATE INDEX IF NOT EXISTS idx_ac_energy_logs_room_created_desc
    ON ac_energy_logs (room_id, created_at DESC)
    INCLUDE (voltage, current_amp, power_w, meter_energy_kwh,
             daily_energy_kwh, frequency_hz, power_factor, pzem_ok, relay_state, node_mac);

-- Efficient time-range pruning for maintenance and broad historical scans.
CREATE INDEX IF NOT EXISTS idx_ac_energy_logs_created_brin
    ON ac_energy_logs USING BRIN (created_at) WITH (pages_per_range = 32);

-- One row per room/day. Historical charts and ranking should primarily read this table.
CREATE TABLE IF NOT EXISTS daily_room_summary (
    summary_date          DATE NOT NULL,
    room_id               VARCHAR(64) NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    start_meter_kwh       DOUBLE PRECISION,
    end_meter_kwh         DOUBLE PRECISION,
    daily_energy_kwh      DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_voltage           DOUBLE PRECISION,
    avg_current_amp       DOUBLE PRECISION,
    avg_power_w           DOUBLE PRECISION,
    peak_power_w          DOUBLE PRECISION,
    avg_power_factor      DOUBLE PRECISION,
    samples_count         BIGINT NOT NULL DEFAULT 0,
    first_sample_at       TIMESTAMPTZ(6),
    last_sample_at        TIMESTAMPTZ(6),
    daily_limit_kwh       DOUBLE PRECISION NOT NULL DEFAULT 0,
    limit_exceeded        BOOLEAN NOT NULL DEFAULT FALSE,
    cutoff_triggered      BOOLEAN NOT NULL DEFAULT FALSE,
    cutoff_time           TIMESTAMPTZ(6),
    tariff_per_kwh        NUMERIC(12,4) NOT NULL DEFAULT 0,
    energy_charge_inr     NUMERIC(14,4) NOT NULL DEFAULT 0,
    source                VARCHAR(24) NOT NULL DEFAULT 'rollover',
    updated_at            TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (summary_date, room_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_room_summary_room_date_desc
    ON daily_room_summary (room_id, summary_date DESC)
    INCLUDE (daily_energy_kwh, energy_charge_inr, peak_power_w);

CREATE INDEX IF NOT EXISTS idx_daily_room_summary_date_room
    ON daily_room_summary (summary_date, room_id)
    INCLUDE (daily_energy_kwh, energy_charge_inr);

COMMIT;

ANALYZE rooms;
ANALYZE room_controls;
ANALYZE room_runtime_state;
ANALYZE ac_energy_logs;
ANALYZE daily_room_summary;
