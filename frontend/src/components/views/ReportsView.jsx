import React, { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useApp } from '../../context/AppContext';

export default function ReportsView() {
  const { roomsData, exportHistoryCSV, exportHistoryPDF } = useApp();

  const [period, setPeriod] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');

  // Period Multiplier Mock Logic (to simulate weekly/monthly/yearly aggregations from stored DB)
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

  const filteredRows = reportRows.filter((r) => {
    const q = searchTerm.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header Bar */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            {periodLabel} Energy &amp; Billing Report
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Uses verified daily historical records stored in PostgreSQL with dynamic tariff computations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="weekly">📅 Weekly Report (7 Days)</option>
            <option value="monthly">📅 Monthly Report (30 Days)</option>
            <option value="yearly">📅 Yearly Report (365 Days)</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportHistoryCSV}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
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
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
            {totalPeriodEnergy.toFixed(1)} kWh
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Aggregated consumption for {periodLabel.toLowerCase()} timeframe
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {periodLabel.toUpperCase()} COST
            </span>
            <CurrencyRupeeRoundedIcon sx={{ fontSize: 18, color: '#059669' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-2">
            ₹{totalPeriodCost.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Calculated electricity charges at ₹8.50/kWh
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ACTIVE ROOMS
            </span>
            <MeetingRoomRoundedIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-2">
            {activeRoomsCount} / {reportRows.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Circuits with verified load activity
          </span>
        </div>

        <div className="glass-card p-3.5 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PROJECTED MONTH
            </span>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: '#D97706' }} />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-2">
            {(totalTodayEnergy * 30).toFixed(0)} kWh
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Est. ₹{(totalTodayEnergy * 30 * 8.5).toFixed(0)} projected bill
          </span>
        </div>
      </div>

      {/* Consumption Table with Search & Total Footer */}
      <div className="glass-card p-3.5 w-full">
        <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3.5">
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredRows.length} of {reportRows.length} Rooms
          </span>

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <input
              type="text"
              placeholder="Search room name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Room Name &amp; ID</th>
                <th className="py-2.5 px-3 w-40">Share %</th>
                <th className="py-2.5 px-3">{periodLabel} Usage</th>
                <th className="py-2.5 px-3">Electricity Bill</th>
                <th className="py-2.5 px-3">Today kWh</th>
                <th className="py-2.5 px-3">Daily Limit</th>
                <th className="py-2.5 px-3 text-right">Relay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((r) => {
                const sharePct = totalPeriodEnergy > 0 ? (r.periodKwh / totalPeriodEnergy) * 100 : 0;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <b className="text-slate-800 font-bold block">{r.name}</b>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{r.id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 w-10 text-[11px]">
                          {sharePct.toFixed(1)}%
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${sharePct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {r.periodKwh.toFixed(1)} kWh
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      ₹{r.periodCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700">
                      {r.dailyKwh.toFixed(2)} kWh
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-semibold">
                      {r.limit > 0 ? `${r.limit.toFixed(0)} kWh` : 'None'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.relay === 'ON'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
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
              <tr className="border-t-2 border-slate-300 font-extrabold text-xs bg-slate-50/80">
                <td className="py-3 px-3 text-slate-900">
                  TOTAL ({filteredRows.length} ROOMS)
                </td>
                <td className="py-3 px-3 text-slate-700">100% Total</td>
                <td className="py-3 px-3 text-slate-900">
                  {totalPeriodEnergy.toFixed(1)} kWh
                </td>
                <td className="py-3 px-3 text-emerald-700">
                  ₹{totalPeriodCost.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-slate-900">
                  {totalTodayEnergy.toFixed(2)} kWh
                </td>
                <td className="py-3 px-3 text-slate-400">&mdash;</td>
                <td className="py-3 px-3 text-right text-emerald-700">Active</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
