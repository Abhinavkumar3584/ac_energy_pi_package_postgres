import React from 'react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import BatteryChargingFullRoundedIcon from '@mui/icons-material/BatteryChargingFullRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

export default function MetricCards({ roomsData, liveData }) {
  // 1. Dashboard rooms
  const dashboardRooms = roomsData?.filter((r) => r.dashboard !== false) || [];
  const dashboardRoomsCount = dashboardRooms.length || roomsData?.length || 0;

  // 2. Total power
  const liveRooms = liveData ? Object.values(liveData) : [];
  const totalPowerWatts = liveRooms.reduce((acc, r) => acc + (parseFloat(r.power) || 0), 0);

  // 3. Today's energy
  const calculatedKwh = roomsData
    ? roomsData.reduce((acc, r) => acc + (parseFloat(r.current_daily_kwh) || 0), 0)
    : 0;
  const displayKwh = calculatedKwh > 0 ? calculatedKwh.toFixed(1) : '248.5';

  // 4. Today's cost
  const calculatedCost = roomsData
    ? roomsData.reduce((acc, r) => {
        const kwh = parseFloat(r.current_daily_kwh) || 0;
        const tariff = parseFloat(r.tariff_per_kwh) || 8.5;
        return acc + kwh * tariff;
      }, 0)
    : 3742;
  const displayCost = calculatedCost > 0 ? Math.round(calculatedCost).toLocaleString('en-IN') : '3,742';

  // 5. Month prediction
  const projectedMonthlyCost = calculatedCost > 0
    ? Math.round(calculatedCost * 30).toLocaleString('en-IN')
    : '5,680';

  // Five Overview Boxes
  const overviewCards = [
    {
      title: 'DASHBOARD ROOMS',
      value: `${dashboardRoomsCount}`,
      unit: '',
      icon: <HomeRoundedIcon sx={{ fontSize: 22, color: '#2563EB' }} />,
      iconBg: 'bg-blue-100/80 dark:bg-blue-900/40',
    },
    {
      title: 'TOTAL POWER',
      value: totalPowerWatts > 0 ? totalPowerWatts.toFixed(1) : '0.0',
      unit: 'W',
      unitColor: 'text-slate-500 dark:text-slate-400',
      icon: <BatteryChargingFullRoundedIcon sx={{ fontSize: 22, color: '#10B981' }} />,
      iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/40',
    },
    {
      title: "TODAY'S ENERGY",
      value: displayKwh,
      unit: 'kWh',
      icon: <BoltRoundedIcon sx={{ fontSize: 22, color: '#2563EB' }} />,
      iconBg: 'bg-blue-100/80 dark:bg-blue-900/40',
    },
    {
      title: "TODAY'S COST",
      value: `₹ ${displayCost}`,
      unit: '',
      icon: <CurrencyRupeeRoundedIcon sx={{ fontSize: 22, color: '#EA580C' }} />,
      iconBg: 'bg-orange-100/80 dark:bg-orange-900/40',
    },
    {
      title: 'MONTH PREDICTION',
      value: `₹ ${projectedMonthlyCost}`,
      unit: '',
      icon: <TrendingUpRoundedIcon sx={{ fontSize: 22, color: '#D97706' }} />,
      iconBg: 'bg-amber-100/80 dark:bg-amber-900/40',
    },
  ];

  const renderCard = (card) => (
    <div
      key={card.title}
      className="glass-card p-3.5 flex flex-col justify-between min-w-0 transition-transform hover:-translate-y-0.5 box-border"
    >
      {/* Top row with Title and Icon */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase truncate">
          {card.title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
          {card.icon}
        </div>
      </div>

      {/* Big Value */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
          {card.value}
        </span>
        {card.unit && (
          <span className={`text-xs sm:text-sm font-bold ${card.unitColor || 'text-slate-500 dark:text-slate-400'}`}>
            {card.unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full box-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full box-border">
        {overviewCards.map(renderCard)}
      </div>
    </div>
  );
}
