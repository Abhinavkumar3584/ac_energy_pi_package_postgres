#!/usr/bin/env python3
import csv
import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file
import serial
from serial.tools import list_ports

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CONTROL_CSV = DATA_DIR / "room_energy_control.csv"
HISTORY_CSV = DATA_DIR / "daily_energy_history.csv"

CONTROL_FIELDS = [
    "room_id", "room_name", "daily_limit_kwh", "tariff_per_kwh",
    "cutoff_enabled", "day_start_meter_kwh", "current_daily_kwh",
    "last_reset_date", "relay_state", "active", "last_meter_kwh", "last_update", "cutoff_time"
]
HISTORY_FIELDS = [
    "date", "room_id", "start_meter_kwh", "end_meter_kwh",
    "daily_energy_kwh", "daily_limit_kwh", "limit_exceeded",
    "cutoff_triggered", "cutoff_time", "tariff_per_kwh", "energy_charge_inr"
]

FRONTEND_DIR = BASE_DIR.parent / "frontend"
TEMPLATE_DIR = FRONTEND_DIR / "templates" if (FRONTEND_DIR / "templates").exists() else BASE_DIR / "templates"
STATIC_DIR = FRONTEND_DIR / "static" if (FRONTEND_DIR / "static").exists() else BASE_DIR / "static"

app = Flask(__name__, template_folder=str(TEMPLATE_DIR), static_folder=str(STATIC_DIR))


def as_bool(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def as_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class EnergyStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.live = {}
        self.cutoff_callback = None
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._ensure_files()

    def _ensure_files(self):
        if not CONTROL_CSV.exists():
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, [])
        else:
            rows = self._read_csv(CONTROL_CSV)
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
        if not HISTORY_CSV.exists():
            self._write_csv(HISTORY_CSV, HISTORY_FIELDS, [])

    def _read_csv(self, path):
        if not path.exists():
            return []
        with path.open("r", newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))

    def _write_csv(self, path, fields, rows):
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow({k: row.get(k, "") for k in fields})
        os.replace(tmp, path)

    def controls(self):
        with self.lock:
            return self._read_csv(CONTROL_CSV)

    def history(self):
        with self.lock:
            return self._read_csv(HISTORY_CSV)

    def _default_control(self, room_id, room_name=None):
        return {
            "room_id": room_id,
            "room_name": room_name or room_id.replace("_", " ").title(),
            "daily_limit_kwh": "0.000",
            "tariff_per_kwh": "8.50",
            "cutoff_enabled": "FALSE",
            "day_start_meter_kwh": "0.000",
            "current_daily_kwh": "0.000",
            "last_reset_date": "",
            "relay_state": "ON",
            "active": "TRUE",
            "last_meter_kwh": "",
            "last_update": "",
            "cutoff_time": "",
        }

    def ensure_room(self, room_id, room_name=None):
        room_id = str(room_id).strip()
        with self.lock:
            rows = self._read_csv(CONTROL_CSV)
            for row in rows:
                if row.get("room_id", "").strip().lower() == room_id.lower():
                    if room_name and not row.get("room_name"):
                        row["room_name"] = room_name
                        self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
                    return row
            row = self._default_control(room_id, room_name)
            rows.append(row)
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
            return row

    def update_controls(self, updates):
        with self.lock:
            rows = self._read_csv(CONTROL_CSV)
            by_id = {r.get("room_id", "").strip().lower(): r for r in rows}
            for item in updates:
                room_id = str(item.get("room_id", "")).strip()
                if not room_id:
                    continue
                key = room_id.lower()
                row = by_id.get(key)
                if row is None:
                    row = self._default_control(room_id, item.get("room_name"))
                    rows.append(row)
                    by_id[key] = row
                if item.get("room_name") is not None:
                    row["room_name"] = str(item["room_name"]).strip() or row["room_name"]
                if item.get("daily_limit_kwh") is not None:
                    row["daily_limit_kwh"] = f"{max(0.0, as_float(item['daily_limit_kwh'])):.3f}"
                if item.get("tariff_per_kwh") is not None:
                    row["tariff_per_kwh"] = f"{max(0.0, as_float(item['tariff_per_kwh'])):.2f}"
                if item.get("cutoff_enabled") is not None:
                    row["cutoff_enabled"] = "TRUE" if bool(item["cutoff_enabled"]) else "FALSE"
                if item.get("active") is not None:
                    row["active"] = "TRUE" if bool(item["active"]) else "FALSE"
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
            return rows

    def _append_history_once(self, record):
        rows = self._read_csv(HISTORY_CSV)
        for row in rows:
            if row.get("date") == record["date"] and row.get("room_id", "").lower() == record["room_id"].lower():
                row.update(record)
                self._write_csv(HISTORY_CSV, HISTORY_FIELDS, rows)
                return
        rows.append(record)
        self._write_csv(HISTORY_CSV, HISTORY_FIELDS, rows)

    def _roll_previous_day(self, row):
        prev_date = row.get("last_reset_date", "")
        if not prev_date:
            return
        start = as_float(row.get("day_start_meter_kwh"))
        end = as_float(row.get("last_meter_kwh"), start)
        daily = max(0.0, end - start)
        limit = max(0.0, as_float(row.get("daily_limit_kwh")))
        tariff = max(0.0, as_float(row.get("tariff_per_kwh")))
        exceeded = limit > 0 and daily >= limit
        cutoff = row.get("relay_state", "ON").upper() == "OFF" and as_bool(row.get("cutoff_enabled")) and exceeded
        record = {
            "date": prev_date,
            "room_id": row.get("room_id", ""),
            "start_meter_kwh": f"{start:.3f}",
            "end_meter_kwh": f"{end:.3f}",
            "daily_energy_kwh": f"{daily:.3f}",
            "daily_limit_kwh": f"{limit:.3f}",
            "limit_exceeded": "TRUE" if exceeded else "FALSE",
            "cutoff_triggered": "TRUE" if cutoff else "FALSE",
            "cutoff_time": row.get("cutoff_time", "") if cutoff else "",
            "tariff_per_kwh": f"{tariff:.2f}",
            "energy_charge_inr": f"{daily * tariff:.2f}",
        }
        self._append_history_once(record)

    def process_reading(self, packet):
        room_id = str(packet.get("room_id", "")).strip()
        if not room_id:
            return
        meter = packet.get("energy")
        if meter is None:
            meter = packet.get("energy_kwh")
        meter = as_float(meter, None)
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        now_iso = now.isoformat(timespec="seconds")

        with self.lock:
            rows = self._read_csv(CONTROL_CSV)
            row = next((r for r in rows if r.get("room_id", "").strip().lower() == room_id.lower()), None)
            if row is None:
                row = self._default_control(room_id)
                rows.append(row)

            if meter is not None:
                if row.get("last_reset_date") != today:
                    self._roll_previous_day(row)
                    row["day_start_meter_kwh"] = f"{meter:.3f}"
                    row["current_daily_kwh"] = "0.000"
                    row["last_reset_date"] = today
                    row["relay_state"] = "ON"
                    row["cutoff_time"] = ""
                else:
                    start = as_float(row.get("day_start_meter_kwh"), meter)
                    if meter < start:
                        # PZEM counter was manually reset/replaced. Start a new baseline safely.
                        start = meter
                        row["day_start_meter_kwh"] = f"{meter:.3f}"
                    row["current_daily_kwh"] = f"{max(0.0, meter - start):.3f}"
                row["last_meter_kwh"] = f"{meter:.3f}"

            row["last_update"] = now_iso
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)

            live_packet = dict(packet)
            live_packet["received_at"] = now_iso
            live_packet["daily_energy_kwh"] = as_float(row.get("current_daily_kwh"))
            live_packet["daily_limit_kwh"] = as_float(row.get("daily_limit_kwh"))
            live_packet["tariff_per_kwh"] = as_float(row.get("tariff_per_kwh"))
            live_packet["energy_charge_inr"] = live_packet["daily_energy_kwh"] * live_packet["tariff_per_kwh"]
            live_packet["cutoff_enabled"] = as_bool(row.get("cutoff_enabled"))
            live_packet["relay_state"] = row.get("relay_state", "ON")
            self.live[room_id] = live_packet

            limit = as_float(row.get("daily_limit_kwh"))
            daily = as_float(row.get("current_daily_kwh"))
            should_cut = (
                as_bool(row.get("cutoff_enabled"))
                and limit > 0
                and daily >= limit
                and row.get("relay_state", "ON").upper() != "OFF"
            )

        if should_cut and self.cutoff_callback:
            sent = bool(self.cutoff_callback(room_id, "OFF"))
            if sent:
                with self.lock:
                    rows = self._read_csv(CONTROL_CSV)
                    row = next((r for r in rows if r.get("room_id", "").strip().lower() == room_id.lower()), None)
                    if row is not None:
                        row["relay_state"] = "OFF"
                        row["cutoff_time"] = now_iso
                        self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
                        if room_id in self.live:
                            self.live[room_id]["relay_state"] = "OFF"

    def set_relay_state(self, room_id, state):
        state = str(state).upper()
        if state not in {"ON", "OFF"}:
            raise ValueError("state must be ON or OFF")
        with self.lock:
            rows = self._read_csv(CONTROL_CSV)
            row = next((r for r in rows if r.get("room_id", "").strip().lower() == room_id.lower()), None)
            if row is None:
                row = self._default_control(room_id)
                rows.append(row)
            row["relay_state"] = state
            row["last_update"] = datetime.now().isoformat(timespec="seconds")
            row["cutoff_time"] = row["last_update"] if state == "OFF" else ""
            self._write_csv(CONTROL_CSV, CONTROL_FIELDS, rows)
            if room_id in self.live:
                self.live[room_id]["relay_state"] = state


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
        # ESP32 firmware should parse: OFF,ROOM_101 or ON,ROOM_101
        command = f"{state},{room_id}\n"
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
        elif key in {"room id", "node mac"}:
            self.text_packet[mapping[key]] = value
        elif key in mapping:
            self.text_packet[mapping[key]] = self._number(value)
        elif key == "packet count":
            self.text_packet["packet_count"] = self._number(value)
            self._commit_text_packet()


store = EnergyStore()
hub = SerialHub(store)
store.cutoff_callback = hub.send_command


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/ports")
def api_ports():
    return jsonify({"ports": hub.ports()})


@app.get("/api/status")
def api_status():
    return jsonify(hub.status())


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
    with store.lock:
        return jsonify({"rooms": store.live})


@app.route("/api/control", methods=["GET", "POST"])
def api_control():
    if request.method == "GET":
        return jsonify({"rooms": store.controls()})
    data = request.get_json(silent=True) or {}
    rooms = data.get("rooms", [])
    if not isinstance(rooms, list):
        return jsonify({"ok": False, "error": "rooms must be a list"}), 400
    return jsonify({"ok": True, "rooms": store.update_controls(rooms)})


@app.get("/api/history")
def api_history():
    rows = store.history()
    rows.sort(key=lambda r: (r.get("date", ""), r.get("room_id", "")), reverse=True)
    return jsonify({"rows": rows})


@app.get("/api/report")
def api_report():
    rows = store.history()
    room_filter = request.args.get("room_id", "").strip().lower()
    month_filter = request.args.get("month", "").strip()
    selected = []
    for r in rows:
        if room_filter and r.get("room_id", "").lower() != room_filter:
            continue
        if month_filter and not r.get("date", "").startswith(month_filter):
            continue
        selected.append(r)
    total_kwh = sum(as_float(r.get("daily_energy_kwh")) for r in selected)
    total_charge = sum(as_float(r.get("energy_charge_inr")) for r in selected)
    return jsonify({
        "rows": selected,
        "total_kwh": round(total_kwh, 3),
        "total_charge_inr": round(total_charge, 2),
    })


@app.post("/api/relay")
def api_relay():
    data = request.get_json(silent=True) or {}
    room_id = str(data.get("room_id", "")).strip()
    state = str(data.get("state", "")).upper()
    if not room_id or state not in {"ON", "OFF"}:
        return jsonify({"ok": False, "error": "room_id and state ON/OFF are required"}), 400
    if not hub.send_command(room_id, state):
        return jsonify({"ok": False, "error": "Serial port is not connected"}), 409
    store.set_relay_state(room_id, state)
    return jsonify({"ok": True, "room_id": room_id, "state": state})


@app.get("/api/export/history.csv")
def export_history():
    return send_file(HISTORY_CSV, as_attachment=True, download_name="daily_energy_history.csv", mimetype="text/csv")


@app.get("/api/export/control.csv")
def export_control():
    return send_file(CONTROL_CSV, as_attachment=True, download_name="room_energy_control.csv", mimetype="text/csv")


if __name__ == "__main__":
    # use_reloader=False prevents Flask from opening the serial port twice.
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True, use_reloader=False)
