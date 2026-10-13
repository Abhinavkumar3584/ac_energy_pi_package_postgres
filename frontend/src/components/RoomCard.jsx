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

      {/* Continuous Blended Conic Gauge (33% Green -> 33% Orange -> 33% Red) */}
      <div className="relative w-28 h-28 mx-auto my-2 flex items-center justify-center">
        {/* Soft Faded Guide Track (Whole 360-degree Blended Spectrum) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, #10B981 0%, #10B981 20%, #84CC16 33%, #F59E0B 50%, #F97316 66%, #EF4444 85%, #DC2626 100%)',
            opacity: 0.18,
          }}
        />

        {/* Active Vibrant Progress (Clipped by progress degrees) */}
        {displayPct > 0 && (
          <div
            className="absolute inset-0 rounded-full transition-all duration-700 ease-out"
            style={{
              background:
                'conic-gradient(from 0deg, #10B981 0%, #10B981 20%, #84CC16 33%, #F59E0B 50%, #F97316 66%, #EF4444 85%, #DC2626 100%)',
              WebkitMask: `conic-gradient(#000 0deg, #000 ${displayPct * 3.6}deg, transparent ${displayPct * 3.6}deg 360deg)`,
              mask: `conic-gradient(#000 0deg, #000 ${displayPct * 3.6}deg, transparent ${displayPct * 3.6}deg 360deg)`,
            }}
          />
        )}

        {/* Rounded Start Cap at Top (0% / 12 o'clock) */}
        {displayPct > 0 && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[11px] h-[11px] rounded-full bg-[#10B981] shadow-xs z-10"
          />
        )}

        {/* Rounded Leading Progress Tip */}
        {displayPct > 1 && displayPct < 99 && (
          <div
            className="absolute w-[11px] h-[11px] rounded-full z-10 shadow-xs"
            style={{
              left: `${56 + 50.5 * Math.cos(((displayPct * 3.6 - 90) * Math.PI) / 180) - 5.5}px`,
              top: `${56 + 50.5 * Math.sin(((displayPct * 3.6 - 90) * Math.PI) / 180) - 5.5}px`,
              backgroundColor:
                displayPct > 66 ? '#EF4444' : displayPct > 33 ? '#F97316' : '#10B981',
            }}
          />
        )}

        {/* Center Disc (Creates the clean hollow ring gauge) */}
        <div className="absolute inset-[11px] rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center shadow-xs z-20">
          <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tight">
            {rawPct.toFixed(0)}%
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 leading-tight">
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
