import React, { useState, useRef, useEffect, useCallback } from 'react';
import HeaderStrip from '../HeaderStrip';
import MetricCards from '../MetricCards';
import RoomCard from '../RoomCard';
import TrendChart from '../TrendChart';
import RoomWiseShare from '../RoomWiseShare';
import TodaySummary from '../TodaySummary';
import RoomsOverviewTable from '../RoomsOverviewTable';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useApp } from '../../context/AppContext';

export default function DashboardView() {
  const {
    roomsData,
    liveData,
    setSelectedRoomModal,
    handleToggleRelay,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Rooms configured to show on dashboard (or fallback to first 6)
  const dashboardRooms = roomsData.filter(
    (r) => r.dashboard !== false
  );

  const filteredRooms = dashboardRooms.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.room_name.toLowerCase().includes(q) ||
      r.room_id.toLowerCase().includes(q)
    );
  });

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      resizeObserver.disconnect();
    };
  }, [filteredRooms, checkScroll]);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild;
    const scrollStep = firstChild ? firstChild.offsetWidth + 14 : 260;
    el.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header Strip with Live Status & Time */}
      <HeaderStrip />

      {/* 8x KPI Metric Cards (Hardware Row + Financial/Energy Row) */}
      <MetricCards roomsData={roomsData} liveData={liveData} />

      {/* Live AC Rooms Gauge Grid / Carousel */}
      <div className="glass-card p-3.5 w-full box-border relative">
        <div className="flex justify-between items-center mb-3.5 flex-wrap gap-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Live Room Gauges
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <input
              type="text"
              placeholder="Search room name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Carousel Container with Left/Right Scroll Buttons */}
        <div className="relative w-full">
          {/* Left Scroll Button */}
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className={`absolute -left-2 sm:-left-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-md ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="Scroll Left"
            aria-label="Scroll left"
          >
            <ChevronLeftRoundedIcon sx={{ fontSize: 26 }} />
          </button>

          {/* Cards Scroll Track - Exactly 5 cards fill the width on desktop, smooth scroll for >5 */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3.5 overflow-x-auto scroll-smooth no-scrollbar py-1 px-0.5 box-border"
          >
            {filteredRooms.map((room) => (
              <div
                key={room.room_id}
                className="w-[270px] sm:w-[280px] lg:w-[calc((100%-56px)/5)] min-w-[210px] lg:min-w-[calc((100%-56px)/5)] lg:max-w-[calc((100%-56px)/5)] flex-shrink-0 box-border"
              >
                <RoomCard
                  room={room}
                  reading={liveData[room.room_id]}
                  onOpenModal={setSelectedRoomModal}
                  onToggleRelay={handleToggleRelay}
                />
              </div>
            ))}

            {filteredRooms.length === 0 && (
              <div className="w-full py-10 text-center text-slate-400 text-xs font-semibold">
                No rooms match "{searchTerm}"
              </div>
            )}
          </div>

          {/* Right Scroll Button */}
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className={`absolute -right-2 sm:-right-3.5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-md ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="Scroll Right"
            aria-label="Scroll right"
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 26 }} />
          </button>
        </div>
      </div>

      {/* Middle Analytics Grid (Trend Chart, Room-wise Share, Today Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full box-border">
        <div className="lg:col-span-6 min-w-0">
          <TrendChart />
        </div>
        <div className="lg:col-span-3 min-w-0">
          <RoomWiseShare roomsData={roomsData} />
        </div>
        <div className="lg:col-span-3 min-w-0">
          <TodaySummary />
        </div>
      </div>

      {/* Bottom Data Table: Rooms Overview */}
      <div className="w-full min-w-0 box-border">
        <RoomsOverviewTable
          rooms={roomsData}
          onToggleRelay={handleToggleRelay}
        />
      </div>
    </div>
  );
}
