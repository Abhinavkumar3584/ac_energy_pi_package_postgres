import re
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row


DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

EMPTY_WEEK = {
    day: {
        "enabled": False,
        "start": "",
        "end": "",
    }
    for day in DAYS
}


class AutomationManager:
    def __init__(self, database_url, store, hub):
        self.database_url = database_url
        self.store = store
        self.hub = hub

        self.stop_event = threading.Event()
        self.thread = None

        self.last_command = {}
        self.last_status = {}

        self.tz = ZoneInfo("Asia/Kolkata")

        self._ensure_schema()

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    def _connect(self):
        return psycopg.connect(
            self.database_url,
            row_factory=dict_row
        )

    def _ensure_schema(self):
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS room_automation (
                        room_id VARCHAR(64) PRIMARY KEY,

                        mode VARCHAR(16) NOT NULL DEFAULT 'manual',

                        schedule_enabled BOOLEAN
                            NOT NULL DEFAULT FALSE,

                        week JSONB
                            NOT NULL DEFAULT '{}'::jsonb,

                        last_decision VARCHAR(32),

                        last_reason TEXT,

                        last_action_at TIMESTAMPTZ,

                        updated_at TIMESTAMPTZ
                            NOT NULL DEFAULT clock_timestamp()
                    )
                """)

            conn.commit()

    # -----------------------------------------------------
    # CONFIG VALIDATION
    # -----------------------------------------------------

    def _valid_time(self, value):
        value = str(value or "").strip()

        if not re.fullmatch(r"\d{2}:\d{2}", value):
            return False

        try:
            h, m = [int(x) for x in value.split(":")]
            return 0 <= h <= 23 and 0 <= m <= 59
        except Exception:
            return False

    def _normalize_week(self, raw):
        raw = raw if isinstance(raw, dict) else {}

        result = {}

        for day in DAYS:
            item = raw.get(day)

            if not isinstance(item, dict):
                item = {}

            start = str(item.get("start", "")).strip()
            end = str(item.get("end", "")).strip()

            if start and not self._valid_time(start):
                start = ""

            if end and not self._valid_time(end):
                end = ""

            result[day] = {
                "enabled": bool(item.get("enabled", False)),
                "start": start,
                "end": end,
            }

        return result

    # -----------------------------------------------------
    # GET CONFIG
    # -----------------------------------------------------

    def list_all(self):
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        room_id,
                        mode,
                        schedule_enabled,
                        week,
                        last_decision,
                        last_reason,
                        last_action_at,
                        updated_at
                    FROM room_automation
                    ORDER BY room_id
                """)

                rows = cur.fetchall()

        result = []

        for row in rows:
            row = dict(row)

            row["week"] = self._normalize_week(
                row.get("week") or {}
            )

            for k in ["last_action_at", "updated_at"]:
                if row.get(k):
                    row[k] = row[k].isoformat()

            result.append(row)

        return result

    # -----------------------------------------------------
    # SAVE CONFIG
    # -----------------------------------------------------

    def save(self, data):
        room_id = str(data.get("room_id", "")).strip()

        if not room_id:
            raise ValueError("room_id is required")

        mode = str(
            data.get("mode", "manual")
        ).strip().lower()

        if mode not in {
            "manual",
            "schedule",
            "auto",
        }:
            raise ValueError(
                "mode must be manual, schedule or auto"
            )

        schedule_enabled = bool(
            data.get("schedule_enabled", False)
        )

        week = self._normalize_week(
            data.get("week") or {}
        )

        with self._connect() as conn:
            with conn.cursor() as cur:

                cur.execute("""
                    INSERT INTO room_automation(
                        room_id,
                        mode,
                        schedule_enabled,
                        week
                    )
                    VALUES(
                        %s,
                        %s,
                        %s,
                        %s::jsonb
                    )

                    ON CONFLICT(room_id)
                    DO UPDATE SET
                        mode = EXCLUDED.mode,
                        schedule_enabled =
                            EXCLUDED.schedule_enabled,
                        week = EXCLUDED.week,
                        updated_at =
                            clock_timestamp()

                    RETURNING room_id
                """, (
                    room_id,
                    mode,
                    schedule_enabled,
                    psycopg.types.json.Jsonb(week),
                ))

            conn.commit()

        return self.get(room_id)

    def get(self, room_id):
        room_id = str(room_id).strip()

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        room_id,
                        mode,
                        schedule_enabled,
                        week,
                        last_decision,
                        last_reason,
                        last_action_at,
                        updated_at
                    FROM room_automation
                    WHERE room_id=%s
                """, (room_id,))

                row = cur.fetchone()

        if not row:
            return None

        row = dict(row)

        row["week"] = self._normalize_week(
            row.get("week") or {}
        )

        for k in ["last_action_at", "updated_at"]:
            if row.get(k):
                row[k] = row[k].isoformat()

        return row

    # -----------------------------------------------------
    # SCHEDULE LOGIC
    # -----------------------------------------------------

    def _minutes(self, value):
        h, m = [int(x) for x in value.split(":")]
        return h * 60 + m

    def _valid_entry(self, item):
        return (
            isinstance(item, dict)
            and bool(item.get("enabled"))
            and self._valid_time(item.get("start"))
            and self._valid_time(item.get("end"))
            and item.get("start") != item.get("end")
        )

    def _has_valid_schedule(self, week):
        return any(
            self._valid_entry(week.get(day))
            for day in DAYS
        )

    def _schedule_state(self, week, now):
        """
        Returns:
            True  = schedule wants ON
            False = schedule wants OFF
            None  = no valid schedule configured
        """

        if not self._has_valid_schedule(week):
            return None, "No valid schedule time configured"

        now_minutes = now.hour * 60 + now.minute
        today_index = now.weekday()

        # ---------------------------------------------
        # Check overnight schedule from previous day.
        # Example:
        # Monday 22:00 -> 06:00
        # Tuesday 02:00 must still be ON.
        # ---------------------------------------------

        previous_index = (today_index - 1) % 7
        previous_day = DAYS[previous_index]
        previous = week.get(previous_day) or {}

        if self._valid_entry(previous):
            start = self._minutes(previous["start"])
            end = self._minutes(previous["end"])

            if start > end and now_minutes < end:
                return True, (
                    f"{previous_day.upper()} overnight "
                    f"{previous['start']}-{previous['end']}"
                )

        # ---------------------------------------------
        # Today's schedule
        # ---------------------------------------------

        day = DAYS[today_index]
        item = week.get(day) or {}

        if not self._valid_entry(item):
            return False, f"{day.upper()} schedule disabled"

        start = self._minutes(item["start"])
        end = self._minutes(item["end"])

        if start < end:
            active = start <= now_minutes < end
        else:
            # Overnight schedule.
            active = now_minutes >= start

        if active:
            return True, (
                f"{day.upper()} "
                f"{item['start']}-{item['end']}"
            )

        return False, (
            f"Outside {day.upper()} "
            f"{item['start']}-{item['end']}"
        )

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    def _set_status(
        self,
        room_id,
        decision,
        reason,
        action=False,
    ):
        key = (
            str(decision or ""),
            str(reason or ""),
        )

        if self.last_status.get(room_id) == key and not action:
            return

        self.last_status[room_id] = key

        with self._connect() as conn:
            with conn.cursor() as cur:

                if action:
                    cur.execute("""
                        UPDATE room_automation
                        SET
                            last_decision=%s,
                            last_reason=%s,
                            last_action_at=
                                clock_timestamp()
                        WHERE room_id=%s
                    """, (
                        decision,
                        reason,
                        room_id,
                    ))

                else:
                    cur.execute("""
                        UPDATE room_automation
                        SET
                            last_decision=%s,
                            last_reason=%s
                        WHERE room_id=%s
                    """, (
                        decision,
                        reason,
                        room_id,
                    ))

            conn.commit()

    # -----------------------------------------------------
    # RELAY COMMAND
    # -----------------------------------------------------

    def _send_if_needed(
        self,
        room_id,
        desired,
        live,
        reason,
    ):
        if desired not in {"ON", "OFF"}:
            return

        supported = bool(
            live.get("relay_supported") is True
            or
            live.get(
                "manual_control_supported"
            ) is True
        )

        if not supported:
            self._set_status(
                room_id,
                "WAITING",
                "Relay hardware not currently available",
            )
            return

        current = str(
            live.get("relay_state") or ""
        ).upper()

        if current == desired:
            self._set_status(
                room_id,
                desired,
                reason,
            )
            return

        now = time.monotonic()

        previous = self.last_command.get(room_id)

        # Prevent repeated command flooding while waiting
        # for telemetry/ACK.
        if previous:
            old_state, old_time = previous

            if (
                old_state == desired
                and now - old_time < 10
            ):
                return

        sent = self.hub.send_command(
            room_id,
            desired,
        )

        if sent:
            self.last_command[room_id] = (
                desired,
                now,
            )

            self._set_status(
                room_id,
                desired,
                reason,
                action=True,
            )

    # -----------------------------------------------------
    # MAIN AUTOMATION EVALUATION
    # -----------------------------------------------------

    def evaluate(self):
        configs = self.list_all()

        controls = {
            str(x.get("room_id", "")).lower():
                x
            for x in self.store.controls()
        }

        with self.store.lock:
            live_rooms = {
                str(k).lower(): dict(v)
                for k, v in self.store.live.items()
            }

        now = datetime.now(self.tz)

        for cfg in configs:

            room_id = str(cfg["room_id"])
            key = room_id.lower()

            mode = str(
                cfg.get("mode") or "manual"
            ).lower()

            if mode == "manual":
                self._set_status(
                    room_id,
                    "MANUAL",
                    "Direct user control",
                )
                continue

            live = live_rooms.get(key) or {}
            control = controls.get(key) or {}

            schedule_enabled = bool(
                cfg.get("schedule_enabled")
            )

            week = self._normalize_week(
                cfg.get("week") or {}
            )

            schedule_on = None
            schedule_reason = (
                "Schedule disabled"
            )

            if schedule_enabled:
                schedule_on, schedule_reason = (
                    self._schedule_state(
                        week,
                        now,
                    )
                )

            # ==========================================
            # SCHEDULE MODE
            # ==========================================

            if mode == "schedule":

                if not schedule_enabled:
                    self._set_status(
                        room_id,
                        "WAITING",
                        "Schedule mode selected but schedule disabled",
                    )
                    continue

                if schedule_on is None:
                    self._set_status(
                        room_id,
                        "WAITING",
                        schedule_reason,
                    )
                    continue

                desired = (
                    "ON"
                    if schedule_on
                    else "OFF"
                )

                self._send_if_needed(
                    room_id,
                    desired,
                    live,
                    "Schedule: " + schedule_reason,
                )

                continue

            # ==========================================
            # AUTO MODE
            #
            # Current AUTO rules:
            # 1. Daily cutoff has highest priority.
            # 2. Schedule controls ON/OFF.
            # 3. Occupancy will be added later.
            # ==========================================

            if mode == "auto":

                cutoff_enabled = (
                    str(
                        control.get(
                            "cutoff_enabled",
                            False,
                        )
                    ).lower()
                    == "true"
                    or
                    control.get(
                        "cutoff_enabled"
                    ) is True
                )

                try:
                    limit = float(
                        control.get(
                            "daily_limit_kwh"
                        ) or 0
                    )
                except Exception:
                    limit = 0

                try:
                    used = float(
                        control.get(
                            "current_daily_kwh"
                        ) or 0
                    )
                except Exception:
                    used = 0

                # Daily cutoff always overrides ON.
                if (
                    cutoff_enabled
                    and limit > 0
                    and used >= limit
                ):
                    self._send_if_needed(
                        room_id,
                        "OFF",
                        live,
                        (
                            "AUTO: daily limit reached "
                            f"({used:.3f}/{limit:.3f} kWh)"
                        ),
                    )
                    continue

                # No configured schedule = do not
                # unexpectedly switch equipment ON.
                if not schedule_enabled:
                    self._set_status(
                        room_id,
                        "WAITING",
                        "AUTO waiting: schedule disabled",
                    )
                    continue

                if schedule_on is None:
                    self._set_status(
                        room_id,
                        "WAITING",
                        "AUTO waiting: " + schedule_reason,
                    )
                    continue

                desired = (
                    "ON"
                    if schedule_on
                    else "OFF"
                )

                self._send_if_needed(
                    room_id,
                    desired,
                    live,
                    "AUTO schedule: " + schedule_reason,
                )

    # -----------------------------------------------------
    # BACKGROUND THREAD
    # -----------------------------------------------------

    def _loop(self):
        while not self.stop_event.is_set():

            try:
                self.evaluate()

            except Exception as e:
                print(
                    "[AUTOMATION ERROR]",
                    str(e),
                    flush=True,
                )

            self.stop_event.wait(5)

    def start(self):
        if (
            self.thread
            and self.thread.is_alive()
        ):
            return

        self.stop_event.clear()

        self.thread = threading.Thread(
            target=self._loop,
            daemon=True,
            name="RoomAutomation",
        )

        self.thread.start()

        print(
            "[AUTOMATION] Schedule/Auto engine started",
            flush=True,
        )
