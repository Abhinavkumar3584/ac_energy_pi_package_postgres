import React, { useState } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function RoomDetailModal({
  roomId,
  onClose,
  roomsData,
  liveData,
  automationRules,
  onToggleRelay,
  onUpdateAutomation,
}) {
  if (!roomId) return null;

  const room = roomsData.find((r) => r.room_id === roomId) || {
    room_id: roomId,
    room_name: roomId,
    daily_limit_kwh: '50.000',
    tariff_per_kwh: '8.50',
    relay_state: 'ON',
  };

  const reading = liveData[roomId] || {
    power: 850.0,
    voltage: 239.2,
    current: 3.55,
    frequency: 50.0,
    pf: 0.98,
    node_mac: '98:F4:AB:F5:9A:1C',
    pzem_ok: true,
  };

  const autoRule = automationRules.find((a) => a.room_id === roomId) || {
    mode: 'schedule',
    schedule_enabled: true,
    occupancy_enabled: true,
    occupancy_timeout_min: 20,
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

  const [localMode, setLocalMode] = useState(autoRule.mode || 'schedule');
  const [localOccupancy, setLocalOccupancy] = useState(autoRule.occupancy_enabled ?? true);
  const [localTimeout, setLocalTimeout] = useState(autoRule.occupancy_timeout_min || 20);
  const [localWeek, setLocalWeek] = useState(autoRule.week || {});
  const [savedToast, setSavedToast] = useState(false);

  const dailyKwh = parseFloat(room.current_daily_kwh || 0);
  const limitKwh = parseFloat(room.daily_limit_kwh || 50);
  const cost = (dailyKwh * parseFloat(room.tariff_per_kwh || 8.5)).toFixed(2);
  const relayState = String(room.relay_state || 'ON').toUpperCase();
  const usedPct = limitKwh > 0 ? Math.min(100, (dailyKwh / limitKwh) * 100) : 0;

  const handleSave = () => {
    onUpdateAutomation(roomId, {
      mode: localMode,
      occupancy_enabled: localOccupancy,
      occupancy_timeout_min: localTimeout,
      week: localWeek,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {room.room_name}
              </h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-bold">
                {room.room_id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Circuit Telemetry, Weekly Scheduling & Intelligent Automation Controls
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 overflow-y-auto flex-1 flex flex-col gap-3.5">
          {/* 4 Top KPI Mini Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Live Power</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
                {reading.power?.toFixed(0)} W
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Today's Energy</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
                {dailyKwh.toFixed(2)} kWh
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Today's Bill</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-600 mt-0.5 block">
                ₹{cost}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Relay State</span>
              <span
                className={`text-base sm:text-lg font-extrabold mt-0.5 block ${
                  relayState === 'ON' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {relayState}
              </span>
            </div>
          </div>

          {/* Operating Mode & Manual Switch */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Operating Mode
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select logic mode for automatic circuit relay triggering
                </p>
              </div>

              {/* Master Relay Switch */}
              <button
                type="button"
                onClick={() => onToggleRelay(room.room_id, relayState === 'ON' ? 'OFF' : 'ON')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                  relayState === 'ON'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <BoltRoundedIcon sx={{ fontSize: 16 }} />
                <span>Switch Relay: {relayState}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {[
                { id: 'manual', label: 'Manual Control', icon: <TouchAppRoundedIcon sx={{ fontSize: 16 }} /> },
                { id: 'schedule', label: 'Weekly Schedule', icon: <AccessTimeRoundedIcon sx={{ fontSize: 16 }} /> },
                { id: 'occupancy', label: 'PIR Occupancy', icon: <SensorsRoundedIcon sx={{ fontSize: 16 }} /> },
                { id: 'auto', label: 'Full Auto Smart', icon: <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLocalMode(m.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    localMode === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Protection & Limits */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Daily Quota & Occupancy Timeout
            </h4>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Daily Limit: {limitKwh > 0 ? `${limitKwh.toFixed(1)} kWh` : 'Unlimited'}</span>
                <span>{usedPct.toFixed(1)}% Used</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    usedPct > 90 ? 'bg-rose-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOccupancy}
                  onChange={(e) => setLocalOccupancy(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Enable PIR Occupancy Sensor Cutoff</span>
              </label>

              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                <span className="text-slate-500 font-medium">Empty Timeout:</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={localTimeout}
                  onChange={(e) => setLocalTimeout(parseInt(e.target.value) || 20)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-800"
                />
                <span className="text-slate-500">mins</span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Days */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Weekly Operating Schedule
            </h4>
            <div className="flex flex-col gap-2">
              {DAYS.map(({ key, label }) => {
                const dayConf = localWeek[key] || { enabled: true, start: '09:00', end: '19:00' };
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <input
                        type="checkbox"
                        checked={dayConf.enabled}
                        onChange={(e) => {
                          setLocalWeek((prev) => ({
                            ...prev,
                            [key]: { ...dayConf, enabled: e.target.checked },
                          }));
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`font-bold ${dayConf.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={dayConf.start || '09:00'}
                        disabled={!dayConf.enabled}
                        onChange={(e) => {
                          setLocalWeek((prev) => ({
                            ...prev,
                            [key]: { ...dayConf, start: e.target.value },
                          }));
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold disabled:opacity-50"
                      />
                      <span className="text-slate-400 font-bold">→</span>
                      <input
                        type="time"
                        value={dayConf.end || '19:00'}
                        disabled={!dayConf.enabled}
                        onChange={(e) => {
                          setLocalWeek((prev) => ({
                            ...prev,
                            [key]: { ...dayConf, end: e.target.value },
                          }));
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold disabled:opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagnostics Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-slate-600">
            <div>
              <span className="text-slate-400 block font-bold">Node MAC:</span>
              <span className="font-mono font-bold text-slate-800">{reading.node_mac}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Voltage:</span>
              <span className="font-bold text-slate-800">{reading.voltage} V</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Frequency:</span>
              <span className="font-bold text-slate-800">{reading.frequency} Hz</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Sensor State:</span>
              <span className="font-bold text-emerald-600">
                {reading.pzem_ok ? 'PZEM OK' : 'Sensor Error'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            {savedToast && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> Rules saved!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
