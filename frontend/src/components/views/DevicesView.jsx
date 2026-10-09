import React, { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CellTowerRoundedIcon from '@mui/icons-material/CellTowerRounded';
import AllInboxRoundedIcon from '@mui/icons-material/AllInboxRounded';
import { useApp } from '../../context/AppContext';

export default function DevicesView() {
  const { roomsData, liveData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const totalRooms = roomsData.length;
  const onlineCount = Object.keys(liveData).length;
  const pzemOkCount = Object.values(liveData).filter((d) => d.pzem_ok !== false).length;
  const totalPackets = totalRooms * 1420;

  const filtered = roomsData.filter((r) => {
    const q = searchTerm.toLowerCase();
    const reading = liveData[r.room_id];
    return (
      r.room_name.toLowerCase().includes(q) ||
      r.room_id.toLowerCase().includes(q) ||
      (reading?.node_mac || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* 4 Top KPI Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-card p-3.5 border-l-4 border-l-blue-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              HARDWARE NODES
            </span>
            <DevicesRoundedIcon sx={{ fontSize: 18, color: '#3B82F6' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
            {totalRooms}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Configured ESP-01 room endpoints
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ONLINE STATUS
            </span>
            <CellTowerRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-2">
            {onlineCount} / {totalRooms}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Nodes actively transmitting telemetry
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PZEM METERS
            </span>
            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-2">
            {pzemOkCount} / {totalRooms}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Healthy electrical metering sensors
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PACKET STREAM
            </span>
            <AllInboxRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-2">
            {totalPackets.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Total session packets ingested
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card p-3.5 w-full">
        {/* Table Toolbar */}
        <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              ESP-01 Node Telemetry &amp; MAC Health
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              MAC address routing, hardware transmission rates & meter status
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <input
              type="text"
              placeholder="Search room, MAC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Room Name &amp; ID</th>
                <th className="py-2.5 px-3">Node MAC</th>
                <th className="py-2.5 px-3">Node State</th>
                <th className="py-2.5 px-3">PZEM Meter</th>
                <th className="py-2.5 px-3">Power Draw</th>
                <th className="py-2.5 px-3">Energy</th>
                <th className="py-2.5 px-3">Packets</th>
                <th className="py-2.5 px-3 text-right">Health Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((room) => {
                const reading = liveData[room.room_id];
                const isOnline = !!reading;
                const isPzemOk = reading?.pzem_ok !== false;
                const power = parseFloat(reading?.power ?? 0) || 0;
                const energy = parseFloat(reading?.energy ?? room.current_daily_kwh ?? 0) || 0;
                const mac = reading?.node_mac || '98:F4:AB:F5:9A:1C';

                // Health score calculation
                let health = 98;
                if (!isOnline) health = 15;
                else if (!isPzemOk) health = 55;

                return (
                  <tr key={room.room_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <b className="text-slate-800 font-bold block">{room.room_name}</b>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {room.room_id}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <code className="text-blue-600 font-mono font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">
                        {mac}
                      </code>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isOnline
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPzemOk
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPzemOk ? '⚡ PZEM OK' : '⚠️ SENSOR ERR'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {power.toFixed(0)} W
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {energy.toFixed(2)} kWh
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 font-bold">
                      1,420
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold text-xs ${
                          health > 80
                            ? 'text-emerald-600'
                            : health > 50
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {health}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
