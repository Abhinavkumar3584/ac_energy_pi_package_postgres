import React, { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useApp } from '../../context/AppContext';

export default function ReportsView() {
  const {
    roomsData,
    historyData,
    exportHistoryCSV,
    exportHistoryPDF,
    refreshBackend,
    currentTab,
  } = useApp();

  // Unified section tab: 'summary' (Periodic Reports & Billing) vs 'records' (Energy Database Records)
  const [activeSubTab, setActiveSubTab] = useState(
    currentTab === 'history' ? 'records' : 'summary'
  );

  // --- Reports & Billing State ---
  const [period, setPeriod] = useState('monthly');
  const [reportSearchTerm, setReportSearchTerm] = useState('');

  // Period multiplier logic for aggregation
  const multiplier = period === 'weekly' ? 7 : period === 'yearly' ? 365 : 30;
  const periodLabel = period === 'weekly' ? 'Weekly' : period === 'yearly' ? 'Yearly' : 'Monthly';

  const reportRows = roomsData.map((r) => {
    const dailyKwh = parseFloat(r.current_daily_kwh) || 25.0;
    const tariff = parseFloat(r.tariff_per_kwh) || 8.5;
    const periodKwh = dailyKwh * (multiplier * 0.95);
    const periodCost = periodKwh * tariff;
    const limit = parseFloat(r.daily_limit_kwh) || 50;
    const relay = String(r.relay_state || 'ON').toUpperCase();

    return {
      id: r.room_id,
      name: r.room_name,
      dailyKwh,
      periodKwh,
      periodCost,
      limit,
      relay,
      tariff,
    };
  });

  const totalPeriodEnergy = reportRows.reduce((acc, r) => acc + r.periodKwh, 0);
  const totalPeriodCost = reportRows.reduce((acc, r) => acc + r.periodCost, 0);
  const totalTodayEnergy = reportRows.reduce((acc, r) => acc + r.dailyKwh, 0);
  const activeRoomsCount = reportRows.filter((r) => r.dailyKwh > 0).length;

  const filteredReportRows = reportRows.filter((r) => {
    const q = reportSearchTerm.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  // --- Energy Records History State ---
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filteredRecords = historyData.filter((h) => {
    const q = recordsSearchTerm.toLowerCase();
    return (
      (h.room_name || '').toLowerCase().includes(q) ||
      (h.room_id || '').toLowerCase().includes(q) ||
      (h.date || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRows = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-3.5 w-full box-border">
      {/* Top Header & Segmented Section Switcher */}
      <div className="glass-card p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Energy Reports &amp; Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Periodic consumption analytics, tariff billing summaries, and database audit logs
          </p>
        </div>

        {/* 2 Segmented Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-700 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'summary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AssessmentRoundedIcon sx={{ fontSize: 16 }} />
            <span>Summary &amp; Billing Reports</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('records')}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'records'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HistoryRoundedIcon sx={{ fontSize: 16 }} />
            <span>Energy Records ({historyData.length})</span>
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: REPORTS & BILLING ================= */}
      {activeSubTab === 'summary' && (
        <div className="flex flex-col gap-3.5 w-full">
          {/* Action Bar: Period Selector + Export Buttons */}
          <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="weekly">📅 Weekly Report (7 Days)</option>
                <option value="monthly">📅 Monthly Report (30 Days)</option>
                <option value="yearly">📅 Yearly Report (365 Days)</option>
              </select>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                {periodLabel} Aggregation
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              {/* Export CSV */}
              <button
                type="button"
                onClick={exportHistoryCSV}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <FileDownloadRoundedIcon sx={{ fontSize: 16 }} />
                <span>Export CSV</span>
              </button>

              {/* Export PDF */}
              <button
                type="button"
                onClick={() => exportHistoryPDF(`${periodLabel} Energy & Billing Report`)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <PictureAsPdfRoundedIcon sx={{ fontSize: 16 }} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* 4 Summary Metric Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-card p-3.5 border-l-4 border-l-blue-600 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {periodLabel.toUpperCase()} ENERGY
                </span>
                <BoltRoundedIcon sx={{ fontSize: 18, color: '#3B82F6' }} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {totalPeriodEnergy.toFixed(1)} kWh
              </p>
            </div>

            <div className="glass-card p-3.5 border-l-4 border-l-emerald-600 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {periodLabel.toUpperCase()} COST
                </span>
                <CurrencyRupeeRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                ₹{totalPeriodCost.toFixed(2)}
              </p>
            </div>

            <div className="glass-card p-3.5 border-l-4 border-l-purple-600 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ACTIVE ROOMS
                </span>
                <MeetingRoomRoundedIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                {activeRoomsCount} / {reportRows.length}
              </p>
            </div>

            <div className="glass-card p-3.5 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PROJECTED MONTH
                </span>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                {(totalTodayEnergy * 30).toFixed(0)} kWh
              </p>
            </div>
          </div>

          {/* Consumption & Tariff Table */}
          <div className="glass-card p-3.5 w-full">
            <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {filteredReportRows.length} of {reportRows.length} Rooms
              </span>

              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <SearchRoundedIcon sx={{ fontSize: 18 }} />
                </span>
                <input
                  type="text"
                  placeholder="Search room name or ID..."
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Room Name &amp; ID</th>
                    <th className="py-2.5 px-3 w-40">Share %</th>
                    <th className="py-2.5 px-3">{periodLabel} Usage</th>
                    <th className="py-2.5 px-3">Electricity Bill</th>
                    <th className="py-2.5 px-3">Today kWh</th>
                    <th className="py-2.5 px-3">Daily Limit</th>
                    <th className="py-2.5 px-3 text-right">Relay Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReportRows.map((r) => {
                    const sharePct = totalPeriodEnergy > 0 ? (r.periodKwh / totalPeriodEnergy) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3">
                          <b className="text-slate-800 dark:text-slate-200 font-bold block">{r.name}</b>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">{r.id}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-10 text-[11px]">
                              {sharePct.toFixed(1)}%
                            </span>
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${sharePct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {r.periodKwh.toFixed(1)} kWh
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{r.periodCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {r.dailyKwh.toFixed(2)} kWh
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                          {r.limit > 0 ? `${r.limit.toFixed(0)} kWh` : 'None'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.relay === 'ON'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/40'
                            }`}
                          >
                            RELAY {r.relay}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-extrabold text-xs bg-slate-50/80 dark:bg-slate-800/80">
                    <td className="py-3 px-3 text-slate-900 dark:text-white">
                      TOTAL ({filteredReportRows.length} ROOMS)
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">100% Total</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white">
                      {totalPeriodEnergy.toFixed(1)} kWh
                    </td>
                    <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400">
                      ₹{totalPeriodCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white">
                      {totalTodayEnergy.toFixed(2)} kWh
                    </td>
                    <td className="py-3 px-3 text-slate-400">&mdash;</td>
                    <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">Active</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: ENERGY DATABASE RECORDS ================= */}
      {activeSubTab === 'records' && (
        <div className="flex flex-col gap-3.5 w-full">
          {/* Controls Bar */}
          <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Database Historical Telemetry ({historyData.length} Stored Entries)
              </h3>
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
                  value={recordsSearchTerm}
                  onChange={(e) => {
                    setRecordsSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Export CSV */}
              <button
                type="button"
                onClick={exportHistoryCSV}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <FileDownloadRoundedIcon sx={{ fontSize: 16 }} />
                <span>CSV</span>
              </button>

              {/* Export PDF */}
              <button
                type="button"
                onClick={() => exportHistoryPDF('Energy Records History')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <PictureAsPdfRoundedIcon sx={{ fontSize: 16 }} />
                <span>PDF</span>
              </button>

              {/* Refresh backend records */}
              <button
                type="button"
                onClick={refreshBackend}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh database records"
              >
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>

          {/* Historical Records Table */}
          <div className="glass-card p-3.5 w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[800px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, idx) => {
                      const exceeded = row.limit_exceeded === 'true';
                      const cutoff = row.cutoff_triggered === 'true';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {row.date}
                          </td>
                          <td className="py-3 px-3">
                            <b className="text-slate-800 dark:text-slate-200 font-bold block">{row.room_name}</b>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {row.room_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                            {row.start_meter_kwh}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                            {row.end_meter_kwh}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {row.daily_energy_kwh} kWh
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                            {row.daily_limit_kwh} kWh
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                exceeded
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/40'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {exceeded ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                cutoff
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/40'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {cutoff ? 'TRIGGERED' : 'NONE'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono">
                            ₹{row.tariff_per_kwh}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 mt-4 pt-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Page {page} of {totalPages} ({filteredRecords.length} records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
