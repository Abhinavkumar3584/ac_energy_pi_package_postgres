import React, { useState } from 'react';
import RoomCard from '../RoomCard';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { useApp } from '../../context/AppContext';

export default function RoomsView() {
  const {
    roomsData,
    liveData,
    setSelectedRoomModal,
    handleToggleRelay,
    setCurrentTab,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRooms = roomsData.filter((room) => {
    const reading = liveData[room.room_id];
    const livePower = parseFloat(reading?.power ?? 0) || 0;
    const isOnline = !!reading;
    const isPzemOk = reading?.pzem_ok !== false;
    const relayState = String(room.relay_state || 'ON').toUpperCase();

    // Determine status
    let statusCode = 'standby';
    if (relayState === 'OFF') statusCode = 'cutoff';
    else if (!isOnline) statusCode = 'offline';
    else if (!isPzemOk) statusCode = 'error';
    else if (livePower > 30) statusCode = 'running';

    if (statusFilter !== 'all' && statusCode !== statusFilter) {
      return false;
    }

    const q = searchTerm.toLowerCase();
    return (
      room.room_name.toLowerCase().includes(q) ||
      room.room_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Page Title & Controls Bar */}
      <div className="glass-card px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
            All Configured Rooms ({roomsData.length})
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-tight mt-0.5">
            Complete building inventory, including rooms hidden from main dashboard
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
            <FilterListRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="running">Running (&gt;30W)</option>
              <option value="standby">Standby</option>
              <option value="offline">Offline</option>
              <option value="cutoff">Relay Cut Off</option>
              <option value="error">Meter Error</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-52">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <SearchRoundedIcon sx={{ fontSize: 16 }} />
            </span>
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Configure in Settings Button */}
          <button
            type="button"
            onClick={() => setCurrentTab('settings')}
            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <AddCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />
            <span>Manage Rooms</span>
          </button>
        </div>
      </div>

      {/* Room Cards Grid */}
      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.room_id}
              room={room}
              reading={liveData[room.room_id]}
              onOpenModal={setSelectedRoomModal}
              onToggleRelay={handleToggleRelay}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-500 text-sm font-semibold">
            No rooms match your filter criteria "{searchTerm || statusFilter}".
          </p>
        </div>
      )}
    </div>
  );
}
