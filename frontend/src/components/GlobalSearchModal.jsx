import React, { useState, useEffect } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';

export default function GlobalSearchModal({
  open,
  onClose,
  rooms,
  onSelectRoom,
  onNavigate,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.toLowerCase().trim();

  // Matched Rooms
  const matchedRooms = rooms.filter(
    (r) =>
      !q ||
      r.room_name.toLowerCase().includes(q) ||
      r.room_id.toLowerCase().includes(q)
  );

  // System Navigation Matches
  const navShortcuts = [
    { label: 'Energy Dashboard', tab: 'dashboard', icon: <AssessmentRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'All Rooms Overview', tab: 'rooms', icon: <MeetingRoomRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Advanced Analytics', tab: 'analytics', icon: <AssessmentRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Automation & Modes', tab: 'automation', icon: <SettingsRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Active Alerts', tab: 'alerts', icon: <NotificationsRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Energy & Billing Reports', tab: 'reports', icon: <AssessmentRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Live Serial Terminal', tab: 'live', icon: <DevicesRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Energy Database Records', tab: 'history', icon: <AssessmentRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'ESP-01 Devices & Nodes', tab: 'devices', icon: <DevicesRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Site Profile & Settings', tab: 'settings', icon: <SettingsRoundedIcon sx={{ fontSize: 16 }} /> },
  ].filter((s) => !q || s.label.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-3.5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3.5 bg-slate-50/70">
          <SearchRoundedIcon sx={{ fontSize: 22, color: '#3B82F6' }} />
          <input
            type="text"
            autoFocus
            placeholder="Search rooms, metrics, devices, pages (Press Esc to exit)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Search Results Content */}
        <div className="max-h-96 overflow-y-auto p-3.5 flex flex-col gap-3.5">
          {/* Quick Page Jump */}
          {navShortcuts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Pages & Views
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {navShortcuts.map((s) => (
                  <button
                    key={s.tab}
                    type="button"
                    onClick={() => {
                      onNavigate(s.tab);
                      onClose();
                    }}
                    className="p-2 rounded-xl hover:bg-blue-50 text-left flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors"
                  >
                    <span className="text-blue-600">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rooms List */}
          {matchedRooms.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Configured Rooms ({matchedRooms.length})
              </p>
              <div className="flex flex-col gap-1">
                {matchedRooms.map((r) => (
                  <button
                    key={r.room_id}
                    type="button"
                    onClick={() => {
                      onSelectRoom(r.room_id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-100 text-left flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {r.room_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {r.room_id} &middot; Today: {r.current_daily_kwh} kWh
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        r.relay_state === 'ON'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {r.relay_state}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedRooms.length === 0 && navShortcuts.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold">
              No matching rooms or pages found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
