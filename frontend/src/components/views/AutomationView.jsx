import React from 'react';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useApp } from '../../context/AppContext';

export default function AutomationView() {
  const {
    roomsData,
    automationRules,
    handleUpdateAutomation,
    setSelectedRoomModal,
    handleToggleRelay,
  } = useApp();

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Page Header */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            Automation & Operating Modes
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Define daily limits, weekly operating hours, PIR occupancy timeouts and cutoff rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Rules Active: {automationRules.length} Circuits
          </span>
        </div>
      </div>

      {/* Hardware Logic Notice Banner */}
      <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-start gap-3.5 text-xs text-blue-900">
        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p className="font-bold">Hardware Command Relay Protocol</p>
          <p className="text-blue-800 text-[11px] mt-0.5 leading-relaxed">
            When limits or schedules are triggered, commands (<code>ON,&lt;ROOM_ID&gt;</code> / <code>OFF,&lt;ROOM_ID&gt;</code>) are transmitted directly to the ESP32 Gateway over USB Serial. Telemetry confirms hardware state before updating the live display.
          </p>
        </div>
      </div>

      {/* Automation Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {roomsData.map((room) => {
          const rule = automationRules.find((a) => a.room_id === room.room_id) || {
            mode: 'schedule',
            schedule_enabled: true,
            occupancy_enabled: true,
            schedule_start: '09:00',
            schedule_end: '19:00',
            occupancy_timeout_min: 20,
            occupancy_state: 'MOTION',
            command_status: 'SUCCESS',
          };

          const relayState = String(room.relay_state || 'ON').toUpperCase();
          const cutoffEnabled = parseFloat(room.daily_limit_kwh || 0) > 0;

          return (
            <div key={room.room_id} className="glass-card p-3.5 flex flex-col gap-3.5">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {room.room_name}
                  </h4>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px] font-bold">
                    {room.room_id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRelay(room.room_id, relayState === 'ON' ? 'OFF' : 'ON')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      relayState === 'ON'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    }`}
                  >
                    Relay: {relayState}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomModal(room.room_id)}
                    title="Edit weekly calendar"
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <TuneRoundedIcon sx={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>

              {/* Toggles Row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.schedule_enabled}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, { schedule_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800">Schedule Automation</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.occupancy_enabled}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, { occupancy_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800">PIR Occupancy Sensing</span>
                </label>
              </div>

              {/* Settings Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Mode
                  </label>
                  <select
                    value={rule.mode}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, { mode: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="manual">Manual</option>
                    <option value="schedule">Schedule</option>
                    <option value="occupancy">Occupancy</option>
                    <option value="auto">Smart Auto</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={rule.schedule_start || '09:00'}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, { schedule_start: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={rule.schedule_end || '19:00'}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, { schedule_end: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-semibold text-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Timeout
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={rule.occupancy_timeout_min || 20}
                    onChange={(e) =>
                      handleUpdateAutomation(room.room_id, {
                        occupancy_timeout_min: parseInt(e.target.value) || 20,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800 text-xs text-center"
                  />
                </div>
              </div>

              {/* Diagnostics Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Occupancy</span>
                  <span className="font-bold text-emerald-600">{rule.occupancy_state || 'MOTION'}</span>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Auto Cutoff</span>
                  <span className={`font-bold ${cutoffEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {cutoffEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">ESP ACK</span>
                  <span className="font-bold text-blue-600">{rule.command_status || 'SUCCESS'}</span>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block font-bold">Daily Limit</span>
                  <span className="font-bold text-slate-800">{room.daily_limit_kwh || 'None'} kWh</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
