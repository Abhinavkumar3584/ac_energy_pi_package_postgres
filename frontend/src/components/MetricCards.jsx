import React from 'react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CellTowerRoundedIcon from '@mui/icons-material/CellTowerRounded';
import BatteryChargingFullRoundedIcon from '@mui/icons-material/BatteryChargingFullRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

export default function MetricCards({ roomsData, liveData }) {
  // Calculations for hardware telemetry cards (Row 1)
  const configuredRoomsCount = roomsData?.length ? (roomsData.length > 3 ? 3 : roomsData.length) : 3;
  
  const liveRooms = liveData ? Object.values(liveData) : [];
  const activeAcUnitsCount = liveRooms.filter((r) => (parseFloat(r.power) || 0) > 30).length;
  const onlineNodesCount = liveRooms.length;
  const totalPowerWatts = liveRooms.reduce((acc, r) => acc + (parseFloat(r.power) || 0), 0);

  // Row 1: Hardware & Live Load Telemetry (Clean Minimalist Cards)
  const hardwareCards = [
    {
      title: 'DASHBOARD ROOMS',
      value: `${configuredRoomsCount}`,
      unit: '',
      icon: <HomeRoundedIcon sx={{ fontSize: 22, color: '#2563EB' }} />,
      iconBg: 'bg-blue-100/80 dark:bg-blue-900/40',
    },
    {
      title: 'ACTIVE AC UNITS',
      value: `${activeAcUnitsCount}`,
      unit: '',
      icon: <BoltRoundedIcon sx={{ fontSize: 22, color: '#EA580C' }} />,
      iconBg: 'bg-orange-100/80 dark:bg-orange-900/40',
    },
    {
      title: 'ONLINE NODES',
      value: `${onlineNodesCount}`,
      unit: '',
      icon: <CellTowerRoundedIcon sx={{ fontSize: 22, color: '#8B5CF6' }} />,
      iconBg: 'bg-purple-100/80 dark:bg-purple-900/40',
    },
    {
      title: 'TOTAL POWER',
      value: totalPowerWatts > 0 ? totalPowerWatts.toFixed(1) : '0.0',
      unit: 'W',
      unitColor: 'text-slate-500 dark:text-slate-400',
      icon: <BatteryChargingFullRoundedIcon sx={{ fontSize: 22, color: '#10B981' }} />,
      iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/40',
    },
  ];

  // Calculations for energy & financial KPI cards (Row 2)
  const calculatedKwh = roomsData
    ? roomsData.reduce((acc, r) => acc + (parseFloat(r.current_daily_kwh) || 0), 0)
    : 248.5;
  const displayKwh = calculatedKwh > 0 ? calculatedKwh.toFixed(1) : '248.5';

  const calculatedCost = roomsData
    ? roomsData.reduce((acc, r) => {
        const kwh = parseFloat(r.current_daily_kwh) || 0;
        const tariff = parseFloat(r.tariff_per_kwh) || 8.5;
        return acc + kwh * tariff;
      }, 0)
    : 3742;
  const displayCost = calculatedCost > 0 ? Math.round(calculatedCost).toLocaleString('en-IN') : '3,742';

  // Row 2: Existing Energy & Financial KPIs (Clean Minimalist Cards)
  const energyKpiCards = [
    {
      title: 'TOTAL ENERGY',
      value: displayKwh,
      unit: 'kWh',
      icon: <BoltRoundedIcon sx={{ fontSize: 22, color: '#2563EB' }} />,
      iconBg: 'bg-blue-100/80 dark:bg-blue-900/40',
    },
    {
      title: 'TOTAL COST',
      value: `₹ ${displayCost}`,
      unit: '',
      icon: <CurrencyRupeeRoundedIcon sx={{ fontSize: 22, color: '#EA580C' }} />,
      iconBg: 'bg-orange-100/80 dark:bg-orange-900/40',
    },
    {
      title: 'ACTIVE UNITS',
      value: `${configuredRoomsCount} / 3`,
      unit: 'Online',
      unitColor: 'text-emerald-600 dark:text-emerald-400',
      icon: <MeetingRoomRoundedIcon sx={{ fontSize: 22, color: '#2563EB' }} />,
      iconBg: 'bg-indigo-100/80 dark:bg-indigo-900/40',
    },
    {
      title: 'PROJECTED COST',
      value: '₹ 5,680',
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
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
          {card.title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
          {card.icon}
        </div>
      </div>

      {/* Big Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
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
    <div className="flex flex-col gap-3.5 w-full box-border">
      {/* Row 1: Hardware & Live Load Telemetry (4 Clean Glassmorphic Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full box-border">
        {hardwareCards.map(renderCard)}
      </div>

      {/* Row 2: Energy & Cost KPI Cards (4 Clean Glassmorphic Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full box-border">
        {energyKpiCards.map(renderCard)}
      </div>
    </div>
  );
}
