import React, { useState } from 'react';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';

export default function RoomCard({ room, reading, onOpenModal, onToggleRelay }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dailyKwh = parseFloat(room.current_daily_kwh ?? reading?.daily_energy_kwh ?? 0) || 0;
  const limitKwh = parseFloat(room.daily_limit_kwh ?? reading?.daily_limit_kwh ?? 0) || 0;
  const tariff = parseFloat(room.tariff_per_kwh ?? 8.5) || 8.5;
  const costInr = (dailyKwh * tariff).toFixed(2);
  const livePower = parseFloat(reading?.power ?? 0) || 0;
  const voltage = parseFloat(reading?.voltage ?? 240.0) || 240.0;
  const current = parseFloat(reading?.current ?? (livePower / 240)).toFixed(2);
  const pf = parseFloat(reading?.pf ?? 0.98).toFixed(2);
  const frequency = parseFloat(reading?.frequency ?? 50.0).toFixed(1);
  const nodeMac = reading?.node_mac || '98:F4:AB:XX:XX:XX';
  const isOnline = reading ? true : false;
  const isPzemOk = reading?.pzem_ok !== false;
  const relayState = String(room.relay_state || 'ON').toUpperCase();

  // Status calculation
  let statusLabel = 'STANDBY';
  let statusColor = 'bg-purple-100 text-purple-700 border-purple-200';
  let dotColor = 'bg-purple-500';

  if (relayState === 'OFF') {
    statusLabel = 'CUT OFF';
    statusColor = 'bg-rose-100 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (!isOnline) {
    statusLabel = 'OFFLINE';
    statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  } else if (!isPzemOk) {
    statusLabel = 'METER ERROR';
    statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (livePower > 30) {
    statusLabel = 'RUNNING';
    statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  }

  // Workload % based on limit (or 24h max load fallback)
  const maxLoadKwh = limitKwh > 0 ? limitKwh : ((room.max_power || 2500) * 10) / 1000;
  const rawPct = (dailyKwh / maxLoadKwh) * 100;
  const displayPct = Math.min(100, Math.max(0, rawPct));
  const dashOffset = (100 - displayPct).toFixed(1);

  // Gauge Ring Color
  let gaugeColor = '#10B981'; // Green
  if (rawPct > 85) gaugeColor = '#EF4444'; // Red
  else if (rawPct > 65) gaugeColor = '#F59E0B'; // Amber
  else if (rawPct > 40) gaugeColor = '#3B82F6'; // Blue

  return (
    <div
      className={`glass-card relative overflow-hidden transition-all duration-300 hover:shadow-lg border ${
        rawPct >= 100 ? 'border-rose-300 ring-2 ring-rose-400/20' : 'border-white/80'
      }`}
    >
      {/* Top Action Icons */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOpenModal(room.room_id)}
          title="Open Controls & Automation"
          className="w-7 h-7 rounded-lg bg-slate-100/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <SettingsRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      <div className="p-3 flex flex-col items-center">
        {/* SVG Circular Gauge */}
        <div className="relative w-24 h-24 my-0.5 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background track circle */}
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="rgba(226, 232, 240, 0.8)"
              strokeWidth="9"
              pathLength="100"
            />
            {/* Foreground progress circle */}
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={dashOffset}
              pathLength="100"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Info Inside Gauge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">
              {rawPct.toFixed(0)}%
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {livePower.toFixed(0)} W live
            </span>
          </div>
        </div>

        {/* Room Title & ID */}
        <div className="text-center mt-1.5">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
            {room.room_name}
          </h4>
          <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono font-bold tracking-wider">
            {room.room_id}
          </span>
        </div>

        {/* Status Pill & Relay Switch */}
        <div className="flex items-center justify-center gap-2 mt-2 w-full">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {statusLabel}
          </span>

          {/* Quick Relay Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggleRelay(room.room_id, relayState === 'ON' ? 'OFF' : 'ON')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
              relayState === 'ON'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <PowerSettingsNewRoundedIcon sx={{ fontSize: 13 }} />
            <span>{relayState}</span>
          </button>
        </div>

        {/* 3-Column Energy, Bill, Limit Strip */}
        <div className="grid grid-cols-3 gap-1.5 w-full mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Energy</p>
            <p className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5">{dailyKwh.toFixed(1)} kWh</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Bill</p>
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{costInr}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Limit</p>
            <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
              {limitKwh > 0 ? `${limitKwh.toFixed(0)} kWh` : 'None'}
            </p>
          </div>
        </div>

        {/* Expand / Collapse Details Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Readings' : 'View Full Telemetry'}</span>
          {isExpanded ? (
            <KeyboardArrowUpRoundedIcon sx={{ fontSize: 16 }} />
          ) : (
            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
          )}
        </button>

        {/* Expanded Telemetry Grid */}
        {isExpanded && (
          <div className="w-full mt-3 pt-3 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Voltage</span>
              <span className="font-bold text-slate-800">{voltage} V</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Current</span>
              <span className="font-bold text-slate-800">{current} A</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Power Factor</span>
              <span className="font-bold text-slate-800">{pf}</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Frequency</span>
              <span className="font-bold text-slate-800">{frequency} Hz</span>
            </div>
            <div className="col-span-2 p-1.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Node MAC</span>
              <span className="font-mono font-bold text-slate-700 text-[10px] truncate block">
                {nodeMac}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
