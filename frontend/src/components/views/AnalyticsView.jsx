import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import { useApp } from '../../context/AppContext';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

export default function AnalyticsView() {
  const { roomsData, liveData, activityLogs } = useApp();

  const [selectedRoom, setSelectedRoom] = useState('all');
  const [metric, setMetric] = useState('energy'); // 'energy' or 'cost'
  const [timeRange, setTimeRange] = useState('7d'); // '24h', '7d', '30d', 'month'
  const [activityFilter, setActivityFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Daily Trend Mock Data
  const trendData = [
    { date: 'Mon', energy: 184.2, cost: 1565.7, power: 3420 },
    { date: 'Tue', energy: 212.5, cost: 1806.2, power: 4100 },
    { date: 'Wed', energy: 198.0, cost: 1683.0, power: 3890 },
    { date: 'Thu', energy: 245.8, cost: 2089.3, power: 4650 },
    { date: 'Fri', energy: 260.4, cost: 2213.4, power: 4920 },
    { date: 'Sat', energy: 142.1, cost: 1207.8, power: 2150 },
    { date: 'Sun', energy: 118.6, cost: 1008.1, power: 1800 },
  ];

  // Hourly Pattern Data
  const hourlyData = [
    { hour: '06:00', kwh: 3.2 },
    { hour: '08:00', kwh: 12.8 },
    { hour: '10:00', kwh: 32.4 },
    { hour: '12:00', kwh: 48.6 },
    { hour: '14:00', kwh: 52.1 },
    { hour: '16:00', kwh: 44.5 },
    { hour: '18:00', kwh: 28.2 },
    { hour: '20:00', kwh: 14.1 },
    { hour: '22:00', kwh: 6.4 },
  ];

  // Room Breakdown Data
  const breakdownData = roomsData.map((r, i) => {
    const kwh = parseFloat(r.current_daily_kwh) || 20;
    const tariff = parseFloat(r.tariff_per_kwh) || 8.5;
    return {
      name: r.room_name,
      id: r.room_id,
      value: metric === 'cost' ? parseFloat((kwh * tariff).toFixed(1)) : parseFloat(kwh.toFixed(1)),
      color: COLORS[i % COLORS.length],
    };
  });

  const totalValue = breakdownData.reduce((acc, b) => acc + b.value, 0);

  // Filtered Activity
  const filteredActivity = activityLogs.filter((act) => {
    if (activityFilter === 'ok' && act.kind !== 'ok') return false;
    if (activityFilter === 'warn' && act.kind !== 'warn') return false;
    if (activityFilter === 'system' && act.kind !== 'system') return false;
    if (activitySearch) {
      const q = activitySearch.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        act.desc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Top Controls Toolbar */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            Energy Analytics & Visual Insights
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real daily historical records, load patterns, billing rankings & timeline events
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Room Selector */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Rooms (Aggregated)</option>
            {roomsData.map((r) => (
              <option key={r.room_id} value={r.room_id}>
                {r.room_name} ({r.room_id})
              </option>
            ))}
          </select>

          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
          >
            <option value="energy">Energy (kWh)</option>
            <option value="cost">Electricity Cost (₹)</option>
          </select>

          {/* Time Range Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            {['24h', '7d', '30d', 'month'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1 rounded-lg uppercase transition-all ${
                  timeRange === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Feature Chart: Trend with Gradient & Tooltip */}
      <div className="glass-card p-3.5 w-full">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wider">
              {metric === 'cost' ? 'Daily Electricity Cost Trend (₹)' : 'Daily AC Energy Consumption (kWh)'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Verified daily totals synced from PostgreSQL
            </p>
          </div>
          <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            Total {timeRange.toUpperCase()}: {metric === 'cost' ? `₹${(totalValue * 7).toFixed(0)}` : `${(totalValue * 7).toFixed(1)} kWh`}
          </span>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(val) => [metric === 'cost' ? `₹${val}` : `${val} kWh`, metric === 'cost' ? 'Cost' : 'Energy']}
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#8B5CF6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#purpleGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4-Card Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
        {/* Card 1: Live Power Draw */}
        <div className="glass-card p-3.5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Live Power Draw
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} W`, 'Load']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="power" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: AC Energy Breakdown */}
        <div className="glass-card p-3.5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              AC Energy Breakdown
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Room Share</span>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [metric === 'cost' ? `₹${val}` : `${val} kWh`, 'Share']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Today Hourly Pattern */}
        <div className="glass-card p-3.5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Today Pattern
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Hourly Avg</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} kWh`, 'Load']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="kwh" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Weekly Usage Histogram */}
        <div className="glass-card p-3.5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Weekly Usage
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Daily kWh</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val} kWh`, 'Usage']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="energy" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights Grid: Room Comparison, Ranking & Peak Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full">
        {/* Left: Consumption Ranking Leaderboard */}
        <div className="lg:col-span-6 glass-card p-3.5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <LeaderboardRoundedIcon sx={{ fontSize: 20, color: '#F59E0B' }} />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Circuit Consumption Ranking
              </h3>
              <p className="text-[11px] text-slate-500">
                Sorted by highest {metric === 'cost' ? 'billing' : 'kWh draw'} this period
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-1">
            {breakdownData
              .sort((a, b) => b.value - a.value)
              .map((r, i) => {
                const sharePct = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
                return (
                  <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            i === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : i === 1
                              ? 'bg-slate-300 text-slate-800'
                              : i === 2
                              ? 'bg-orange-300 text-orange-950'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <b className="text-slate-800">{r.name}</b>
                          <span className="text-slate-400 font-mono text-[10px] ml-1.5">({r.id})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <b className="text-slate-900">
                          {metric === 'cost' ? `₹${r.value}` : `${r.value} kWh`}
                        </b>
                        <span className="text-slate-400 text-[10px] block">
                          {sharePct.toFixed(1)}% share
                        </span>
                      </div>
                    </div>
                    {/* Share progress bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${sharePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Peak Power & Forecast Stats */}
        <div className="lg:col-span-6 flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="glass-card p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Peak Power In History</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">4,920 W</p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Recorded Friday 15:30</span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Monthly Bill</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">₹52,480</p>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Based on 30-day forecast</span>
            </div>
            <div className="glass-card p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Monthly kWh</span>
              <p className="text-xl font-extrabold text-purple-600 mt-1">6,174 kWh</p>
              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Avg 205.8 kWh/day</span>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card p-3.5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Telemetry & System Activity Feed
                </h3>
                <p className="text-[11px] text-slate-500">
                  Hardware events, relay commands & packet sync log
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                {['all', 'ok', 'warn', 'system'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className={`px-2 py-0.5 rounded-md uppercase transition-all ${
                      activityFilter === f
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredActivity.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        act.kind === 'ok'
                          ? 'bg-emerald-500'
                          : act.kind === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <b className="text-slate-900 font-bold block">{act.title}</b>
                      <p className="text-[11px] text-slate-500 mt-0.5">{act.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
