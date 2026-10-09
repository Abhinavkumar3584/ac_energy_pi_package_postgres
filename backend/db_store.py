#!/usr/bin/env python3
"""PostgreSQL-backed storage for the AC Energy Dashboard.

Key goals:
- Keep live telemetry in RAM for instant /api/live responses.
- Never issue one SQL INSERT per ESP32 packet.
- Batch raw telemetry writes in a background worker.
- Coalesce current room state updates so only the newest state per room is persisted.
- Persist failed telemetry batches to a small NDJSON spool file and replay later.

This module is designed to replace the CSV EnergyStore while leaving SerialHub
packet parsing unchanged.
"""

from __future__ import annotations

import json
import os
import queue
import re
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import psycopg
from psycopg.rows import dict_row

_MAC_RE = re.compile(r"^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")

def sanitize_mac(value):
    """Return normalized AA:BB:CC:DD:EE:FF or empty string."""
    value = str(value or "").strip()
    if not _MAC_RE.fullmatch(value):
        return ""
    return value.upper()



BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SPOOL_FILE = DATA_DIR / "postgres_failed_telemetry.ndjson"


def as_bool(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def as_float(value: Any, default: Optional[float] = 0.0) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _local_today() -> date:
    # Matches the original app's "local Raspberry Pi day" behavior.
    return datetime.now().date()


@dataclass
class BatchConfig:
    flush_interval_seconds: float = 10.0
    batch_size: int = 1000
    max_queue_items: int = 50000
    reconnect_max_seconds: float = 30.0
    spool_replay_limit: int = 5000


class DatabaseBatchWriter:
    """Non-blocking telemetry queue + background PostgreSQL batch writer."""

    INSERT_LOG_SQL = """
        INSERT INTO ac_energy_logs (
            ingest_uuid, room_id, node_mac, voltage, current_amp, power_w,
            meter_energy_kwh, daily_energy_kwh, frequency_hz, power_factor,
            pzem_ok, relay_state, packet_count, created_at
        ) VALUES (
            %(ingest_uuid)s, %(room_id)s, %(node_mac)s, %(voltage)s,
            %(current_amp)s, %(power_w)s, %(meter_energy_kwh)s,
            %(daily_energy_kwh)s, %(frequency_hz)s, %(power_factor)s,
            %(pzem_ok)s, %(relay_state)s, %(packet_count)s, %(created_at)s
        )
        ON CONFLICT (ingest_uuid) DO NOTHING
    """

    UPSERT_RUNTIME_SQL = """
        INSERT INTO room_runtime_state (
            room_id, state_date, day_start_meter_kwh, current_daily_kwh,
            last_meter_kwh, last_update, node_mac, voltage, current_amp,
            power_w, frequency_hz, power_factor, pzem_ok, packet_count, updated_at
        ) VALUES (
            %(room_id)s, %(state_date)s, %(day_start_meter_kwh)s,
            %(current_daily_kwh)s, %(last_meter_kwh)s, %(last_update)s,
            %(node_mac)s, %(voltage)s, %(current_amp)s, %(power_w)s,
            %(frequency_hz)s, %(power_factor)s, %(pzem_ok)s,
            %(packet_count)s, clock_timestamp()
        )
        ON CONFLICT (room_id) DO UPDATE SET
            state_date = EXCLUDED.state_date,
            day_start_meter_kwh = EXCLUDED.day_start_meter_kwh,
            current_daily_kwh = EXCLUDED.current_daily_kwh,
            last_meter_kwh = EXCLUDED.last_meter_kwh,
            last_update = EXCLUDED.last_update,
            node_mac = EXCLUDED.node_mac,
            voltage = EXCLUDED.voltage,
            current_amp = EXCLUDED.current_amp,
            power_w = EXCLUDED.power_w,
            frequency_hz = EXCLUDED.frequency_hz,
            power_factor = EXCLUDED.power_factor,
            pzem_ok = EXCLUDED.pzem_ok,
            packet_count = EXCLUDED.packet_count,
            updated_at = clock_timestamp()
    """

    UPSERT_SUMMARY_SQL = """
        INSERT INTO daily_room_summary (
            summary_date, room_id, start_meter_kwh, end_meter_kwh,
            daily_energy_kwh, daily_limit_kwh, limit_exceeded,
            cutoff_triggered, cutoff_time, tariff_per_kwh,
            energy_charge_inr, source, updated_at
        ) VALUES (
            %(summary_date)s, %(room_id)s, %(start_meter_kwh)s,
            %(end_meter_kwh)s, %(daily_energy_kwh)s, %(daily_limit_kwh)s,
            %(limit_exceeded)s, %(cutoff_triggered)s, %(cutoff_time)s,
            %(tariff_per_kwh)s, %(energy_charge_inr)s, 'rollover', clock_timestamp()
        )
        ON CONFLICT (summary_date, room_id) DO UPDATE SET
            start_meter_kwh = EXCLUDED.start_meter_kwh,
            end_meter_kwh = EXCLUDED.end_meter_kwh,
            daily_energy_kwh = EXCLUDED.daily_energy_kwh,
            daily_limit_kwh = EXCLUDED.daily_limit_kwh,
            limit_exceeded = EXCLUDED.limit_exceeded,
            cutoff_triggered = EXCLUDED.cutoff_triggered,
            cutoff_time = EXCLUDED.cutoff_time,
            tariff_per_kwh = EXCLUDED.tariff_per_kwh,
            energy_charge_inr = EXCLUDED.energy_charge_inr,
            source = 'rollover',
            updated_at = clock_timestamp()
    """

    def __init__(self, dsn: str, config: Optional[BatchConfig] = None):
        self.dsn = dsn
        self.config = config or BatchConfig()
        self.telemetry_q: queue.Queue[dict] = queue.Queue(maxsize=self.config.max_queue_items)
        self.summary_q: queue.Queue[dict] = queue.Queue(maxsize=10000)
        self._runtime_lock = threading.RLock()
        self._runtime_pending: Dict[str, dict] = {}
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread = threading.Thread(target=self._worker, name="postgres-batch-writer", daemon=True)
        self.last_error = ""
        self.last_flush_at: Optional[datetime] = None
        self.total_written = 0
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._thread.start()

    def enqueue_telemetry(self, item: dict) -> None:
        # Serial parsing must never wait for PostgreSQL.
        try:
            self.telemetry_q.put_nowait(item)
        except queue.Full:
            # Queue saturation means DB has been unavailable for too long.
            # Persist this packet immediately to the failure spool rather than blocking SerialHub.
            self._append_spool([item])
        if self.telemetry_q.qsize() >= self.config.batch_size:
            self._wake.set()

    def set_runtime_state(self, room_id: str, state: dict) -> None:
        # Only the newest state per room is useful; coalescing prevents write amplification.
        with self._runtime_lock:
            self._runtime_pending[room_id] = dict(state)

    def enqueue_summary(self, summary: dict) -> None:
        try:
            self.summary_q.put_nowait(summary)
        except queue.Full:
            # Daily summaries are tiny and important. A full queue here is exceptional;
            # write them synchronously to a dedicated spool record.
            self._append_spool([{"_kind": "summary", "payload": summary}])
        self._wake.set()

    def stop(self, timeout: float = 8.0) -> None:
        self._stop.set()
        self._wake.set()
        self._thread.join(timeout=timeout)

    def health(self) -> dict:
        return {
            "queue_depth": self.telemetry_q.qsize(),
            "last_error": self.last_error,
            "last_flush_at": self.last_flush_at.isoformat() if self.last_flush_at else None,
            "total_written": self.total_written,
            "spool_exists": SPOOL_FILE.exists(),
            "spool_bytes": SPOOL_FILE.stat().st_size if SPOOL_FILE.exists() else 0,
        }

    def _drain_telemetry(self) -> List[dict]:
        out: List[dict] = []
        while len(out) < self.config.batch_size:
            try:
                out.append(self.telemetry_q.get_nowait())
            except queue.Empty:
                break
        return out

    def _drain_summaries(self) -> List[dict]:
        out: List[dict] = []
        while len(out) < 500:
            try:
                out.append(self.summary_q.get_nowait())
            except queue.Empty:
                break
        return out

    def _take_runtime_states(self) -> List[dict]:
        with self._runtime_lock:
            if not self._runtime_pending:
                return []
            out = list(self._runtime_pending.values())
            self._runtime_pending.clear()
            return out

    def _restore_runtime_states(self, states: Iterable[dict]) -> None:
        with self._runtime_lock:
            for state in states:
                rid = state.get("room_id")
                if rid and rid not in self._runtime_pending:
                    self._runtime_pending[rid] = state

    def _append_spool(self, items: Iterable[dict]) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with SPOOL_FILE.open("a", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item, default=str, separators=(",", ":")) + "\n")
            f.flush()
            os.fsync(f.fileno())

    def _read_spool_batch(self) -> List[dict]:
        if not SPOOL_FILE.exists():
            return []
        items: List[dict] = []
        with SPOOL_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                if len(items) >= self.config.spool_replay_limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return items

    def _remove_spool_prefix(self, count: int) -> None:
        if count <= 0 or not SPOOL_FILE.exists():
            return
        tmp = SPOOL_FILE.with_suffix(".ndjson.tmp")
        with SPOOL_FILE.open("r", encoding="utf-8") as src, tmp.open("w", encoding="utf-8") as dst:
            skipped = 0
            for line in src:
                if skipped < count:
                    skipped += 1
                    continue
                dst.write(line)
        os.replace(tmp, SPOOL_FILE)
        if SPOOL_FILE.exists() and SPOOL_FILE.stat().st_size == 0:
            SPOOL_FILE.unlink(missing_ok=True)

    def _normalize_spooled(self, item: dict) -> dict:
        # datetime/date values become strings in NDJSON. psycopg accepts ISO strings.
        return item

    def _flush_transaction(
        self,
        conn: psycopg.Connection,
        telemetry: List[dict],
        runtime_states: List[dict],
        summaries: List[dict],
    ) -> None:
        with conn.cursor() as cur:
            if telemetry:
                cur.executemany(self.INSERT_LOG_SQL, telemetry)
            if runtime_states:
                cur.executemany(self.UPSERT_RUNTIME_SQL, runtime_states)
            if summaries:
                cur.executemany(self.UPSERT_SUMMARY_SQL, summaries)
        conn.commit()

    def _worker(self) -> None:
        conn: Optional[psycopg.Connection] = None
        backoff = 1.0
        next_flush = time.monotonic() + self.config.flush_interval_seconds

        while not self._stop.is_set():
            timeout = max(0.05, next_flush - time.monotonic())
            self._wake.wait(timeout=timeout)
            self._wake.clear()

            due = time.monotonic() >= next_flush
            full = self.telemetry_q.qsize() >= self.config.batch_size
            has_summary = not self.summary_q.empty()
            if not (due or full or has_summary or SPOOL_FILE.exists()):
                continue

            telemetry = self._drain_telemetry()
            runtime_states = self._take_runtime_states()
            summaries = self._drain_summaries()
            spool_items = self._read_spool_batch()
            spool_telemetry: List[dict] = []
            spool_summaries: List[dict] = []
            for item in spool_items:
                if item.get("_kind") == "summary":
                    spool_summaries.append(item.get("payload") or {})
                else:
                    spool_telemetry.append(self._normalize_spooled(item))

            if not telemetry and not runtime_states and not summaries and not spool_items:
                next_flush = time.monotonic() + self.config.flush_interval_seconds
                continue

            try:
                if conn is None or conn.closed:
                    conn = psycopg.connect(self.dsn, connect_timeout=5)
                self._flush_transaction(
                    conn,
                    spool_telemetry + telemetry,
                    runtime_states,
                    spool_summaries + summaries,
                )
                if spool_items:
                    self._remove_spool_prefix(len(spool_items))
                self.total_written += len(spool_telemetry) + len(telemetry)
                self.last_error = ""
                self.last_flush_at = _utcnow()
                backoff = 1.0
            except Exception as exc:  # DB outage must not stop serial ingestion.
                self.last_error = str(exc)
                try:
                    if conn is not None:
                        conn.rollback()
                        conn.close()
                except Exception:
                    pass
                conn = None

                # Anything newly drained from RAM must be made durable.
                if telemetry:
                    self._append_spool(telemetry)
                if summaries:
                    self._append_spool({"_kind": "summary", "payload": s} for s in summaries)
                self._restore_runtime_states(runtime_states)
                time.sleep(backoff)
                backoff = min(self.config.reconnect_max_seconds, backoff * 2)
            finally:
                next_flush = time.monotonic() + self.config.flush_interval_seconds

        # Best-effort final flush at process shutdown.
        telemetry = self._drain_telemetry()
        summaries = self._drain_summaries()
        if telemetry:
            self._append_spool(telemetry)
        if summaries:
            self._append_spool({"_kind": "summary", "payload": s} for s in summaries)
        try:
            if conn is not None and not conn.closed:
                conn.close()
        except Exception:
            pass


class PostgresEnergyStore:
    """Drop-in storage layer matching the existing dashboard's JSON shapes."""

    def __init__(self, dsn: Optional[str] = None, batch_config: Optional[BatchConfig] = None):
        self.dsn = dsn or os.environ.get("DATABASE_URL", "")
        if not self.dsn:
            raise RuntimeError("DATABASE_URL is not set")

        self.lock = threading.RLock()
        self.live: Dict[str, dict] = {}
        self.cutoff_callback = None
        self.controls_cache: Dict[str, dict] = {}
        self.runtime_cache: Dict[str, dict] = {}

        # Raw telemetry retention:
        # All packets are still processed normally, but ac_energy_logs
        # receives only one raw snapshot per room every 120 seconds.
        self.telemetry_log_interval_sec = 120.0
        self._last_telemetry_log_at: Dict[str, float] = {}

        # PZEM cumulative-energy reset protection.
        # A single temporary zero/lower reading must not destroy the daily baseline.
        self.pzem_reset_confirm_packets = 3
        self._pzem_reset_candidates: Dict[str, dict] = {}

        self.writer = DatabaseBatchWriter(self.dsn, batch_config)
        self._load_caches()

    def _connect(self):
        return psycopg.connect(self.dsn, row_factory=dict_row, connect_timeout=5)

    def _load_caches(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT r.room_id, r.room_name, r.active,
                           COALESCE(c.daily_limit_kwh,0) AS daily_limit_kwh,
                           COALESCE(c.tariff_per_kwh,8.50) AS tariff_per_kwh,
                           COALESCE(c.cutoff_enabled,FALSE) AS cutoff_enabled,
                           COALESCE(c.relay_state,'ON') AS relay_state,
                           c.cutoff_time
                    FROM rooms r
                    LEFT JOIN room_controls c ON c.room_id=r.room_id
                """)
                for row in cur.fetchall():
                    self.controls_cache[row["room_id"].lower()] = dict(row)

                cur.execute("SELECT * FROM room_runtime_state")
                for row in cur.fetchall():
                    self.runtime_cache[row["room_id"].lower()] = dict(row)

    def _default_control(self, room_id: str, room_name: Optional[str] = None) -> dict:
        return {
            "room_id": room_id,
            "room_name": room_name or room_id.replace("_", " ").title(),
            "daily_limit_kwh": 0.0,
            "tariff_per_kwh": 8.50,
            "cutoff_enabled": False,
            "relay_state": "ON",
            "active": True,
            "cutoff_time": None,
        }

    def ensure_room(self, room_id: str, room_name: Optional[str] = None) -> dict:
        room_id = str(room_id).strip()
        key = room_id.lower()
        with self.lock:
            existing = self.controls_cache.get(key)
            if existing:
                return dict(existing)

        room_name = room_name or room_id.replace("_", " ").title()
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO rooms(room_id,room_name,active)
                       VALUES(%s,%s,TRUE)
                       ON CONFLICT(room_id) DO UPDATE SET
                           room_name=COALESCE(NULLIF(EXCLUDED.room_name,''),rooms.room_name),
                           updated_at=clock_timestamp()""",
                    (room_id, room_name),
                )
                cur.execute(
                    """INSERT INTO room_controls(room_id)
                       VALUES(%s) ON CONFLICT(room_id) DO NOTHING""",
                    (room_id,),
                )
            conn.commit()

        row = self._default_control(room_id, room_name)
        with self.lock:
            self.controls_cache[key] = row
        return dict(row)

    def controls(self) -> List[dict]:
        with self.lock:
            rows = []
            for row in self.controls_cache.values():
                rt = self.runtime_cache.get(row["room_id"].lower(), {})
                item = dict(row)
                item.update({
                    "day_start_meter_kwh": rt.get("day_start_meter_kwh") or 0.0,
                    "current_daily_kwh": rt.get("current_daily_kwh") or 0.0,
                    "last_reset_date": str(rt.get("state_date") or ""),
                    "last_meter_kwh": rt.get("last_meter_kwh"),
                    "last_update": rt.get("last_update").isoformat() if hasattr(rt.get("last_update"), "isoformat") else (rt.get("last_update") or ""),
                })
                if hasattr(item.get("cutoff_time"), "isoformat"):
                    item["cutoff_time"] = item["cutoff_time"].isoformat()
                rows.append(item)
            return sorted(rows, key=lambda x: x["room_id"])

    def history(self, limit: int = 5000) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT summary_date AS date, room_id, start_meter_kwh, end_meter_kwh,
                           daily_energy_kwh, daily_limit_kwh, limit_exceeded,
                           cutoff_triggered, cutoff_time, tariff_per_kwh, energy_charge_inr
                    FROM daily_room_summary
                    ORDER BY summary_date DESC, room_id
                    LIMIT %s
                    """,
                    (limit,),
                )
                rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["date"] = str(r.get("date") or "")
            if hasattr(r.get("cutoff_time"), "isoformat"):
                r["cutoff_time"] = r["cutoff_time"].isoformat()
        return rows

    def update_controls(self, updates: List[dict]) -> List[dict]:
        # Control edits are user-driven and infrequent, so a direct transaction is appropriate.
        # Telemetry never goes through this path.
        with self._connect() as conn:
            with conn.cursor() as cur:
                for item in updates:
                    room_id = str(item.get("room_id", "")).strip()
                    if not room_id:
                        continue
                    room_name = str(item.get("room_name") or room_id.replace("_", " ").title()).strip()
                    current = self.controls_cache.get(room_id.lower(), self._default_control(room_id, room_name))
                    limit = max(0.0, as_float(item.get("daily_limit_kwh"), as_float(current.get("daily_limit_kwh"), 0.0)) or 0.0)
                    tariff = max(0.0, as_float(item.get("tariff_per_kwh"), as_float(current.get("tariff_per_kwh"), 8.5)) or 0.0)
                    cutoff_enabled = bool(item.get("cutoff_enabled")) if item.get("cutoff_enabled") is not None else as_bool(current.get("cutoff_enabled"))
                    active = bool(item.get("active")) if item.get("active") is not None else as_bool(current.get("active", True))

                    cur.execute(
                        """INSERT INTO rooms(room_id,room_name,active)
                           VALUES(%s,%s,%s)
                           ON CONFLICT(room_id) DO UPDATE SET
                             room_name=EXCLUDED.room_name,
                             active=EXCLUDED.active,
                             updated_at=clock_timestamp()""",
                        (room_id, room_name, active),
                    )
                    cur.execute(
                        """INSERT INTO room_controls(room_id,daily_limit_kwh,tariff_per_kwh,cutoff_enabled)
                           VALUES(%s,%s,%s,%s)
                           ON CONFLICT(room_id) DO UPDATE SET
                             daily_limit_kwh=EXCLUDED.daily_limit_kwh,
                             tariff_per_kwh=EXCLUDED.tariff_per_kwh,
                             cutoff_enabled=EXCLUDED.cutoff_enabled,
                             updated_at=clock_timestamp()""",
                        (room_id, limit, tariff, cutoff_enabled),
                    )
            conn.commit()

        self._load_caches()
        return self.controls()

    def _make_runtime(self, room_id: str, packet: dict, control: dict) -> dict:
        key = room_id.lower()
        existing = dict(self.runtime_cache.get(key) or {})
        meter = packet.get("energy")
        if meter is None:
            meter = packet.get("energy_kwh")
        meter = as_float(meter, None)
        today = _local_today()
        now = _utcnow()

        state_date = existing.get("state_date")
        if isinstance(state_date, str) and state_date:
            try:
                state_date = date.fromisoformat(state_date)
            except ValueError:
                state_date = None

        if meter is not None:
            if state_date != today:
                # Previous day is finalized before starting the new baseline.
                if state_date is not None and existing.get("day_start_meter_kwh") is not None:
                    self._queue_previous_day_summary(existing, control)
                existing["state_date"] = today
                existing["day_start_meter_kwh"] = meter
                existing["current_daily_kwh"] = 0.0
                existing["last_meter_kwh"] = meter
                # Preserve original behavior: a new day clears automatic cutoff state.
                control["relay_state"] = "ON"
                control["cutoff_time"] = None
            else:
                start = as_float(existing.get("day_start_meter_kwh"), meter)
                if start is None:
                    start = meter

                if meter < start:
                    # Do not immediately treat one lower/zero packet as a real PZEM reset.
                    candidate = self._pzem_reset_candidates.get(key)

                    if candidate is None:
                        candidate = {
                            "count": 1,
                            "first_meter": meter,
                        }
                    else:
                        candidate["count"] = int(candidate.get("count", 0)) + 1
                        first_meter = as_float(candidate.get("first_meter"), None)
                        if first_meter is None or meter < first_meter:
                            candidate["first_meter"] = meter

                    self._pzem_reset_candidates[key] = candidate

                    if candidate["count"] >= self.pzem_reset_confirm_packets:
                        # Several consecutive lower readings confirm a real reset/replacement.
                        confirmed_start = as_float(candidate.get("first_meter"), None)
                        if confirmed_start is None:
                            confirmed_start = meter
                        start = confirmed_start
                        existing["day_start_meter_kwh"] = start
                        self._pzem_reset_candidates.pop(key, None)
                    else:
                        # Temporary bad packet: keep the last known-good cumulative meter.
                        last_good = as_float(existing.get("last_meter_kwh"), None)
                        if last_good is not None:
                            meter = last_good
                else:
                    # Normal reading again: cancel any pending reset candidate.
                    self._pzem_reset_candidates.pop(key, None)

                existing["current_daily_kwh"] = max(0.0, meter - start)
                existing["last_meter_kwh"] = meter

        existing.update({
            "room_id": room_id,
            "last_update": now,
            "node_mac": sanitize_mac(packet.get("node_mac") or packet.get("sender_mac") or packet.get("mac")),
            "voltage": as_float(packet.get("voltage"), None),
            "current_amp": as_float(packet.get("current"), None),
            "power_w": as_float(packet.get("power"), None),
            "frequency_hz": as_float(packet.get("frequency"), None),
            "power_factor": as_float(packet.get("pf", packet.get("power_factor")), None),
            "pzem_ok": packet.get("pzem_ok") is not False and packet.get("ok") not in {False, 0},
            "packet_count": int(as_float(packet.get("packet_count"), 0) or 0) or None,
        })
        return existing

    def _queue_previous_day_summary(self, runtime: dict, control: dict) -> None:
        prev_date = runtime.get("state_date")
        if not prev_date:
            return
        start = as_float(runtime.get("day_start_meter_kwh"), 0.0) or 0.0
        end = as_float(runtime.get("last_meter_kwh"), start) or start
        daily = max(0.0, end - start)
        limit = max(0.0, as_float(control.get("daily_limit_kwh"), 0.0) or 0.0)
        tariff = max(0.0, as_float(control.get("tariff_per_kwh"), 0.0) or 0.0)
        exceeded = limit > 0 and daily >= limit
        cutoff = str(control.get("relay_state", "ON")).upper() == "OFF" and as_bool(control.get("cutoff_enabled")) and exceeded
        self.writer.enqueue_summary({
            "summary_date": prev_date,
            "room_id": runtime.get("room_id"),
            "start_meter_kwh": start,
            "end_meter_kwh": end,
            "daily_energy_kwh": daily,
            "daily_limit_kwh": limit,
            "limit_exceeded": exceeded,
            "cutoff_triggered": cutoff,
            "cutoff_time": control.get("cutoff_time") if cutoff else None,
            "tariff_per_kwh": tariff,
            "energy_charge_inr": daily * tariff,
        })

    def process_reading(self, packet: dict) -> None:
        room_id = str(packet.get("room_id", "")).strip()
        if not room_id:
            return

        with self.lock:
            control = self.controls_cache.get(room_id.lower())
        if control is None:
            control = self.ensure_room(room_id)

        with self.lock:
            # Work on the cached control object so relay/day state remains coherent in RAM.
            control = self.controls_cache.setdefault(room_id.lower(), dict(control))
            runtime = self._make_runtime(room_id, packet, control)
            self.runtime_cache[room_id.lower()] = runtime

            now = runtime.get("last_update") or _utcnow()
            daily = as_float(runtime.get("current_daily_kwh"), 0.0) or 0.0
            tariff = as_float(control.get("tariff_per_kwh"), 0.0) or 0.0
            live_packet = dict(packet)
            live_packet["received_at"] = now.isoformat() if hasattr(now, "isoformat") else str(now)
            live_packet["daily_energy_kwh"] = daily
            live_packet["daily_limit_kwh"] = as_float(control.get("daily_limit_kwh"), 0.0) or 0.0
            live_packet["tariff_per_kwh"] = tariff
            live_packet["energy_charge_inr"] = daily * tariff
            live_packet["cutoff_enabled"] = as_bool(control.get("cutoff_enabled"))
            live_packet["relay_state"] = str(control.get("relay_state", "ON")).upper()
            self.live[room_id] = live_packet

            log_item = {
                "ingest_uuid": str(uuid.uuid4()),
                "room_id": room_id,
                "node_mac": runtime.get("node_mac") or None,
                "voltage": runtime.get("voltage"),
                "current_amp": runtime.get("current_amp"),
                "power_w": runtime.get("power_w"),
                "meter_energy_kwh": runtime.get("last_meter_kwh"),
                "daily_energy_kwh": daily,
                "frequency_hz": runtime.get("frequency_hz"),
                "power_factor": runtime.get("power_factor"),
                "pzem_ok": runtime.get("pzem_ok"),
                "relay_state": live_packet["relay_state"],
                "packet_count": runtime.get("packet_count"),
                "created_at": now,
            }

            runtime_to_persist = dict(runtime)

            # Only raw ac_energy_logs rows are rate-limited.
            # All calculations, live data and runtime state above continue
            # to run for every incoming packet.
            telemetry_key = room_id.lower()
            telemetry_now = time.monotonic()
            last_logged = self._last_telemetry_log_at.get(telemetry_key)

            if (
                last_logged is None
                or telemetry_now - last_logged >= self.telemetry_log_interval_sec
            ):
                self.writer.enqueue_telemetry(log_item)
                self._last_telemetry_log_at[telemetry_key] = telemetry_now

            self.writer.set_runtime_state(room_id, runtime_to_persist)

            limit = as_float(control.get("daily_limit_kwh"), 0.0) or 0.0
            should_cut = (
                as_bool(control.get("cutoff_enabled"))
                and limit > 0
                and daily >= limit
                and str(control.get("relay_state", "ON")).upper() != "OFF"
            )

        if should_cut and self.cutoff_callback:
            sent = bool(self.cutoff_callback(room_id, "OFF"))
            if sent:
                self.set_relay_state(room_id, "OFF")

    def set_relay_state(self, room_id: str, state: str) -> None:
        state = str(state).upper()
        if state not in {"ON", "OFF"}:
            raise ValueError("state must be ON or OFF")
        now = _utcnow()
        with self.lock:
            control = self.controls_cache.get(room_id.lower()) or self._default_control(room_id)
            control["relay_state"] = state
            control["cutoff_time"] = now if state == "OFF" else None
            self.controls_cache[room_id.lower()] = control
            if room_id in self.live:
                self.live[room_id]["relay_state"] = state

        # Relay commands are rare and operationally important: persist immediately.
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO rooms(room_id,room_name) VALUES(%s,%s)
                       ON CONFLICT(room_id) DO NOTHING""",
                    (room_id, control.get("room_name") or room_id),
                )
                cur.execute(
                    """INSERT INTO room_controls(room_id,relay_state,cutoff_time)
                       VALUES(%s,%s,%s)
                       ON CONFLICT(room_id) DO UPDATE SET
                         relay_state=EXCLUDED.relay_state,
                         cutoff_time=EXCLUDED.cutoff_time,
                         updated_at=clock_timestamp()""",
                    (room_id, state, control["cutoff_time"]),
                )
            conn.commit()

    def report(self, room_id: str = "", month: str = "") -> dict:
        clauses = []
        params: List[Any] = []
        if room_id:
            clauses.append("room_id = %s")
            params.append(room_id)
        if month:
            clauses.append("to_char(summary_date,'YYYY-MM') = %s")
            params.append(month)
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        sql = f"""
            SELECT summary_date AS date, room_id, start_meter_kwh, end_meter_kwh,
                   daily_energy_kwh, daily_limit_kwh, limit_exceeded,
                   cutoff_triggered, cutoff_time, tariff_per_kwh, energy_charge_inr
            FROM daily_room_summary
            {where}
            ORDER BY summary_date DESC, room_id
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = [dict(r) for r in cur.fetchall()]
        total_kwh = sum(float(r.get("daily_energy_kwh") or 0) for r in rows)
        total_charge = sum(float(r.get("energy_charge_inr") or 0) for r in rows)
        for r in rows:
            r["date"] = str(r["date"])
            if hasattr(r.get("cutoff_time"), "isoformat"):
                r["cutoff_time"] = r["cutoff_time"].isoformat()
        return {"rows": rows, "total_kwh": round(total_kwh, 3), "total_charge_inr": round(total_charge, 2)}

    def monthly_comparison(self) -> List[dict]:
        sql = """
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
                            THEN rs.current_daily_kwh * COALESCE(c.tariff_per_kwh,0)
                            ELSE 0 END AS cost
                FROM room_runtime_state rs
                LEFT JOIN room_controls c ON c.room_id=rs.room_id
            )
            SELECT r.room_id, r.room_name,
                   COALESCE(h.kwh,0)+COALESCE(t.kwh,0) AS month_kwh,
                   COALESCE(h.cost,0)+COALESCE(t.cost,0) AS month_cost_inr
            FROM rooms r
            LEFT JOIN closed_days h ON h.room_id=r.room_id
            LEFT JOIN today t ON t.room_id=r.room_id
            WHERE r.active=TRUE
            ORDER BY month_kwh DESC, r.room_id
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["month_kwh"] = float(r.get("month_kwh") or 0)
            r["month_cost_inr"] = float(r.get("month_cost_inr") or 0)
        return rows

    def consumption_ranking(self, start_date: str, end_date: str) -> List[dict]:
        sql = """
            WITH closed AS (
                SELECT room_id,
                       SUM(daily_energy_kwh) AS kwh,
                       SUM(energy_charge_inr) AS cost
                FROM daily_room_summary
                WHERE summary_date BETWEEN %s::date AND LEAST(%s::date, CURRENT_DATE - 1)
                GROUP BY room_id
            ), today AS (
                SELECT rs.room_id,
                       rs.current_daily_kwh AS kwh,
                       rs.current_daily_kwh * COALESCE(c.tariff_per_kwh,0) AS cost
                FROM room_runtime_state rs
                LEFT JOIN room_controls c ON c.room_id=rs.room_id
                WHERE CURRENT_DATE BETWEEN %s::date AND %s::date
                  AND rs.state_date=CURRENT_DATE
            )
            SELECT r.room_id, r.room_name,
                   COALESCE(c.kwh,0)+COALESCE(t.kwh,0) AS total_kwh,
                   COALESCE(c.cost,0)+COALESCE(t.cost,0) AS total_cost_inr
            FROM rooms r
            LEFT JOIN closed c ON c.room_id=r.room_id
            LEFT JOIN today t ON t.room_id=r.room_id
            WHERE r.active=TRUE
              AND COALESCE(c.kwh,0)+COALESCE(t.kwh,0) > 0
            ORDER BY total_kwh DESC, r.room_id
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (start_date, end_date, start_date, end_date))
                rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["total_kwh"] = float(r.get("total_kwh") or 0)
            r["total_cost_inr"] = float(r.get("total_cost_inr") or 0)
        return rows

    def close(self) -> None:
        self.writer.stop()
