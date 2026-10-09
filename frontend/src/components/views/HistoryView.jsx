import React, { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useApp } from '../../context/AppContext';

export default function HistoryView() {
  const { historyData, exportHistoryCSV, exportHistoryPDF, refreshBackend } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = historyData.filter((h) => {
    const q = searchTerm.toLowerCase();
    return (
      (h.room_name || '').toLowerCase().includes(q) ||
      (h.room_id || '').toLowerCase().includes(q) ||
      (h.date || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header Bar */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            Energy Records History ({historyData.length} Stored Entries)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Non-volatile daily meter logs, starting baselines & electricity charges in PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <input
              type="text"
              placeholder="Search date, room..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={exportHistoryCSV}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FileDownloadRoundedIcon sx={{ fontSize: 16 }} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportHistoryPDF('Energy Records History')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <PictureAsPdfRoundedIcon sx={{ fontSize: 16 }} />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={refreshBackend}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh database records"
          >
            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card p-3.5 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Room Info</th>
                <th className="py-2.5 px-3">Start Meter</th>
                <th className="py-2.5 px-3">End Meter</th>
                <th className="py-2.5 px-3">Daily kWh</th>
                <th className="py-2.5 px-3">Daily Limit</th>
                <th className="py-2.5 px-3">Exceeded</th>
                <th className="py-2.5 px-3">Cutoff</th>
                <th className="py-2.5 px-3">Tariff</th>
                <th className="py-2.5 px-3 text-right">Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => {
                  const exceeded = row.limit_exceeded === 'true';
                  const cutoff = row.cutoff_triggered === 'true';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        {row.date}
                      </td>
                      <td className="py-3 px-3">
                        <b className="text-slate-800 font-bold block">{row.room_name}</b>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {row.room_id}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {row.start_meter_kwh}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {row.end_meter_kwh}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {row.daily_energy_kwh} kWh
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">
                        {row.daily_limit_kwh} kWh
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            exceeded ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {exceeded ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            cutoff ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cutoff ? 'TRIGGERED' : 'NONE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        ₹{row.tariff_per_kwh}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-600">
                        ₹{row.energy_charge_inr}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No historical database records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 mt-4 pt-3 text-xs">
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages} ({filtered.length} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
