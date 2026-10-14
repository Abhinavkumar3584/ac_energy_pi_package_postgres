# AC Energy Management System — Frontend

A comprehensive, real-time energy monitoring, telemetry, and automation dashboard designed for the AC Energy Management platform.

---

## 🌟 Key Features

- **Real-Time Telemetry Dashboard**: Live monitoring of AC electrical metrics (Voltage, Current, Power, Energy, Power Factor, Frequency) across rooms and circuits.
- **Standalone Dynamic Simulation**: Built-in realistic live telemetry fluctuation loop and serial console stream without requiring an external backend server.
- **Energy & Cost Analytics**: Interactive visualizations showing hourly usage patterns, daily breakdown, cost estimation (₹ INR), and monthly consumption trends.
- **Automation Control**: Smart rule management for scheduled operational hours and daily kWh threshold cutoffs.
- **Reports & Exporting**: Instant CSV export and formatted PDF printable reports for historical records.
- **Hardware Gateway Management**: Interactive serial port selection (COM3, COM4, /dev/ttyUSB0, etc.) with baud rate control and connection status monitoring.
- **Dark / Light Mode**: Cinematic day and night themes with custom accent color theming support.

---

## 📁 Project Structure

```text
ac_energy_pi_package_postgres/
├── frontend/
│   ├── public/              # Static branding and background assets
│   ├── src/
│   │   ├── components/      # Modular UI components & dialogs
│   │   │   ├── views/       # Tab views (Dashboard, Rooms, Analytics, Automation, Reports, Live, Devices, Settings)
│   │   │   ├── TopNavbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── RoomCard.jsx
│   │   │   ├── RoomDetailModal.jsx
│   │   │   ├── ConnectPortModal.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AppContext.jsx # Core application state, telemetry simulation, & controls
│   │   ├── App.jsx          # Main application layout
│   │   ├── index.css        # Tailwind styling & glassmorphism system
│   │   └── main.jsx         # Vite entrypoint
│   ├── index.html           # HTML template
│   ├── package.json         # NPM scripts and dependencies
│   ├── tailwind.config.js   # Tailwind design tokens
│   └── vite.config.js       # Vite configuration
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
```
The optimized static build will be generated in `frontend/dist/`.
