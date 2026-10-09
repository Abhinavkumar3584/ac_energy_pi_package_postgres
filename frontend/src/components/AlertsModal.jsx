import React from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';

export default function AlertsModal({
  open,
  onClose,
  alerts,
  onDismissAlert,
  onMarkAllRead,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3.5 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden my-3.5 mr-3.5 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              System Alerts & Notifications
            </h3>
            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 rounded-full font-bold text-[10px] border border-orange-200 dark:border-orange-800/50">
              {alerts.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                title="Mark all read"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
              >
                <DoneAllRoundedIcon sx={{ fontSize: 14 }} />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 overflow-y-auto flex-1 flex flex-col gap-3.5">
          {alerts.length > 0 ? (
            alerts.map((a) => {
              const isWarn = a.severity === 'warn';
              const isOk = a.severity === 'ok';
              return (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3.5 transition-all ${
                    isWarn
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                      : isOk
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0">
                      {isWarn ? (
                        <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
                      ) : isOk ? (
                        <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
                      ) : (
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {a.room}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          &bull; {a.time}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
                        {a.title}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {a.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDismissAlert(a.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                    title="Dismiss"
                  >
                    <CloseRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              No active alerts. All circuits and sensors operating normally!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
