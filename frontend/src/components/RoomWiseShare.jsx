import React from 'react';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';

const defaultRooms = [
  {
    name: 'Room 1',
    type: '1.5T AC',
    kwh: '86.4',
    share: 35,
    operational: '8.4 hrs',
    barColor: 'bg-blue-600',
    dotColor: 'bg-blue-600',
    textColor: 'text-blue-600',
  },
  {
    name: 'Room 2',
    type: '2.0T Conf',
    kwh: '79.2',
    share: 32,
    operational: '7.1 hrs',
    barColor: 'bg-teal-600',
    dotColor: 'bg-teal-600',
    textColor: 'text-teal-600',
  },
  {
    name: 'Room 3',
    type: '2.0T Server',
    kwh: '82.9',
    share: 33,
    operational: '9.2 hrs',
    barColor: 'bg-purple-600',
    dotColor: 'bg-purple-600',
    textColor: 'text-purple-600',
  },
];

export default function RoomWiseShare({ roomsData }) {
  const rooms = defaultRooms;

  return (
    <div className="glass-card p-3.5 flex flex-col justify-between w-full h-full min-w-0 box-border">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
            Room-wise Share
          </h3>
        </div>
        <a
          href="#rooms-table"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5"
        >
          View All <ArrowForwardIosRoundedIcon sx={{ fontSize: 10 }} />
        </a>
      </div>

      {/* Room Items */}
      <div className="flex flex-col gap-2.5 mt-2">
        {rooms.map((room) => (
          <div
            key={room.name}
            className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${room.dotColor}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{room.name}</span>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                  {room.type}
                </span>
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {room.kwh} <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">kWh</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200/90 dark:bg-slate-700 overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${room.barColor}`}
                style={{ width: `${room.share}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Operational: {room.operational}
              </span>
              <span className={`font-bold ${room.textColor}`}>
                {room.share}% share
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
