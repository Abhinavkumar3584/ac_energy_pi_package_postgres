import React, { useState } from 'react';
import UsbRoundedIcon from '@mui/icons-material/UsbRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import { useApp } from '../../context/AppContext';

export default function LiveEnergyView() {
  const { hubStatus, serialLogs, setSerialLogs, refreshBackend } = useApp();

  const [selectedPort, setSelectedPort] = useState(hubStatus.port || 'COM3');
  const [baudRate, setBaudRate] = useState(115200);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const isConnected = hubStatus.connected ?? true;

  const handleClearLogs = () => {
    setSerialLogs([]);
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Page Header */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            USB Serial Gateway &amp; Live Stream Monitor
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isConnected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {isConnected ? `Connected: ${hubStatus.port || 'COM3'}` : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Port Config & Protocols */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Connection Card */}
          <div className="glass-card p-3.5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UsbRoundedIcon sx={{ fontSize: 18 }} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Hardware Port Settings
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Serial COM / USB Port
                </label>
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="COM3">COM3 &mdash; CP210x USB to UART Bridge</option>
                  <option value="/dev/ttyUSB0">/dev/ttyUSB0 &mdash; ESP32 USB Gateway</option>
                  <option value="/dev/ttyACM0">/dev/ttyACM0 &mdash; CDC Serial Device</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Baud Rate
                </label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value={115200}>115200 (Default Standard)</option>
                  <option value={9600}>9600</option>
                  <option value={57600}>57600</option>
                  <option value={230400}>230400</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={refreshBackend}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshRoundedIcon sx={{ fontSize: 16 }} />
                  <span>Refresh Ports</span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
                    isConnected
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  {isConnected ? 'Disconnect Port' : 'Connect Port'}
                </button>
              </div>
            </div>
          </div>

          {/* Supported Packet Format Specs */}
          <div className="glass-card p-3.5 flex flex-col gap-3.5">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Supported Packet Protocols
            </h4>
            <div className="flex flex-col gap-2.5 text-[11px]">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. High-Speed JSON Line (Recommended)
                </span>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
{`{"type":"energy","room_id":"ROOM_101",
 "voltage":238.4,"current":4.82,"power":1148.5,
 "energy":142.638,"frequency":50.0,"pf":0.98,
 "pzem_ok":true}`}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Legacy ESP-NOW Labeled Text Packet
                </span>
                <pre className="p-2.5 bg-slate-900 text-slate-300 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
{`Room ID      : ROOM_101
Node MAC     : 98:F4:AB:F5:9A:1C
Voltage      : 238.4 V
Power        : 1148.5 W
Energy       : 142.638 kWh
PZEM status  : OK`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Monospaced Raw Terminal */}
        <div className="lg:col-span-7 glass-card p-3.5 flex flex-col">
          {/* Terminal Controls */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TerminalRoundedIcon sx={{ fontSize: 20, color: '#3B82F6' }} />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                  Live Serial Telemetry Console
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {isPaused ? <PlayArrowRoundedIcon sx={{ fontSize: 14 }} /> : <PauseRoundedIcon sx={{ fontSize: 14 }} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                <span>Clear</span>
              </button>

              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 pl-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
          </div>

          {/* Terminal Screen */}
          <div className="flex-1 min-h-[380px] bg-slate-950 text-slate-200 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 overflow-y-auto flex flex-col gap-1.5 shadow-inner">
            {serialLogs.length > 0 ? (
              serialLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed break-all ${
                    log.includes('SYSTEM')
                      ? 'text-cyan-400'
                      : log.includes('ROOM_101')
                      ? 'text-emerald-400'
                      : log.includes('ROOM_103')
                      ? 'text-purple-400'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 mr-2 text-[10px]">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-600 text-center my-auto">
                No active serial lines in buffer. Connect USB port or send telemetry.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
