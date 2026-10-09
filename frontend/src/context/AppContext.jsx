import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

// Initial Default Rooms
const DEFAULT_ROOMS = [
  {
    room_id: 'ROOM_101',
    room_name: 'Conference Hall A',
    current_daily_kwh: '42.850',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '60.000',
    relay_state: 'ON',
    max_power: 3500,
    dashboard: true,
    manual_control_supported: true,
  },
  {
    room_id: 'ROOM_102',
    room_name: 'Executive Boardroom',
    current_daily_kwh: '28.120',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '50.000',
    relay_state: 'ON',
    max_power: 3000,
    dashboard: true,
    manual_control_supported: true,
  },
  {
    room_id: 'ROOM_103',
    room_name: 'Server Room Main',
    current_daily_kwh: '78.430',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '100.000',
    relay_state: 'ON',
    max_power: 4500,
    dashboard: true,
    manual_control_supported: true,
  },
  {
    room_id: 'ROOM_104',
    room_name: 'Engineering Lab 1',
    current_daily_kwh: '34.900',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '50.000',
    relay_state: 'ON',
    max_power: 2800,
    dashboard: true,
    manual_control_supported: true,
  },
  {
    room_id: 'ROOM_105',
    room_name: 'Design Studio',
    current_daily_kwh: '19.450',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '40.000',
    relay_state: 'STANDBY',
    max_power: 2500,
    dashboard: true,
    manual_control_supported: true,
  },
  {
    room_id: 'ROOM_106',
    room_name: 'Cafeteria & Lounge',
    current_daily_kwh: '52.300',
    tariff_per_kwh: '8.50',
    daily_limit_kwh: '75.000',
    relay_state: 'ON',
    max_power: 4000,
    dashboard: true,
    manual_control_supported: true,
  },
];

// Initial Live Packet Readings
const DEFAULT_LIVE = {
  ROOM_101: {
    room_id: 'ROOM_101',
    node_mac: '98:F4:AB:F5:9A:1C',
    voltage: 238.4,
    current: 4.82,
    power: 1148.5,
    energy: 142.638,
    daily_energy_kwh: 42.850,
    frequency: 50.0,
    pf: 0.98,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
  ROOM_102: {
    room_id: 'ROOM_102',
    node_mac: '98:F4:AB:E2:11:4A',
    voltage: 239.1,
    current: 2.95,
    power: 702.4,
    energy: 98.412,
    daily_energy_kwh: 28.120,
    frequency: 49.9,
    pf: 0.96,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
  ROOM_103: {
    room_id: 'ROOM_103',
    node_mac: '98:F4:AB:C3:88:9F',
    voltage: 237.8,
    current: 8.65,
    power: 2056.2,
    energy: 312.890,
    daily_energy_kwh: 78.430,
    frequency: 50.1,
    pf: 0.99,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
  ROOM_104: {
    room_id: 'ROOM_104',
    node_mac: '98:F4:AB:D9:42:01',
    voltage: 240.2,
    current: 3.48,
    power: 832.0,
    energy: 115.340,
    daily_energy_kwh: 34.900,
    frequency: 50.0,
    pf: 0.97,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
  ROOM_105: {
    room_id: 'ROOM_105',
    node_mac: '98:F4:AB:AA:56:7E',
    voltage: 239.5,
    current: 0.35,
    power: 42.1,
    energy: 64.120,
    daily_energy_kwh: 19.450,
    frequency: 50.0,
    pf: 0.85,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
  ROOM_106: {
    room_id: 'ROOM_106',
    node_mac: '98:F4:AB:FF:02:99',
    voltage: 238.9,
    current: 5.62,
    power: 1341.8,
    energy: 184.750,
    daily_energy_kwh: 52.300,
    frequency: 49.9,
    pf: 0.98,
    pzem_ok: true,
    received_at: new Date().toISOString(),
  },
};

// Initial Alerts
const DEFAULT_ALERTS = [
  {
    id: 1,
    room: 'Server Room Main',
    roomId: 'ROOM_103',
    title: 'High Load Nearing Daily Threshold',
    desc: 'Consumption has reached 78.4 kWh of 100.0 kWh daily limit (78.4%).',
    severity: 'warn',
    time: '10 mins ago',
  },
  {
    id: 2,
    room: 'Design Studio',
    roomId: 'ROOM_105',
    title: 'Standby Low Power Factor',
    desc: 'Power factor is 0.85 with low current draw (0.35A). Sensor reporting healthy.',
    severity: 'info',
    time: '25 mins ago',
  },
  {
    id: 3,
    room: 'System Gateway',
    roomId: 'HUB',
    title: 'PostgreSQL Batch Write Flushed',
    desc: '1,420 raw energy telemetry packets successfully committed to postgres.',
    severity: 'ok',
    time: '45 mins ago',
  },
];

// Initial Activity Feed
const DEFAULT_ACTIVITY = [
  {
    id: 'act-1',
    kind: 'ok',
    title: 'PZEM Telemetry Synced',
    desc: 'ROOM_103 power draw steady at 2,056 W, Voltage 237.8 V',
    time: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'act-2',
    kind: 'ok',
    title: 'Automatic Limit Check Passed',
    desc: 'All 6 configured rooms operating within daily limit ceilings',
    time: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
  {
    id: 'act-3',
    kind: 'warn',
    title: 'After-Hours Energy Draw',
    desc: 'ROOM_101 active draw detected outside scheduled working hours',
    time: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'act-4',
    kind: 'system',
    title: 'PostgreSQL Batch Writer Spooled',
    desc: 'Spool flushed: 0 packet drop, 100% database write fidelity',
    time: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'act-5',
    kind: 'ok',
    title: 'ESP-NOW Mesh Gateway Connected',
    desc: 'Gateway /dev/ttyUSB0 (COM3) operational at 115,200 baud',
    time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

// Initial Daily History Records
const generateDefaultHistory = () => {
  const records = [];
  const rooms = DEFAULT_ROOMS;
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    rooms.forEach((r) => {
      const baseEnergy = 20 + Math.sin(i + parseInt(r.room_id.slice(-2))) * 12 + 10;
      const dailyKwh = Math.max(8.5, baseEnergy).toFixed(3);
      const startMeter = (100 + i * 25).toFixed(3);
      const endMeter = (parseFloat(startMeter) + parseFloat(dailyKwh)).toFixed(3);
      const limit = parseFloat(r.daily_limit_kwh) || 50;
      const exceeded = parseFloat(dailyKwh) > limit;
      records.push({
        date: dateStr,
        room_id: r.room_id,
        room_name: r.room_name,
        start_meter_kwh: startMeter,
        end_meter_kwh: endMeter,
        daily_energy_kwh: dailyKwh,
        daily_limit_kwh: limit.toFixed(3),
        limit_exceeded: exceeded ? 'true' : 'false',
        cutoff_triggered: exceeded ? 'true' : 'false',
        cutoff_time: exceeded ? `${dateStr} 18:42:10` : '',
        tariff_per_kwh: '8.50',
        energy_charge_inr: (parseFloat(dailyKwh) * 8.5).toFixed(2),
        voltage: '239.4',
        current: '4.2',
        power: '985.0',
        frequency: '50.0',
        pf: '0.98',
        pzem_ok: true,
        node_mac: DEFAULT_LIVE[r.room_id]?.node_mac || '98:F4:AB:F5:9A:1C',
        received_at: `${dateStr}T23:59:00`,
      });
    });
  }
  return records;
};

// Initial Automation Rules
const DEFAULT_AUTOMATION = DEFAULT_ROOMS.map((r) => ({
  room_id: r.room_id,
  room_name: r.room_name,
  mode: r.room_id === 'ROOM_103' ? 'manual' : 'schedule',
  schedule_enabled: r.room_id !== 'ROOM_103',
  occupancy_enabled: true,
  schedule_start: '09:00',
  schedule_end: '19:00',
  occupancy_timeout_min: 20,
  occupancy_state: r.room_id === 'ROOM_105' ? 'EMPTY' : 'MOTION',
  command_status: 'SUCCESS',
  week: {
    mon: { enabled: true, start: '09:00', end: '19:00' },
    tue: { enabled: true, start: '09:00', end: '19:00' },
    wed: { enabled: true, start: '09:00', end: '19:00' },
    thu: { enabled: true, start: '09:00', end: '19:00' },
    fri: { enabled: true, start: '09:00', end: '19:00' },
    sat: { enabled: false, start: '10:00', end: '16:00' },
    sun: { enabled: false, start: '10:00', end: '16:00' },
  },
}));

export function applyThemeAccent(accentHex) {
  if (!accentHex) return;
  let r = 79, g = 70, b = 229;
  if (accentHex.startsWith('#') && accentHex.length >= 7) {
    r = parseInt(accentHex.slice(1, 3), 16) || 79;
    g = parseInt(accentHex.slice(3, 5), 16) || 70;
    b = parseInt(accentHex.slice(5, 7), 16) || 229;
  }
  const hoverR = Math.max(0, Math.floor(r * 0.85));
  const hoverG = Math.max(0, Math.floor(g * 0.85));
  const hoverB = Math.max(0, Math.floor(b * 0.85));
  const hoverHex = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;

  const root = document.documentElement;
  root.style.setProperty('--app-accent', accentHex);
  root.style.setProperty('--app-accent-hover', hoverHex);
  root.style.setProperty('--app-accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--app-accent-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--app-accent-subtle', `rgba(${r}, ${g}, ${b}, 0.06)`);
  root.style.setProperty('--app-accent-border', `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.style.setProperty('--app-accent-ring', `rgba(${r}, ${g}, ${b}, 0.25)`);
}

export function AppProvider({ children }) {
  // Theme State: 'light' | 'dark' (defaults to saved or light)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ac_energy_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ac_energy_theme', theme);
    } catch (e) {
      console.warn(e);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Core Data States
  const [roomsData, setRoomsData] = useState(DEFAULT_ROOMS);
  const [liveData, setLiveData] = useState(DEFAULT_LIVE);
  const [hubStatus, setHubStatus] = useState({
    connected: true,
    port: 'COM3',
    baud: 115200,
    ports: [{ device: 'COM3', description: 'Silicon Labs CP210x USB to UART Bridge' }],
  });
  const [historyData, setHistoryData] = useState(generateDefaultHistory());
  const [activityLogs, setActivityLogs] = useState(DEFAULT_ACTIVITY);
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
  const [automationRules, setAutomationRules] = useState(DEFAULT_AUTOMATION);

  // Site Profile & Working Hours
  const [siteProfile, setSiteProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('ac_energy_site_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      type: 'office',
      name: 'Main Corporate Office',
      after_hours: 'warning',
      gauge_basis: 'hours',
      week: {
        mon: { enabled: true, start: '09:00', end: '19:00' },
        tue: { enabled: true, start: '09:00', end: '19:00' },
        wed: { enabled: true, start: '09:00', end: '19:00' },
        thu: { enabled: true, start: '09:00', end: '19:00' },
        fri: { enabled: true, start: '09:00', end: '19:00' },
        sat: { enabled: false, start: '10:00', end: '15:00' },
        sun: { enabled: false, start: '10:00', end: '15:00' },
      },
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('ac_energy_site_profile', JSON.stringify(siteProfile));
    } catch (e) {
      console.warn(e);
    }
  }, [siteProfile]);

  // Settings
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ac_energy_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      project: 'AC Energy Management',
      site: 'Main Building',
      tariff: 8.50,
      threshold: 50,
      timeout: 15,
      themeMode: 'light',
      themePreset: 'porcelain',
      watermark: 'SoCTeamup Semiconductors',
      accentColor: '#4f46e5',
      iconColor: '#4f46e5',
      kpiColor: '#4f46e5',
      roomCardColor: '#4f46e5',
      bgPrimary: '#f8fafc',
      bgSecondary: '#ffffff',
      cardBg: '#ffffff',
      textPrimary: '#0f172a',
      textMuted: '#64748b',
      borderColor: '#e2e8f0',
    };
  });

  // Sync settings and apply theme accent
  useEffect(() => {
    try {
      localStorage.setItem('ac_energy_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn(e);
    }
    applyThemeAccent(settings.accentColor || '#4f46e5');
  }, [settings]);

  // Users
  const [users, setUsers] = useState([
    { username: 'admin', displayName: 'Administrator', role: 'admin' },
    { username: 'operator1', displayName: 'Facility Manager', role: 'operator' },
  ]);
  const [currentUser, setCurrentUser] = useState({
    username: 'admin',
    displayName: 'Administrator',
    role: 'admin',
  });

  // Modals & Drawers
  const [selectedRoomModal, setSelectedRoomModal] = useState(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

  // Serial Console Stream Logs
  const [serialLogs, setSerialLogs] = useState([
    'SYSTEM: Serial stream initialized at 115200 baud.',
    'RX ← {"type":"energy","room_id":"ROOM_101","voltage":238.4,"current":4.82,"power":1148.5,"energy":142.638,"pzem_ok":true}',
    'RX ← {"type":"energy","room_id":"ROOM_102","voltage":239.1,"current":2.95,"power":702.4,"energy":98.412,"pzem_ok":true}',
    'RX ← {"type":"energy","room_id":"ROOM_103","voltage":237.8,"current":8.65,"power":2056.2,"energy":312.890,"pzem_ok":true}',
    'RX ← {"type":"energy","room_id":"ROOM_104","voltage":240.2,"current":3.48,"power":832.0,"energy":115.340,"pzem_ok":true}',
  ]);

  // Fetch real backend API if running
  const refreshBackend = useCallback(async () => {
    try {
      const [resStatus, resControl, resLive, resPorts] = await Promise.allSettled([
        fetch('/api/status', { cache: 'no-store' }),
        fetch('/api/control', { cache: 'no-store' }),
        fetch('/api/live', { cache: 'no-store' }),
        fetch('/api/ports', { cache: 'no-store' }),
      ]);

      if (resStatus.status === 'fulfilled' && resStatus.value.ok) {
        const data = await resStatus.value.json();
        if (data) setHubStatus((prev) => ({ ...prev, ...data }));
      }

      if (resPorts.status === 'fulfilled' && resPorts.value.ok) {
        const data = await resPorts.value.json();
        if (data?.ports) {
          setHubStatus((prev) => ({ ...prev, ports: data.ports }));
        }
      }

      if (resControl.status === 'fulfilled' && resControl.value.ok) {
        const data = await resControl.value.json();
        if (data?.rooms && data.rooms.length > 0) {
          setRoomsData((prev) => {
            // Merge with local config
            const map = new Map(data.rooms.map((r) => [r.room_id, r]));
            return prev.map((oldR) => (map.has(oldR.room_id) ? { ...oldR, ...map.get(oldR.room_id) } : oldR));
          });
        }
      }

      if (resLive.status === 'fulfilled' && resLive.value.ok) {
        const data = await resLive.value.json();
        if (data?.rooms && Object.keys(data.rooms).length > 0) {
          setLiveData((prev) => ({ ...prev, ...data.rooms }));
          // Append to serial logs
          const sample = Object.values(data.rooms)[0];
          if (sample) {
            setSerialLogs((logs) => [
              `RX ← ${JSON.stringify(sample)}`,
              ...logs.slice(0, 100),
            ]);
          }
        }
      }
    } catch (e) {
      // Graceful fallback to rich local state
    }
  }, []);

  useEffect(() => {
    refreshBackend();
    const timer = setInterval(refreshBackend, 3000);
    return () => clearInterval(timer);
  }, [refreshBackend]);

  // Relay ON/OFF Handler
  const handleToggleRelay = async (roomId, targetState) => {
    const newState = (targetState || 'ON').toUpperCase();
    // Optimistic UI update
    setRoomsData((prev) =>
      prev.map((r) =>
        r.room_id === roomId ? { ...r, relay_state: newState } : r
      )
    );

    // Add activity log
    const roomName = roomsData.find((r) => r.room_id === roomId)?.room_name || roomId;
    setActivityLogs((prev) => [
      {
        id: `act-${Date.now()}`,
        kind: newState === 'ON' ? 'ok' : 'warn',
        title: `Relay Switched ${newState}`,
        desc: `${roomName} (${roomId}) relay manually commanded ${newState}`,
        time: new Date().toISOString(),
      },
      ...prev,
    ]);

    // Send real command to backend
    try {
      await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, state: newState }),
      });
    } catch (e) {
      console.warn('Backend offline, simulated locally:', e);
    }
  };

  // Add Room Handler
  const handleAddRoom = (newRoom) => {
    setRoomsData((prev) => [...prev, newRoom]);
    setAutomationRules((prev) => [
      ...prev,
      {
        room_id: newRoom.room_id,
        room_name: newRoom.room_name,
        mode: 'schedule',
        schedule_enabled: true,
        occupancy_enabled: true,
        schedule_start: '09:00',
        schedule_end: '19:00',
        occupancy_timeout_min: 20,
        week: siteProfile.week,
      },
    ]);
  };

  // Remove Room Handler
  const handleRemoveRoom = (roomId) => {
    setRoomsData((prev) => prev.filter((r) => r.room_id !== roomId));
    setAutomationRules((prev) => prev.filter((r) => r.room_id !== roomId));
  };

  // Update Room Config
  const handleUpdateRoom = (roomId, updates) => {
    setRoomsData((prev) =>
      prev.map((r) => (r.room_id === roomId ? { ...r, ...updates } : r))
    );
  };

  // Update Automation Rule
  const handleUpdateAutomation = (roomId, updates) => {
    setAutomationRules((prev) =>
      prev.map((rule) => (rule.room_id === roomId ? { ...rule, ...updates } : rule))
    );
  };

  // Mark Alert Read / Dismiss
  const handleDismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleMarkAllAlertsRead = () => {
    setAlerts([]);
  };

  // CSV Export utility
  const exportHistoryCSV = () => {
    const headers = [
      'date',
      'room_id',
      'room_name',
      'start_meter_kwh',
      'end_meter_kwh',
      'daily_energy_kwh',
      'daily_limit_kwh',
      'limit_exceeded',
      'tariff_per_kwh',
      'energy_charge_inr',
    ];
    const rows = historyData.map((h) =>
      headers.map((k) => `"${h[k] ?? ''}"`).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `energy_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple PDF Export trigger
  const exportHistoryPDF = (title = 'Energy & Billing Report') => {
    window.print();
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        applyThemeAccent,
        currentTab,
        setCurrentTab,
        roomsData,
        liveData,
        hubStatus,
        historyData,
        activityLogs,
        alerts,
        automationRules,
        siteProfile,
        setSiteProfile,
        settings,
        setSettings,
        users,
        setUsers,
        currentUser,
        setCurrentUser,
        selectedRoomModal,
        setSelectedRoomModal,
        isConnectModalOpen,
        setIsConnectModalOpen,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isAlertsDrawerOpen,
        setIsAlertsDrawerOpen,
        serialLogs,
        setSerialLogs,
        handleToggleRelay,
        handleAddRoom,
        handleRemoveRoom,
        handleUpdateRoom,
        handleUpdateAutomation,
        handleDismissAlert,
        handleMarkAllAlertsRead,
        exportHistoryCSV,
        exportHistoryPDF,
        refreshBackend,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
