#!/usr/bin/env python3
"""Import the existing CSV control/history files into PostgreSQL.

Usage:
  export DATABASE_URL='postgresql://ac_energy:password@localhost/ac_energy'
  python3 migrate_csv_to_postgres.py /path/to/current/ac_energy_pi_package
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

import psycopg


def b(v):
    return str(v or '').strip().lower() in {'1','true','yes','on'}


def f(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def parse_ts(v):
    s = str(v or '').strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: migrate_csv_to_postgres.py /path/to/ac_energy_pi_package')
    root = Path(sys.argv[1]).resolve()
    control_csv = root / 'data' / 'room_energy_control.csv'
    history_csv = root / 'data' / 'daily_energy_history.csv'
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise SystemExit('DATABASE_URL is not set')

    controls = []
    if control_csv.exists():
        with control_csv.open(newline='', encoding='utf-8', errors='replace') as fp:
            controls = list(csv.DictReader(fp))

    history = []
    if history_csv.exists():
        with history_csv.open(newline='', encoding='utf-8', errors='replace') as fp:
            history = list(csv.DictReader(fp))

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            valid_rooms = 0
            for r in controls:
                room_id = str(r.get('room_id') or '').strip()
                # Ignore visibly corrupted legacy IDs containing replacement/NUL characters.
                if not room_id or '\ufffd' in room_id or '\x00' in room_id:
                    print('SKIP malformed room_id:', repr(room_id))
                    continue
                room_name = str(r.get('room_name') or room_id.replace('_',' ').title()).strip()
                cur.execute('''
                    INSERT INTO rooms(room_id,room_name,active)
                    VALUES(%s,%s,%s)
                    ON CONFLICT(room_id) DO UPDATE SET
                      room_name=EXCLUDED.room_name,
                      active=EXCLUDED.active,
                      updated_at=clock_timestamp()
                ''', (room_id, room_name, b(r.get('active','TRUE'))))
                cur.execute('''
                    INSERT INTO room_controls(
                      room_id,daily_limit_kwh,tariff_per_kwh,cutoff_enabled,
                      relay_state,cutoff_time,updated_at
                    ) VALUES(%s,%s,%s,%s,%s,%s,clock_timestamp())
                    ON CONFLICT(room_id) DO UPDATE SET
                      daily_limit_kwh=EXCLUDED.daily_limit_kwh,
                      tariff_per_kwh=EXCLUDED.tariff_per_kwh,
                      cutoff_enabled=EXCLUDED.cutoff_enabled,
                      relay_state=EXCLUDED.relay_state,
                      cutoff_time=EXCLUDED.cutoff_time,
                      updated_at=clock_timestamp()
                ''', (
                    room_id, max(0,f(r.get('daily_limit_kwh'))), max(0,f(r.get('tariff_per_kwh'),8.5)),
                    b(r.get('cutoff_enabled')), str(r.get('relay_state') or 'ON').upper(), parse_ts(r.get('cutoff_time')),
                ))
                state_date = str(r.get('last_reset_date') or '').strip() or None
                cur.execute('''
                    INSERT INTO room_runtime_state(
                      room_id,state_date,day_start_meter_kwh,current_daily_kwh,
                      last_meter_kwh,last_update,updated_at
                    ) VALUES(%s,%s,%s,%s,%s,%s,clock_timestamp())
                    ON CONFLICT(room_id) DO UPDATE SET
                      state_date=EXCLUDED.state_date,
                      day_start_meter_kwh=EXCLUDED.day_start_meter_kwh,
                      current_daily_kwh=EXCLUDED.current_daily_kwh,
                      last_meter_kwh=EXCLUDED.last_meter_kwh,
                      last_update=EXCLUDED.last_update,
                      updated_at=clock_timestamp()
                ''', (
                    room_id, state_date, f(r.get('day_start_meter_kwh'),None),
                    f(r.get('current_daily_kwh'),0), f(r.get('last_meter_kwh'),None),
                    parse_ts(r.get('last_update')),
                ))
                valid_rooms += 1

            hist_count = 0
            for r in history:
                room_id = str(r.get('room_id') or '').strip()
                day = str(r.get('date') or '').strip()
                if not room_id or not day or '\ufffd' in room_id:
                    continue
                # Ensure history-only rooms still satisfy the foreign key.
                cur.execute('''
                    INSERT INTO rooms(room_id,room_name,active)
                    VALUES(%s,%s,TRUE)
                    ON CONFLICT(room_id) DO NOTHING
                ''', (room_id, room_id.replace('_',' ').title()))
                cur.execute('''
                    INSERT INTO room_controls(room_id)
                    VALUES(%s) ON CONFLICT(room_id) DO NOTHING
                ''', (room_id,))
                daily = max(0,f(r.get('daily_energy_kwh')))
                limit = max(0,f(r.get('daily_limit_kwh')))
                tariff = max(0,f(r.get('tariff_per_kwh'),8.5))
                charge = f(r.get('energy_charge_inr'), daily*tariff)
                cur.execute('''
                    INSERT INTO daily_room_summary(
                      summary_date,room_id,start_meter_kwh,end_meter_kwh,
                      daily_energy_kwh,daily_limit_kwh,limit_exceeded,
                      cutoff_triggered,cutoff_time,tariff_per_kwh,
                      energy_charge_inr,source,updated_at
                    ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'csv_migration',clock_timestamp())
                    ON CONFLICT(summary_date,room_id) DO UPDATE SET
                      start_meter_kwh=EXCLUDED.start_meter_kwh,
                      end_meter_kwh=EXCLUDED.end_meter_kwh,
                      daily_energy_kwh=EXCLUDED.daily_energy_kwh,
                      daily_limit_kwh=EXCLUDED.daily_limit_kwh,
                      limit_exceeded=EXCLUDED.limit_exceeded,
                      cutoff_triggered=EXCLUDED.cutoff_triggered,
                      cutoff_time=EXCLUDED.cutoff_time,
                      tariff_per_kwh=EXCLUDED.tariff_per_kwh,
                      energy_charge_inr=EXCLUDED.energy_charge_inr,
                      source='csv_migration',
                      updated_at=clock_timestamp()
                ''', (
                    day, room_id, f(r.get('start_meter_kwh'),None), f(r.get('end_meter_kwh'),None),
                    daily, limit, b(r.get('limit_exceeded')), b(r.get('cutoff_triggered')),
                    parse_ts(r.get('cutoff_time')), tariff, charge,
                ))
                hist_count += 1

        conn.commit()

    print(f'Imported {valid_rooms} room/control rows and {hist_count} daily history rows.')


if __name__ == '__main__':
    main()
