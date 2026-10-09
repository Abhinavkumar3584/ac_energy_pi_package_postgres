# AC Energy Management System

A comprehensive, real-time energy monitoring and automation dashboard designed for Raspberry Pi. This system communicates with ESP32 microcontrollers to track AC energy metrics (Voltage, Current, Power, Energy, Power Factor, Frequency) across multiple rooms, providing live dashboards, analytics, reports, and intelligent automation.

---

## 🌟 Key Features

- **Real-Time Monitoring**: Sub-second live data processing directly from ESP32 nodes via serial connection.
- **Interactive UI**: A highly responsive, modern, dark/light mode toggleable interface built with Vanilla JS, HTML, and CSS.
- **In-Depth Analytics**: Visual representations of daily patterns, weekly usage, and monthly consumption trends with cost estimation.
- **Smart Automation**: Define custom weekly schedules and threshold-based rules to automatically cut power to specific rooms.
- **High-Performance Database**: Migrated from flat CSV files to PostgreSQL for fast querying, reliable persistence, and minimal I/O blocking.
- **Hardware Integration**: Custom serial parsing for JSON and ESP-NOW string packets, capable of issuing ON/OFF commands to relays.

---

## 📁 Project Structure

Below is the directory structure highlighting the essential files that power the platform:

```text
ac_energy_pi_package_postgres/
├── app_postgres.py               # Main Flask application and server entrypoint (PostgreSQL version)
├── app.py                        # Legacy Flask application (CSV-based)
├── db_store.py                   # PostgreSQL connection pool, batch writer, and queue logic
├── automation_engine.py          # Handles automation rules (daily limits, time schedules)
├── migrate_csv_to_postgres.py    # Utility script to migrate legacy CSV data to PostgreSQL
├── requirements_postgres.txt     # Python dependencies for the PostgreSQL version
├── install_postgres_pi.sh        # Setup script for installing PostgreSQL on Raspberry Pi
├── ac-energy-db-maintenance.sh   # Bash script for database maintenance (purging old data)
├── ac-energy-postgres.service.example # Systemd service template for auto-start
├── data/
│   ├── daily_energy_history.csv  # Legacy daily metrics storage
│   └── room_energy_control.csv   # Legacy room config and controls storage
├── database/
│   ├── schema.sql                # PostgreSQL table and index creation schemas
│   ├── queries.sql               # Live dashboard and analytics queries
│   └── maintenance.sql           # Aggregation and purging functions
├── templates/
│   └── index.html                # Frontend User Interface (HTML, CSS, JS monolith)
└── static/                       # Contains branding and logo assets
```

---

## 🏛️ System Architecture

The architecture is designed to handle high-frequency telemetry without blocking the user interface. Live metrics are kept in memory for instantaneous dashboard updates, while historical data is batch-written to PostgreSQL.

```mermaid
flowchart TD
    subgraph Hardware Layer
        E1[ESP-NOW Nodes / Smart Meters] -->|Wireless| E2[ESP32 Gateway]
        E2 <-->|USB Serial| RPI[Raspberry Pi]
    end

    subgraph Backend Services
        RPI -->|Serial Stream| P_APP(Flask Backend: app_postgres.py)
        P_APP -->|Parse Telemetry| RAM[(In-Memory Cache)]
        P_APP -->|Queue Packets| BATCH(Batch DB Writer)
        P_APP <-->|Evaluate Rules| AUTO(Automation Engine)
        AUTO -->|ON/OFF Commands| RPI
    end
    
    subgraph Database Layer
        BATCH -->|Write every 10s| DB[(PostgreSQL)]
        DB -->|Daily Rollover| CRON[Maintenance Script]
    end
    
    subgraph Frontend / UI
        RAM -->|/api/live| UI[Web Dashboard]
        DB -->|/api/history| UI
        UI -->|Manual Override| P_APP
    end
```

### Data Flow Workflow

1. **Telemetry Ingestion**: The ESP32 Gateway receives data from individual room nodes and sends it via USB Serial to the Raspberry Pi.
2. **Live Cache**: The Python backend reads the serial stream, updating a lightweight in-memory dictionary. The `/api/live` endpoint fetches this dictionary instantly.
3. **Database Spooling**: Telemetry packets are placed in a non-blocking queue. Every 10 seconds (or 1000 packets), the batch writer flushes this queue to PostgreSQL.
4. **Automation**: The `automation_engine.py` evaluates the current power consumption against user-defined limits and weekly schedules, issuing commands back through the serial interface.

---

## 📊 Serial Data & Automation Protocol

### Input Format
The server accepts either legacy labelled ESP-NOW text packet formats or JSON lines from the ESP32 gateway. For example:

```json
{"type":"energy","room_id":"ROOM_101","node_mac":"98:F4:AB:F5:9A:1C","voltage":242.5,"current":0.444,"power":107.7,"energy":0.638,"frequency":49.9,"pf":1.0,"pzem_ok":true}
```

### Automatic & Manual Control Commands
When a configured daily limit is reached (or when a user manually toggles a room), the backend sends a command back to the ESP32:

- **Turn OFF**: `OFF,ROOM_101`
- **Turn ON**: `ON,ROOM_101`

> [!IMPORTANT]
> The ESP32 firmware **must be programmed** to receive these serial commands and forward the ON/OFF command to the correct ESP8266 node. The Pi dashboard/backend cannot physically switch the AC unless that command handling exists in the ESP32/ESP8266 firmware.

### Daily Energy Logic
The PZEM total energy counter does not have to be physically reset every day. The server manages a daily starting meter baseline value to calculate today's consumption dynamically:

```text
current_daily_kwh = current_PZEM_energy - day_start_meter_kwh
```
At the first packet of a new day, the previous day's data is safely aggregated/rolled over and a new baseline is started.

---

## 🛠️ Installation on Raspberry Pi

### Prerequisites
- Raspberry Pi (Running Raspberry Pi OS)
- Python 3
- PostgreSQL

### 1. Project Setup
Clone or copy the `ac_energy_pi_package_postgres` directory to your Raspberry Pi.

```bash
cd ~/ac_energy_pi_package_postgres
python3 -m venv venv
source venv/bin/activate
```

### 2. Database Installation
The system requires PostgreSQL. You can use the provided helper script:

```bash
export DB_PASSWORD='USE_A_STRONG_PASSWORD'
./install_postgres_pi.sh
```

*(Alternatively, you can manually configure PostgreSQL and execute `database/schema.sql` and `database/maintenance.sql`).*

### 3. Install Dependencies
Depending on your Pi architecture, you may need to install the `psycopg` binary dependencies:

```bash
sudo apt install -y libpq-dev python3-dev build-essential
pip install -r requirements_postgres.txt
```

### 4. Hardware Connection
Connect the ESP32 Gateway via USB. Check that it is recognized:

```bash
ls /dev/ttyUSB* /dev/ttyACM*
```
*Note: Ensure your user is in the `dialout` group to access the serial port (`sudo usermod -aG dialout $USER`).*

### 5. Running the System
Start the modern PostgreSQL-backed server:

```bash
export DATABASE_URL='postgresql://ac_energy:YOUR_PASSWORD@127.0.0.1:5432/ac_energy'
python3 app_postgres.py
```

Access the dashboard from any device on your local network:
`http://<PI_IP_ADDRESS>:5000`

---

## ⚙️ Maintenance & System Services

### Automated Data Aggregation
To prevent the raw logs table (`ac_energy_logs`) from growing infinitely, a maintenance script aggregates daily summaries and purges logs older than 30 days.

Add this to your crontab (`crontab -e`):
```cron
15 0 * * * DATABASE_URL='postgresql://ac_energy:YOUR_PASSWORD@127.0.0.1:5432/ac_energy' /path/to/ac-energy-db-maintenance.sh >> /var/log/ac-energy-db-maintenance.log 2>&1
```

### Systemd Service (Optional)
To keep the dashboard running automatically on boot, configure the provided `ac-energy-postgres.service.example` file and copy it to `/etc/systemd/system/`.

---

## 📖 Usage Guide

- **Dashboard**: The main screen provides a grid of real-time gauges showing exact Wattage and Voltage for every connected room.
- **Analytics**: Toggle between `Energy` and `Cost` metrics to see hourly patterns and monthly trends. The cost calculation relies on the custom Tariff set in settings.
- **Automation**: Use the Automation tab to set strict limits. If a room exceeds its daily kWh quota, or if it runs outside of its scheduled timeframe, the Pi will command the ESP32 to disconnect its relay.
- **Reports**: Generate CSV and PDF reports for historical billing and analysis.
