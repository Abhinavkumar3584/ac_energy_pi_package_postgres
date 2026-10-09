import React, { useState, useEffect } from 'react';
import UsbRoundedIcon from '@mui/icons-material/UsbRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function ConnectPortModal({ open, onClose, hubStatus, onRefreshStatus }) {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(hubStatus?.port || '');
  const [baud, setBaud] = useState(hubStatus?.baud || 115200);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isConnected = hubStatus?.connected ?? false;

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setSuccessMsg('');
      fetch('/api/ports')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ports) {
            setPorts(data.ports);
            if (!selectedPort && data.ports.length > 0) {
              setSelectedPort(data.ports[0].device);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load ports:', err);
        });
    }
  }, [open, hubStatus]);

  if (!open) return null;

  const handleConnect = async () => {
    if (!selectedPort) {
      setErrorMsg('Please select a serial port.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baud: Number(baud) }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(`Successfully connected to ${selectedPort}`);
        if (onRefreshStatus) onRefreshStatus();
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg(data.error || 'Failed to connect');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg('Disconnected');
        if (onRefreshStatus) onRefreshStatus();
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg(data.error || 'Failed to disconnect');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Error disconnecting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3.5">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-3.5 rounded-2xl w-full max-w-md shadow-2xl border border-white/90 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-3.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UsbRoundedIcon sx={{ fontSize: 20 }} />
            </div>
            <h3 className="text-base font-extrabold">ESP32 Hardware Hub</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          Connect to the ESP-NOW serial hub receiving AC energy meter telemetry.
        </p>

        {/* Inputs */}
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Serial COM Port
            </label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {ports.map((p) => (
                <option key={p.device} value={p.device}>
                  {p.device} {p.description ? `(${p.description})` : ''}
                </option>
              ))}
              {ports.length === 0 && <option value="COM3">COM3 (Default)</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Baud Rate
            </label>
            <select
              value={baud}
              onChange={(e) => setBaud(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value={9600}>9600</option>
              <option value={115200}>115200 (Recommended)</option>
              <option value={230400}>230400</option>
            </select>
          </div>
        </div>

        {/* Current status pill */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs mb-5 flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          <span className={`font-bold ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isConnected ? `CONNECTED (${hubStatus?.port})` : 'DISCONNECTED'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-all"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
