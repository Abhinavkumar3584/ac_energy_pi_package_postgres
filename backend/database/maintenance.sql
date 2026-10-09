-- AC Energy raw-log aggregation and retention maintenance.
-- Run once after schema.sql.
-- Then call: SELECT aggregate_and_purge_ac_energy(30);

CREATE OR REPLACE FUNCTION aggregate_and_purge_ac_energy(retention_days integer DEFAULT 30)
RETURNS TABLE(aggregated_rows bigint, deleted_rows bigint)
LANGUAGE plpgsql
AS $$
DECLARE
    cutoff_ts timestamptz := date_trunc('day', clock_timestamp()) - make_interval(days => retention_days);
    inserted_count bigint := 0;
    deleted_count bigint := 0;
    loop_deleted bigint := 0;
BEGIN
    -- Create missing daily summaries only. Existing rollover summaries are authoritative.
    WITH ordered AS (
        SELECT
            l.*,
            (l.created_at AT TIME ZONE current_setting('TIMEZONE'))::date AS local_day,
            LAG(l.meter_energy_kwh) OVER (
                PARTITION BY l.room_id, (l.created_at AT TIME ZONE current_setting('TIMEZONE'))::date
                ORDER BY l.created_at
            ) AS prev_meter
        FROM ac_energy_logs l
        WHERE l.created_at < cutoff_ts
    ), aggregated AS (
        SELECT
            local_day AS summary_date,
            room_id,
            (array_agg(meter_energy_kwh ORDER BY created_at)
                FILTER (WHERE meter_energy_kwh IS NOT NULL))[1] AS start_meter_kwh,
            (array_agg(meter_energy_kwh ORDER BY created_at DESC)
                FILTER (WHERE meter_energy_kwh IS NOT NULL))[1] AS end_meter_kwh,
            COALESCE(SUM(
                CASE
                    WHEN meter_energy_kwh IS NULL OR prev_meter IS NULL THEN 0
                    WHEN meter_energy_kwh >= prev_meter THEN meter_energy_kwh - prev_meter
                    ELSE 0
                END
            ), 0) AS daily_energy_kwh,
            AVG(voltage) AS avg_voltage,
            AVG(current_amp) AS avg_current_amp,
            AVG(power_w) AS avg_power_w,
            MAX(power_w) AS peak_power_w,
            AVG(power_factor) AS avg_power_factor,
            COUNT(*)::bigint AS samples_count,
            MIN(created_at) AS first_sample_at,
            MAX(created_at) AS last_sample_at
        FROM ordered
        GROUP BY local_day, room_id
    )
    INSERT INTO daily_room_summary (
        summary_date, room_id, start_meter_kwh, end_meter_kwh,
        daily_energy_kwh, avg_voltage, avg_current_amp, avg_power_w,
        peak_power_w, avg_power_factor, samples_count,
        first_sample_at, last_sample_at,
        daily_limit_kwh, limit_exceeded, cutoff_triggered, cutoff_time,
        tariff_per_kwh, energy_charge_inr, source, updated_at
    )
    SELECT
        a.summary_date,
        a.room_id,
        a.start_meter_kwh,
        a.end_meter_kwh,
        a.daily_energy_kwh,
        a.avg_voltage,
        a.avg_current_amp,
        a.avg_power_w,
        a.peak_power_w,
        a.avg_power_factor,
        a.samples_count,
        a.first_sample_at,
        a.last_sample_at,
        COALESCE(c.daily_limit_kwh, 0),
        COALESCE(c.daily_limit_kwh, 0) > 0 AND a.daily_energy_kwh >= COALESCE(c.daily_limit_kwh, 0),
        FALSE,
        NULL,
        COALESCE(c.tariff_per_kwh, 0),
        a.daily_energy_kwh * COALESCE(c.tariff_per_kwh, 0),
        'maintenance',
        clock_timestamp()
    FROM aggregated a
    LEFT JOIN room_controls c ON c.room_id = a.room_id
    ON CONFLICT (summary_date, room_id) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    -- Delete old raw rows in chunks to avoid one very large lock/transaction operation.
    LOOP
        WITH doomed AS (
            SELECT ctid
            FROM ac_energy_logs
            WHERE created_at < cutoff_ts
            LIMIT 50000
        )
        DELETE FROM ac_energy_logs l
        USING doomed d
        WHERE l.ctid = d.ctid;

        GET DIAGNOSTICS loop_deleted = ROW_COUNT;
        deleted_count := deleted_count + loop_deleted;
        EXIT WHEN loop_deleted = 0;
    END LOOP;

    RETURN QUERY SELECT inserted_count, deleted_count;
END;
$$;

-- Suggested Linux cron (not SQL):
-- 15 0 * * * psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT * FROM aggregate_and_purge_ac_energy(30);" -c "VACUUM (ANALYZE) ac_energy_logs;" >> /var/log/ac-energy-db-maintenance.log 2>&1
