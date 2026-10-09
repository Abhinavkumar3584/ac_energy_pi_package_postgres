import React from 'react';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import DeviceThermostatRoundedIcon from '@mui/icons-material/DeviceThermostatRounded';
import EnergySavingsLeafRoundedIcon from '@mui/icons-material/EnergySavingsLeafRounded';

const summaryItems = [
  {
    label: 'ENERGY USED',
    value: '248.5',
    unit: 'kWh',
    icon: <BoltRoundedIcon sx={{ fontSize: 20, color: '#2563EB' }} />,
    bg: 'bg-blue-100/80',
  },
  {
    label: 'TOTAL COST',
    value: '₹ 3,742',
    unit: '',
    icon: <CurrencyRupeeRoundedIcon sx={{ fontSize: 20, color: '#EA580C' }} />,
    bg: 'bg-orange-100/80',
  },
  {
    label: 'AVG. AMBIENT',
    value: '26°C',
    unit: 'Setpoint',
    icon: <DeviceThermostatRoundedIcon sx={{ fontSize: 20, color: '#D97706' }} />,
    bg: 'bg-amber-100/80',
  },
  {
    label: 'CO2 OFFSET',
    value: '124 kg',
    unit: 'Saved',
    unitColor: 'text-emerald-600',
    icon: <EnergySavingsLeafRoundedIcon sx={{ fontSize: 20, color: '#059669' }} />,
    bg: 'bg-emerald-100/80',
  },
];

export default function TodaySummary() {
  return (
    <div className="glass-card p-3.5 flex flex-col justify-between w-full h-full min-w-0 box-border">
      <div className="mb-2">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
          Today's Summary
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Instant telemetry aggregates
        </p>
      </div>

      <div className="flex flex-col gap-2 my-auto">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 p-2.5 px-3 rounded-2xl bg-slate-50/90 border border-slate-200/80"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
              {item.icon}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase leading-none block">
                {item.label}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  {item.value}
                </span>
                {item.unit && (
                  <span className={`text-xs font-bold ${item.unitColor || 'text-slate-500'}`}>
                    {item.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
