#!/usr/bin/env python3
"""PostgreSQL version of the AC Energy Dashboard backend.

Serial parsing and command protocol are intentionally kept equivalent to the
existing app.py. Storage is moved from CSV files to PostgresEnergyStore.
"""

import csv
import io
import json
import os
import threading
import time

from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request
import serial
from serial.tools import list_ports

from db_store import BatchConfig, PostgresEnergyStore
from automation_engine import AutomationManager

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
TEMPLATE_DIR = FRONTEND_DIR / "templates" if (FRONTEND_DIR / "templates").exists() else BASE_DIR / "templates"
STATIC_DIR = FRONTEND_DIR / "static" if (FRONTEND_DIR / "static").exists() else BASE_DIR / "static"

app = Flask(__name__, template_folder=str(TEMPLATE_DIR), static_folder=str(STATIC_DIR))


# ===== SerialHub: parsing behavior preserved from the current project =====
class SerialHub:
    def __init__(self, store):
        self.store = store
        self.ser = None
        self.port = None
        self.baud = 115200
        self.thread = None
        self.stop_event = threading.Event()
        self.lock = threading.RLock()
        self.last_error = ""
        self.last_line = ""
        self.text_packet = None

    def ports(self):
        result = []
        for p in list_ports.comports():
            result.append({
                "device": p.device,
                "description": p.description or "",
                "manufacturer": p.manufacturer or "",
                "vid": p.vid,
                "pid": p.pid,
            })
        return result

    def _auto_port(self):
        ports = self.ports()
        if not ports:
            return None
        preferred = []
        for p in ports:
            text = (p["device"] + " " + p["description"] + " " + p["manufacturer"]).lower()
            if any(x in text for x in ["ttyusb", "ttyacm", "cp210", "ch340", "usb serial", "silicon labs"]):
                preferred.append(p)
        return (preferred or ports)[0]["device"]

    def connect(self, device=None, baud=115200):
        with self.lock:
            if self.ser and self.ser.is_open:
                return self.status()
            device = device or self._auto_port()
            if not device:
                raise RuntimeError("No serial port found. Connect the ESP32 USB cable to the Raspberry Pi.")
            self.baud = int(baud or 115200)
            self.ser = serial.Serial(device, self.baud, timeout=0.5, write_timeout=1)
            self.port = device
            self.last_error = ""
            self.stop_event.clear()
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            return self.status()

    def disconnect(self):
        self.stop_event.set()
        with self.lock:
            try:
                if self.ser and self.ser.is_open:
                    self.ser.close()
            finally:
                self.ser = None
                self.port = None
        return self.status()

    def status(self):
        connected = bool(self.ser and self.ser.is_open)
        return {
            "connected": connected,
            "port": self.port if connected else None,
            "baud": self.baud,
            "last_error": self.last_error,
            "last_line": self.last_line,
        }

    def send_command(self, room_id, state):
        state = str(state).upper()

        if state not in {"ON", "OFF"}:
            self.last_error = f"Invalid relay state: {state}"
            return False

        # ESP32 V3 command format:
        # RELAY|ROOM_105|ON
        # RELAY|ROOM_105|OFF
        command = f"RELAY|{room_id}|{state}\n"
        with self.lock:
            if not self.ser or not self.ser.is_open:
                self.last_error = f"Cutoff requested for {room_id}, but serial port is disconnected"
                return False
            self.ser.write(command.encode("utf-8"))
            self.ser.flush()
        return True

    def _read_loop(self):
        while not self.stop_event.is_set():
            try:
                with self.lock:
                    ser = self.ser
                if not ser or not ser.is_open:
                    break
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                self.last_line = line
                self._handle_line(line)
            except Exception as e:
                self.last_error = str(e)
                time.sleep(0.5)
        with self.lock:
            try:
                if self.ser and self.ser.is_open:
                    self.ser.close()
            except Exception:
                pass
            self.ser = None
            self.port = None

    @staticmethod
    def _number(value):
        import re
        m = re.search(r"[-+]?\d*\.?\d+", str(value))
        return float(m.group(0)) if m else None

    def _commit_text_packet(self):
        p = self.text_packet
        if not p or not p.get("room_id"):
            return
        if any(p.get(k) is not None for k in ["voltage", "current", "power", "energy", "frequency", "pf"]):
            self.store.process_reading(p)
        self.text_packet = None

    def _handle_line(self, line):

        # -------------------------------------------------
        # ESP32 relay command result
        # CONTROL_RESULT|ROOM_105|ON|SENT|1
        # CONTROL_RESULT|ROOM_105|OFF|ERROR|ROOM_OFFLINE
        # -------------------------------------------------
        if line.startswith("CONTROL_RESULT|"):
            parts = line.split("|", 4)

            if len(parts) >= 5:
                room_id = parts[1].strip()
                state = parts[2].strip().upper()
                result = parts[3].strip().upper()
                detail = parts[4].strip()

                with self.store.lock:
                    live = self.store.live.get(room_id)
                    if live is not None:
                        live["relay_supported"] = True
                        live["manual_control_supported"] = True

                        if result == "SENT":
                            live["command_status"] = f"SENT_WAITING_ACK #{detail}"
                        else:
                            live["command_status"] = f"ERROR: {detail}"

            return

        # -------------------------------------------------
        # ESP8266 actual relay acknowledgement
        # RELAY_ACK|ROOM_105|ON|OK|1
        # -------------------------------------------------
        if line.startswith("RELAY_ACK|"):
            parts = line.split("|", 4)

            if len(parts) >= 5:
                room_id = parts[1].strip()
                state = parts[2].strip().upper()
                result = parts[3].strip().upper()
                command_id = parts[4].strip()

                with self.store.lock:
                    live = self.store.live.get(room_id)
                    if live is not None:
                        live["relay_supported"] = True
                        live["manual_control_supported"] = True
                        live["relay_state"] = state
                        live["command_status"] = f"{result} #{command_id}"
                        live["ack_status"] = result
                        live["last_command_status"] = result

                if result == "OK":
                    try:
                        self.store.set_relay_state(room_id, state)
                    except Exception as e:
                        self.last_error = f"Relay ACK persistence failed: {e}"

            return

        if line.startswith("{") and line.endswith("}"):
            try:
                packet = json.loads(line)
                if packet.get("room_id") or packet.get("room"):
                    if not packet.get("room_id"):
                        packet["room_id"] = packet.get("room")
                    if "energy" not in packet and "energy_kwh" in packet:
                        packet["energy"] = packet.get("energy_kwh")
                    self.store.process_reading(packet)
                    return
            except json.JSONDecodeError:
                pass

        upper = line.upper()
        if "ESP-NOW" in upper and "ENERGY" in upper and "PACKET" in upper:
            self._commit_text_packet()
            self.text_packet = {"type": "energy", "pzem_ok": True}
            return
        if set(line) == {"="}:
            self._commit_text_packet()
            return
        if self.text_packet is None or ":" not in line:
            return
        key, value = [x.strip() for x in line.split(":", 1)]
        key = " ".join(key.lower().split())
        mapping = {
            "room id": "room_id",
            "node mac": "node_mac",
            "voltage": "voltage",
            "current": "current",
            "power": "power",
            "energy": "energy",
            "frequency": "frequency",
            "power factor": "pf",
        }
        if key == "pzem status":
            self.text_packet["pzem_ok"] = value.lower() in {"ok", "true", "1", "online"}

        elif key == "packet version":
            self.text_packet["packet_version"] = value

        elif key == "relay support":
            supported = value.strip().upper() in {"YES", "TRUE", "1", "SUPPORTED"}
            self.text_packet["relay_supported"] = supported
            self.text_packet["manual_control_supported"] = supported

        elif key == "relay state":
            relay = value.strip().upper()
            if relay in {"ON", "OFF"}:
                self.text_packet["relay_state"] = relay

        elif key in {"room id", "node mac"}:
            self.text_packet[mapping[key]] = value

        elif key in mapping:
            self.text_packet[mapping[key]] = self._number(value)

        elif key == "packet count":
            self.text_packet["packet_count"] = self._number(value)
            self._commit_text_packet()


DATABASE_URL = os.environ.get("DATABASE_URL", "")
BATCH_SECONDS = float(os.environ.get("AC_DB_FLUSH_SECONDS", "10"))
BATCH_SIZE = int(os.environ.get("AC_DB_BATCH_SIZE", "1000"))

store = PostgresEnergyStore(
    DATABASE_URL,
    BatchConfig(flush_interval_seconds=BATCH_SECONDS, batch_size=BATCH_SIZE),
)
hub = SerialHub(store)
store.cutoff_callback = hub.send_command

automation = AutomationManager(
    DATABASE_URL,
    store,
    hub,
)
automation.start()


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/ports")
def api_ports():
    return jsonify({"ports": hub.ports()})


@app.get("/api/status")
def api_status():
    return jsonify(hub.status())


@app.get("/api/db/health")
def api_db_health():
    return jsonify(store.writer.health())


@app.post("/api/connect")
def api_connect():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify({"ok": True, **hub.connect(data.get("port"), data.get("baud", 115200))})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.post("/api/disconnect")
def api_disconnect():
    return jsonify({"ok": True, **hub.disconnect()})


@app.get("/api/live")
def api_live():
    # Same fast design as the current app: live values come from RAM, not PostgreSQL.
    with store.lock:
        return jsonify({"rooms": store.live})


@app.route("/api/control", methods=["GET", "POST"])
def api_control():
    if request.method == "GET":
        rooms = store.controls()

        with store.lock:
            for control in rooms:
                room_id = str(control.get("room_id", ""))
                live = store.live.get(room_id) or {}

                supported = bool(
                    live.get("relay_supported") is True
                    or live.get("manual_control_supported") is True
                )

                control["manual_control_supported"] = supported
                control["relay_supported"] = supported

                relay_state = live.get("relay_state")
                if relay_state in {"ON", "OFF"}:
                    control["relay_state"] = relay_state

                if live.get("command_status"):
                    control["command_status"] = live.get("command_status")

                if live.get("ack_status"):
                    control["ack_status"] = live.get("ack_status")

        return jsonify({"rooms": rooms})
    data = request.get_json(silent=True) or {}
    rooms = data.get("rooms", [])
    if not isinstance(rooms, list):
        return jsonify({"ok": False, "error": "rooms must be a list"}), 400
    try:
        return jsonify({"ok": True, "rooms": store.update_controls(rooms)})
    except Exception as e:
        return jsonify({"ok": False, "error": f"Database control save failed: {e}"}), 503



@app.route("/api/automation", methods=["GET", "POST"])
def api_automation():

    if request.method == "GET":
        try:
            return jsonify({
                "rooms": automation.list_all()
            })
        except Exception as e:
            return jsonify({
                "rooms": [],
                "error": str(e)
            }), 503

    data = request.get_json(silent=True) or {}

    try:
        row = automation.save(data)

        return jsonify({
            "ok": True,
            "room": row
        })

    except ValueError as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 400

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 503


@app.get("/api/history")
def api_history():
    try:
        return jsonify({"rows": store.history()})
    except Exception as e:
        return jsonify({"rows": [], "error": str(e)}), 503


@app.get("/api/report")
def api_report():
    try:
        room_filter = request.args.get("room_id", "").strip()
        month_filter = request.args.get("month", "").strip()
        return jsonify(store.report(room_filter, month_filter))
    except Exception as e:
        return jsonify({"rows": [], "total_kwh": 0, "total_charge_inr": 0, "error": str(e)}), 503


@app.get("/api/analytics/monthly")
def api_analytics_monthly():
    try:
        return jsonify({"rows": store.monthly_comparison()})
    except Exception as e:
        return jsonify({"rows": [], "error": str(e)}), 503


@app.get("/api/analytics/ranking")
def api_analytics_ranking():
    start_date = request.args.get("from", "").strip()
    end_date = request.args.get("to", "").strip()
    if not start_date or not end_date:
        return jsonify({"rows": [], "error": "from and to dates are required (YYYY-MM-DD)"}), 400
    try:
        return jsonify({"rows": store.consumption_ranking(start_date, end_date)})
    except Exception as e:
        return jsonify({"rows": [], "error": str(e)}), 503


@app.post("/api/relay")
def api_relay():
    data = request.get_json(silent=True) or {}

    room_id = str(data.get("room_id", "")).strip()
    state = str(data.get("state", "")).upper()

    if not room_id or state not in {"ON", "OFF"}:
        return jsonify({
            "ok": False,
            "error": "room_id and state ON/OFF are required"
        }), 400

    # Safety: only a room that explicitly reports relay hardware
    # may receive a hardware command.
    with store.lock:
        live = store.live.get(room_id) or {}

        supported = bool(
            live.get("relay_supported") is True
            or live.get("manual_control_supported") is True
        )

    if not supported:
        return jsonify({
            "ok": False,
            "room_id": room_id,
            "error": "Relay hardware is not supported or room is not currently reporting capability"
        }), 409

    if not hub.send_command(room_id, state):
        return jsonify({
            "ok": False,
            "room_id": room_id,
            "error": "Serial port is not connected"
        }), 409

    # IMPORTANT:
    # Do NOT update relay_state here.
    # Actual state is updated only when RELAY_ACK comes back
    # from the ESP8266 through the ESP32.
    with store.lock:
        live = store.live.get(room_id)
        if live is not None:
            live["command_status"] = f"COMMAND_SENT_{state}"
            live["ack_status"] = "WAITING"

    return jsonify({
        "ok": True,
        "room_id": room_id,
        "requested_state": state,
        "status": "SENT_WAITING_ACK"
    })


def _csv_response(rows, fieldnames, filename):
    sio = io.StringIO()
    writer = csv.DictWriter(sio, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in fieldnames})
    return Response(
        sio.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/export/history.csv")
def export_history():
    fields = [
        "date", "room_id", "start_meter_kwh", "end_meter_kwh",
        "daily_energy_kwh", "daily_limit_kwh", "limit_exceeded",
        "cutoff_triggered", "cutoff_time", "tariff_per_kwh", "energy_charge_inr",
    ]
    return _csv_response(store.history(limit=100000), fields, "daily_energy_history.csv")


@app.get("/api/export/control.csv")
def export_control():
    fields = [
        "room_id", "room_name", "daily_limit_kwh", "tariff_per_kwh",
        "cutoff_enabled", "day_start_meter_kwh", "current_daily_kwh",
        "last_reset_date", "relay_state", "active", "last_meter_kwh",
        "last_update", "cutoff_time",
    ]
    return _csv_response(store.controls(), fields, "room_energy_control.csv")


if __name__ == "__main__":
    # use_reloader=False prevents Flask from opening the serial port twice.
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True, use_reloader=False)
