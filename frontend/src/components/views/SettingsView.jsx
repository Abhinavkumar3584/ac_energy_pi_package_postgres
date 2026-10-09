import React, { useState } from 'react';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { useApp } from '../../context/AppContext';

const THEME_PRESETS = [
  { id: 'porcelain', name: 'Porcelain & Indigo', accent: '#4F46E5', colorClass: 'from-indigo-500 to-blue-600' },
  { id: 'mint', name: 'Fresh Mint Energy', accent: '#059669', colorClass: 'from-emerald-500 to-teal-600' },
  { id: 'oceanic', name: 'Oceanic Ice', accent: '#0284C7', colorClass: 'from-sky-500 to-cyan-600' },
  { id: 'lavender', name: 'Lavender Bloom', accent: '#7C3AED', colorClass: 'from-purple-500 to-violet-600' },
  { id: 'warm', name: 'Warm Sand Gold', accent: '#D97706', colorClass: 'from-amber-500 to-orange-600' },
  { id: 'complementary', name: 'Complementary (Orange & Teal)', accent: '#EA580C', colorClass: 'from-orange-500 to-teal-600' },
  { id: 'triadic', name: 'Triadic (Purple, Teal & Orange)', accent: '#8B5CF6', colorClass: 'from-purple-500 to-amber-500' },
  { id: 'tetradic', name: 'Tetradic (Red, Green, Blue)', accent: '#EF4444', colorClass: 'from-red-500 to-blue-500' },
  { id: 'square', name: 'Square (Pink, Indigo, Amber)', accent: '#EC4899', colorClass: 'from-pink-500 to-indigo-500' },
];

const SITE_PRESETS = [
  { id: 'office', name: 'Corporate Office', hours: '09:00–19:00 (10 hrs)' },
  { id: 'home', name: 'Residential / Home', hours: '24 Hours Full Load' },
  { id: 'shop', name: 'Commercial Retail', hours: '10:00–21:00 (11 hrs)' },
  { id: 'institute', name: 'College / Institute', hours: '08:30–17:30 (9 hrs)' },
  { id: 'school', name: 'School Campus', hours: '08:00–15:00 (7 hrs)' },
  { id: 'custom', name: 'Custom Defined', hours: 'User Configured' },
];

export default function SettingsView() {
  const {
    settings,
    setSettings,
    siteProfile,
    setSiteProfile,
    roomsData,
    handleAddRoom,
    handleRemoveRoom,
    handleUpdateRoom,
    users,
    setUsers,
  } = useApp();

  const [activeTab, setActiveTab] = useState('general');
  const [toastMessage, setToastMessage] = useState('');

  // Form states for adding new room
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMax, setNewRoomMax] = useState(2500);

  // Form states for adding user
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('operator');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomId || !newRoomName) return;
    handleAddRoom({
      room_id: newRoomId.toUpperCase().trim(),
      room_name: newRoomName.trim(),
      max_power: parseInt(newRoomMax) || 2500,
      current_daily_kwh: '0.000',
      daily_limit_kwh: '50.000',
      tariff_per_kwh: settings.tariff.toFixed(2),
      relay_state: 'ON',
      dashboard: true,
      manual_control_supported: true,
    });
    setNewRoomId('');
    setNewRoomName('');
    triggerToast('New room added successfully!');
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUsername || !newDisplayName) return;
    setUsers((prev) => [
      ...prev,
      { username: newUsername.trim(), displayName: newDisplayName.trim(), role: newRole },
    ]);
    setNewUsername('');
    setNewDisplayName('');
    triggerToast('User created successfully!');
  };

  const handleDeleteUser = (uName) => {
    if (uName === 'admin') return;
    setUsers((prev) => prev.filter((u) => u.username !== uName));
    triggerToast('User removed!');
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Top Header & Segmented Tabs Bar */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            System &amp; Dashboard Settings
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure site identities, operating calendars, circuit quotas, theme presets & user roles
          </p>
        </div>

        {/* 4 Segmented Nav Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto max-w-full">
          {[
            { id: 'general', label: 'General & Profile', icon: <TuneRoundedIcon sx={{ fontSize: 16 }} /> },
            { id: 'rooms', label: 'Room Rules & Limits', icon: <MeetingRoomRoundedIcon sx={{ fontSize: 16 }} /> },
            { id: 'appearance', label: 'Theme & Appearance', icon: <PaletteRoundedIcon sx={{ fontSize: 16 }} /> },
            { id: 'users', label: 'User Accounts', icon: <PeopleRoundedIcon sx={{ fontSize: 16 }} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: General & Profile */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-6 glass-card p-3.5 flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Site Identity &amp; Electrical Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={settings.project}
                  onChange={(e) => setSettings({ ...settings, project: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Site / Facility Name
                </label>
                <input
                  type="text"
                  value={settings.site}
                  onChange={(e) => setSettings({ ...settings, site: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Electricity Tariff (₹ / kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.tariff}
                  onChange={(e) => setSettings({ ...settings, tariff: parseFloat(e.target.value) || 8.5 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  AC Running Threshold (Watts)
                </label>
                <input
                  type="number"
                  value={settings.threshold}
                  onChange={(e) => setSettings({ ...settings, threshold: parseInt(e.target.value) || 50 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Node Offline Timeout (sec)
                </label>
                <input
                  type="number"
                  value={settings.timeout}
                  onChange={(e) => setSettings({ ...settings, timeout: parseInt(e.target.value) || 15 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  After-Hours AC Policy
                </label>
                <select
                  value={siteProfile.after_hours}
                  onChange={(e) => setSiteProfile({ ...siteProfile, after_hours: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                >
                  <option value="warning">Display Warning on Dashboard</option>
                  <option value="allow">Silent Measurement Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Site Profile Presets */}
          <div className="lg:col-span-6 glass-card p-3.5 flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Operating Profile Presets
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SITE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSiteProfile({ ...siteProfile, type: p.id, name: p.name })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    siteProfile.type === p.id
                      ? 'bg-blue-50 border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900 block">{p.name}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{p.hours}</span>
                </button>
              ))}
            </div>

            <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <b>Active Profile:</b> {siteProfile.name} &bull; Gauges calibrate 100% capacity against configured operating hours or set limits.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Room Rules & Limits */}
      {activeTab === 'rooms' && (
        <div className="flex flex-col gap-3.5">
          {/* Add Room Bar */}
          <form
            onSubmit={handleCreateRoom}
            className="glass-card p-3.5 flex flex-col sm:flex-row items-center gap-3.5"
          >
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Room ID (e.g. ROOM_107)"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Room Name (e.g. Finance Dept)"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
            <div className="w-full sm:w-36">
              <input
                type="number"
                placeholder="Max Watts"
                value={newRoomMax}
                onChange={(e) => setNewRoomMax(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <AddRoundedIcon sx={{ fontSize: 16 }} />
              <span>Add Room</span>
            </button>
          </form>

          {/* Rooms Table */}
          <div className="glass-card p-3.5 w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Room ID</th>
                    <th className="py-2.5 px-3">Room Name</th>
                    <th className="py-2.5 px-3">Daily Limit (kWh)</th>
                    <th className="py-2.5 px-3">Tariff (₹/kWh)</th>
                    <th className="py-2.5 px-3">Show on Dashboard</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roomsData.map((room) => (
                    <tr key={room.room_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">
                        {room.room_id}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={room.room_name}
                          onChange={(e) => handleUpdateRoom(room.room_id, { room_name: e.target.value })}
                          className="bg-transparent border-b border-transparent hover:border-slate-300 font-bold text-slate-800 text-xs py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="1"
                          value={room.daily_limit_kwh}
                          onChange={(e) => handleUpdateRoom(room.room_id, { daily_limit_kwh: e.target.value })}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-xs text-center"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.1"
                          value={room.tariff_per_kwh}
                          onChange={(e) => handleUpdateRoom(room.room_id, { tariff_per_kwh: e.target.value })}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-xs text-center"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={room.dashboard !== false}
                          onChange={(e) => handleUpdateRoom(room.room_id, { dashboard: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(room.room_id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove Room"
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Appearance & Theme Presets */}
      {activeTab === 'appearance' && (
        <div className="flex flex-col gap-3.5">
          <div className="glass-card p-3.5 flex flex-col gap-3.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                9 One-Click Color &amp; Aesthetic Presets
              </h3>
              <p className="text-xs text-slate-500">
                Crafted color harmony tokens inspired by modern design systems
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, themePreset: preset.id, accentColor: preset.accent });
                    triggerToast(`Applied ${preset.name} theme!`);
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    settings.themePreset === preset.id
                      ? 'bg-blue-50/80 border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg bg-gradient-to-br ${preset.colorClass} shadow-xs flex-shrink-0`}
                    />
                    <div className="text-left">
                      <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {preset.accent}
                      </span>
                    </div>
                  </div>

                  {settings.themePreset === preset.id && (
                    <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: User Accounts */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* User List */}
          <div className="lg:col-span-7 glass-card p-3.5 flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              System Operators &amp; Role Access
            </h3>

            <div className="flex flex-col gap-2 mt-1">
              {users.map((u) => (
                <div
                  key={u.username}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-800 block text-xs">
                      {u.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      @{u.username} &bull; <b className="uppercase">{u.role}</b>
                    </span>
                  </div>

                  {u.username === 'admin' ? (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
                      Protected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.username)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add User Form */}
          <div className="lg:col-span-5 glass-card p-3.5 flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Create New Operator
            </h3>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. operator_john"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Display Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                >
                  <option value="operator">Operator (Monitoring &amp; Relay Commands)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                className="mt-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Save Button & Toast */}
      <div className="glass-card p-3.5 flex items-center justify-between">
        <div>
          {toastMessage && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
              {toastMessage}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => triggerToast('All configuration changes safely updated!')}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          <SaveRoundedIcon sx={{ fontSize: 18 }} />
          <span>Save All Settings</span>
        </button>
      </div>
    </div>
  );
}
