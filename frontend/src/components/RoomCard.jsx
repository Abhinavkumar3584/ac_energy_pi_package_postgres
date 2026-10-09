import React from 'react';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';

export default function RoomCard({ room, reading, onOpenModal, onToggleRelay }) {
  const dailyKwh = parseFloat(room.current_daily_kwh ?? reading?.daily_energy_kwh ?? 0) || 0;
  const limitKwh = parseFloat(room.daily_limit_kwh ?? reading?.daily_limit_kwh ?? 0) || 0;
  const livePower = parseFloat(reading?.power ?? 0) || 0;
  const relayState = String(room.relay_state || 'ON').toUpperCase();

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
      onClick={() => onOpenModal && onOpenModal(room.room_id)}
      className={`glass-card relative overflow-hidden transition-all duration-300 hover:shadow-lg border cursor-pointer group flex flex-col justify-between p-3.5 h-full ${
        rawPct >= 100 ? 'border-rose-300 ring-2 ring-rose-400/20' : 'border-white/80'
      }`}
    >
      {/* Top Header: Room Name & Settings Action */}
      <div className="flex items-center justify-between gap-1 w-full mb-1">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug truncate group-hover:text-blue-600 transition-colors">
          {room.room_name}
        </h4>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal(room.room_id);
          }}
          title="Open Controls & Automation"
          className="w-6 h-6 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex-shrink-0"
        >
          <SettingsRoundedIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      {/* SVG Circular Gauge */}
      <div className="relative w-26 h-26 mx-auto my-1.5 flex items-center justify-center">
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
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tight">
            {rawPct.toFixed(0)}%
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-tight">
            {livePower.toFixed(0)} W
          </span>
        </div>
      </div>

      {/* Bottom Action: Power Relay Switch */}
      <div className="w-full pt-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRelay(room.room_id, relayState === 'ON' ? 'OFF' : 'ON');
          }}
          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            relayState === 'ON'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
          title={relayState === 'ON' ? 'Turn Off Relay' : 'Turn On Relay'}
        >
          <PowerSettingsNewRoundedIcon sx={{ fontSize: 14 }} />
          <span>{relayState === 'ON' ? 'ON' : 'STANDBY'}</span>
        </button>
      </div>
    </div>
  );
}
