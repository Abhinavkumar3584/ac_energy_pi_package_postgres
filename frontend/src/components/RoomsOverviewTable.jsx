import React, { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';

export default function RoomsOverviewTable({ rooms, onToggleRelay }) {
  const [searchTerm, setSearchTerm] = useState('');

  const displayRooms = rooms && rooms.length > 0 ? rooms : [
    { room_id: 'ROOM_001', room_name: 'Room 1', current_daily_kwh: '86.400', tariff_per_kwh: '8.50', daily_limit_kwh: '0.000', relay_state: 'ON' },
    { room_id: 'ROOM_002', room_name: 'Room 2', current_daily_kwh: '79.200', tariff_per_kwh: '8.50', daily_limit_kwh: '0.000', relay_state: 'ON' },
    { room_id: 'ROOM_003', room_name: 'Room 3', current_daily_kwh: '82.900', tariff_per_kwh: '8.50', daily_limit_kwh: '0.000', relay_state: 'ON' },
  ];

  const filteredRooms = displayRooms.filter((r) => {
    const id = (r.room_id || '').toLowerCase();
    const name = (r.room_name || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return id.includes(q) || name.includes(q);
  });

  const totalKwh = filteredRooms.reduce((acc, r) => acc + (parseFloat(r.current_daily_kwh) || 0), 0);
  const totalCost = filteredRooms.reduce((acc, r) => {
    const kwh = parseFloat(r.current_daily_kwh) || 0;
    const tariff = parseFloat(r.tariff_per_kwh) || 8.5;
    return acc + kwh * tariff;
  }, 0);

  return (
    <div id="rooms-table" className="glass-card p-3.5 w-full box-border">
      {/* Table Header with Search */}
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
            Rooms Overview
          </h3>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <SearchRoundedIcon sx={{ fontSize: 18 }} />
          </span>
          <input
            type="text"
            placeholder="Search room name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto w-full box-border mt-3">
        <table className="w-full min-w-[700px] text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                ROOM NAME & ID
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                CONSUMPTION SHARE
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                PERIOD kWh
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                ESTIMATED COST
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                TODAY'S kWh
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                DAILY LIMIT
              </th>
              <th className="py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase text-right">
                RELAY STATUS
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRooms.map((room) => {
              const kwh = parseFloat(room.current_daily_kwh) || 0;
              const tariff = parseFloat(room.tariff_per_kwh) || 8.5;
              const cost = kwh * tariff;
              const share = totalKwh > 0 ? Math.round((kwh / totalKwh) * 100) : 0;
              const isRelayOn = (room.relay_state || 'ON').toUpperCase() === 'ON';
              const limitVal = parseFloat(room.daily_limit_kwh) || 0;

              return (
                <tr
                  key={room.room_id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Room Name & ID */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 font-bold text-xs">
                        {room.room_id}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{room.room_name}</span>
                    </div>
                  </td>

                  {/* Consumption Share */}
                  <td className="py-3 px-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-[28px]">
                        {share}%
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Period kWh */}
                  <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                    {kwh > 0 ? `${kwh.toFixed(1)} kWh` : '--'}
                  </td>

                  {/* Estimated Cost */}
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {cost > 0 ? `₹ ${cost.toFixed(2)}` : '--'}
                  </td>

                  {/* Today's kWh */}
                  <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                    {kwh.toFixed(3)} kWh
                  </td>

                  {/* Daily Limit */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        limitVal > 0
                          ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {limitVal > 0 ? `${limitVal.toFixed(1)} kWh` : 'No Limit'}
                    </span>
                  </td>

                  {/* Relay Status Toggle */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleRelay && onToggleRelay(room.room_id, isRelayOn ? 'OFF' : 'ON')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-xs ${
                        isRelayOn
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                      }`}
                    >
                      <PowerSettingsNewRoundedIcon sx={{ fontSize: 13 }} />
                      {isRelayOn ? 'RELAY ON' : 'RELAY OFF'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Total Summary Row */}
            <tr className="bg-slate-50/90 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
              <td className="py-3 px-3">
                TOTAL ({filteredRooms.length} ROOMS)
              </td>
              <td className="py-3 px-3 text-blue-600 dark:text-blue-400">
                100% Total
              </td>
              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                {totalKwh > 0 ? `${totalKwh.toFixed(1)} kWh` : '0.000 kWh'}
              </td>
              <td className="py-3 px-3">
                ₹ {totalCost.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-blue-600 dark:text-blue-400">
                {totalKwh.toFixed(3)} kWh
              </td>
              <td className="py-3 px-3 text-slate-400 dark:text-slate-500">--</td>
              <td className="py-3 px-3 text-right text-slate-400 dark:text-slate-500">--</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
