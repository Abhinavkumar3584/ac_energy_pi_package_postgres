-- Optimized dashboard queries

-- Query 1: most recent persisted live status for every active room.
-- NOTE: your Flask dashboard can be even faster by continuing to serve /api/live
-- from the in-memory store. This query is for recovery, diagnostics, or multi-process use.
SELECT DISTINCT ON (l.room_id)
       l.room_id,
       r.room_name,
       l.node_mac,
       l.voltage,
       l.current_amp,
       l.power_w,
       l.meter_energy_kwh,
       l.daily_energy_kwh,
       l.frequency_hz,
       l.power_factor,
       l.pzem_ok,
       l.relay_state,
       l.created_at
FROM ac_energy_logs AS l
JOIN rooms AS r ON r.room_id = l.room_id
WHERE r.active = TRUE
ORDER BY l.room_id, l.created_at DESC;

-- Faster current-state version (one row per room, no raw-log lookup).
SELECT rs.room_id,
       r.room_name,
       rs.node_mac,
       rs.voltage,
       rs.current_amp,
       rs.power_w,
       rs.last_meter_kwh AS meter_energy_kwh,
       rs.current_daily_kwh AS daily_energy_kwh,
       rs.frequency_hz,
       rs.power_factor,
       rs.pzem_ok,
       c.relay_state,
       rs.last_update AS created_at
FROM room_runtime_state rs
JOIN rooms r ON r.room_id = rs.room_id AND r.active = TRUE
LEFT JOIN room_controls c ON c.room_id = rs.room_id
ORDER BY rs.room_id;

-- Query 2: current-month consumption per room.
-- Closed days come from daily_room_summary; today's amount comes from room_runtime_state.
WITH closed_days AS (
    SELECT room_id,
           SUM(daily_energy_kwh) AS kwh,
           SUM(energy_charge_inr) AS cost
    FROM daily_room_summary
    WHERE summary_date >= date_trunc('month', CURRENT_DATE)::date
      AND summary_date < CURRENT_DATE
    GROUP BY room_id
), today AS (
    SELECT rs.room_id,
           CASE WHEN rs.state_date = CURRENT_DATE THEN rs.current_daily_kwh ELSE 0 END AS kwh,
           CASE WHEN rs.state_date = CURRENT_DATE
                THEN rs.current_daily_kwh * COALESCE(c.tariff_per_kwh, 0)
                ELSE 0 END AS cost
    FROM room_runtime_state rs
    LEFT JOIN room_controls c ON c.room_id = rs.room_id
)
SELECT r.room_id,
       r.room_name,
       COALESCE(h.kwh, 0) + COALESCE(t.kwh, 0) AS month_kwh,
       COALESCE(h.cost, 0) + COALESCE(t.cost, 0) AS month_cost_inr
FROM rooms r
LEFT JOIN closed_days h ON h.room_id = r.room_id
LEFT JOIN today t ON t.room_id = r.room_id
WHERE r.active = TRUE
ORDER BY month_kwh DESC, r.room_id;

-- Query 3: Room Consumption Ranking for a date range.
-- Parameters:
--   $1 = start date (inclusive)
--   $2 = end date   (inclusive)
WITH closed AS (
    SELECT room_id,
           SUM(daily_energy_kwh) AS kwh,
           SUM(energy_charge_inr) AS cost
    FROM daily_room_summary
    WHERE summary_date BETWEEN $1::date AND LEAST($2::date, CURRENT_DATE - 1)
    GROUP BY room_id
), today AS (
    SELECT rs.room_id,
           rs.current_daily_kwh AS kwh,
           rs.current_daily_kwh * COALESCE(c.tariff_per_kwh, 0) AS cost
    FROM room_runtime_state rs
    LEFT JOIN room_controls c ON c.room_id = rs.room_id
    WHERE CURRENT_DATE BETWEEN $1::date AND $2::date
      AND rs.state_date = CURRENT_DATE
)
SELECT r.room_id,
       r.room_name,
       COALESCE(c.kwh, 0) + COALESCE(t.kwh, 0) AS total_kwh,
       COALESCE(c.cost, 0) + COALESCE(t.cost, 0) AS total_cost_inr
FROM rooms r
LEFT JOIN closed c ON c.room_id = r.room_id
LEFT JOIN today t ON t.room_id = r.room_id
WHERE r.active = TRUE
  AND (COALESCE(c.kwh, 0) + COALESCE(t.kwh, 0)) > 0
ORDER BY total_kwh DESC, r.room_id;
