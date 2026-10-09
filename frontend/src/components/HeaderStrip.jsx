import React, { useState, useEffect } from 'react';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';

export default function HeaderStrip() {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 w-full">
      {/* Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight leading-tight">
          Energy Overview
        </h2>
      </div>

      {/* Date, Time & Weather Live Chips */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-black text-black dark:text-white">
          <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
          <span>{dateStr || 'Mon, 09 Jun 2025'}</span>
        </div>

        <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-black text-black dark:text-white">
          <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#2563EB' }} />
          <span>{timeStr || '10:24 AM'}</span>
        </div>

        <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs sm:text-sm font-black text-black dark:text-white">
          <WbSunnyRoundedIcon sx={{ fontSize: 18, color: '#EAB308' }} />
          <span>26°C Sunny</span>
        </div>
      </div>
    </div>
  );
}
