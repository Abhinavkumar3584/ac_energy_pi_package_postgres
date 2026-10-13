import React from 'react';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const {
    currentTab,
    setCurrentTab,
    alerts,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardRoundedIcon fontSize="small" /> },
    { id: 'rooms', label: 'All Rooms', icon: <MeetingRoomRoundedIcon fontSize="small" /> },
    { id: 'analytics', label: 'Analytics', icon: <InsightsRoundedIcon fontSize="small" /> },
    { id: 'automation', label: 'Automation', icon: <AutoModeRoundedIcon fontSize="small" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <NotificationsRoundedIcon fontSize="small" />,
      badge: alerts.length > 0 ? alerts.length : null,
    },
    { id: 'reports', label: 'Reports', icon: <AssessmentRoundedIcon fontSize="small" /> },
    { id: 'live', label: 'Live Energy', icon: <BoltRoundedIcon fontSize="small" /> },
    { id: 'devices', label: 'Devices', icon: <DevicesRoundedIcon fontSize="small" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsRoundedIcon fontSize="small" /> },
  ];

  const handleNavClick = (id) => {
    setCurrentTab(id);
    if (setIsMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className={`p-3.5 flex flex-col h-full box-border ${isMobile ? 'bg-white dark:bg-slate-900' : 'glass-card'}`}>
      {/* Brand Header */}
      <div className={`mb-4 flex-shrink-0 flex items-center ${isMobile ? 'justify-between px-1' : 'justify-center py-2 px-1'}`}>
        <img
          src="/logo.png"
          alt="SoCTeamup"
          className={`${isMobile ? 'h-9' : 'h-14'} w-auto max-w-[220px] object-contain block filter drop-shadow-xs`}
        />
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Close Menu"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Navigation List - Hidden scrollbar so NO duplicate scrollbar appears on screen */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`h-10 flex-shrink-0 rounded-xl px-3 flex items-center gap-3 text-sm text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30'
                  : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-white font-black'
              }`}
            >
              <span className={`flex items-center justify-center ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                    isActive ? 'bg-white text-blue-600' : 'bg-orange-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <p className="text-[10px] text-black dark:text-slate-300 font-black text-center leading-tight">
          Powered by SoCTeamup<br />Semiconductors Pvt. Ltd.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block fixed top-3.5 left-3.5 bottom-3.5 w-[270px] z-30 box-border">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Sliding Panel */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-left duration-200 bg-white dark:bg-slate-900">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
