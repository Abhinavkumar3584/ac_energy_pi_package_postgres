import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const dailyData = [
  { time: '12 AM', kwh: 12.0 },
  { time: '4 AM', kwh: 14.5 },
  { time: '8 AM', kwh: 21.0 },
  { time: '10 AM', kwh: 38.5 },
  { time: '12 PM', kwh: 26.2 },
  { time: '4 PM', kwh: 24.8 },
  { time: '8 PM', kwh: 29.1 },
  { time: '12 AM', kwh: 15.3 },
];

const weeklyData = [
  { time: 'Mon', kwh: 248.5 },
  { time: 'Tue', kwh: 260.1 },
  { time: 'Wed', kwh: 240.8 },
  { time: 'Thu', kwh: 255.4 },
  { time: 'Fri', kwh: 270.0 },
  { time: 'Sat', kwh: 180.2 },
  { time: 'Sun', kwh: 150.8 },
];

const monthlyData = [
  { time: 'Jan', kwh: 6800 },
  { time: 'Feb', kwh: 7100 },
  { time: 'Mar', kwh: 7500 },
  { time: 'Apr', kwh: 8200 },
  { time: 'May', kwh: 8900 },
  { time: 'Jun', kwh: 7600 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
        <span className="font-extrabold text-white">{payload[0].value} kWh</span>
        <span className="text-slate-400 font-medium">| {label}</span>
      </div>
    );
  }
  return null;
};

export default function TrendChart() {
  const [filter, setFilter] = useState('daily');

  const chartData = filter === 'daily' ? dailyData : filter === 'weekly' ? weeklyData : monthlyData;

  return (
    <div className="glass-card p-3.5 flex flex-col justify-between w-full h-full min-w-0 box-border">
      {/* Header and Filter Buttons */}
      <div className="flex justify-between items-start mb-3.5 flex-wrap gap-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
            Energy Consumption Trend
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            24-hour diurnal curve with real-time solar alignment
          </p>
        </div>

        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl">
          {['daily', 'weekly', 'monthly'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                filter === type
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#38BDF8" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.8)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="natural"
              dataKey="kwh"
              stroke="#2563EB"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#energyFill)"
              activeDot={{
                r: 6,
                fill: '#FFFFFF',
                stroke: '#2563EB',
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
