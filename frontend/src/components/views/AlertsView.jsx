import React, { useState } from 'react';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { useApp } from '../../context/AppContext';

export default function AlertsView() {
  const { alerts, handleDismissAlert, handleMarkAllAlertsRead } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = alerts.filter((a) => {
    if (filter === 'warn') return a.severity === 'warn';
    if (filter === 'info') return a.severity === 'info';
    if (filter === 'ok') return a.severity === 'ok';
    return true;
  });

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Active System & Electrical Alerts ({alerts.length})
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Filters */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700">
            {['all', 'warn', 'info', 'ok'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg uppercase transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'warn' ? 'Warnings' : f === 'info' ? 'Info' : 'Normal'}
              </button>
            ))}
          </div>

          {alerts.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAlertsRead}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <DoneAllRoundedIcon sx={{ fontSize: 16 }} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="flex flex-col gap-3.5">
        {filtered.length > 0 ? (
          filtered.map((a) => {
            const isWarn = a.severity === 'warn';
            const isOk = a.severity === 'ok';

            return (
              <div
                key={a.id}
                className={`glass-card p-3.5 flex items-start justify-between gap-3.5 border-l-4 transition-all ${
                  isWarn
                    ? 'border-l-amber-500'
                    : isOk
                    ? 'border-l-emerald-500'
                    : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">
                    {isWarn ? (
                      <WarningAmberRoundedIcon sx={{ fontSize: 24, color: '#D97706' }} />
                    ) : isOk ? (
                      <CheckCircleOutlineRoundedIcon sx={{ fontSize: 24, color: '#059669' }} />
                    ) : (
                      <InfoOutlinedIcon sx={{ fontSize: 24, color: '#2563EB' }} />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {a.room}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono font-bold border border-slate-200/60 dark:border-slate-700">
                        {a.roomId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        &bull; {a.time}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                      {a.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {a.desc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissAlert(a.id)}
                  title="Dismiss Alert"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center">
            <CheckCircleOutlineRoundedIcon sx={{ fontSize: 40, color: '#10B981', margin: '0 auto 8px' }} />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Active Alerts
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              All electrical circuits, PZEM sensors and relay switches are performing within healthy parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
