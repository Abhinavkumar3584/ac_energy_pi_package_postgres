import React, { useState, useRef, useEffect } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import UsbRoundedIcon from '@mui/icons-material/UsbRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useApp } from '../context/AppContext';

export default function TopNavbar() {
  const {
    theme,
    toggleTheme,
    setCurrentTab,
    hubStatus,
    setIsConnectModalOpen,
    setIsSearchModalOpen,
    setIsAlertsDrawerOpen,
    alerts,
    siteProfile,
    currentUser,
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const isConnected = hubStatus?.connected ?? true;

  // Bulletproof click-outside listener to close profile menu cleanly
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="fixed top-3.5 left-3.5 md:left-[298px] right-3.5 z-40 box-border">
      {/* Main Glass Navbar - strictly single line, fixed height, exact 14px outer margins */}
      <div className="glass-card h-[56px] px-3.5 flex items-center justify-between flex-nowrap gap-3 w-full box-border relative z-40">
        {/* Left: Expanded Search Bar */}
        <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl min-w-0">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full h-9 flex items-center gap-2.5 px-3 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-500 dark:text-slate-400 text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs group"
            title="Search rooms, circuits, devices... (Ctrl + K)"
          >
            <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
            <span className="flex-1 text-left text-slate-500 dark:text-slate-400 font-medium truncate">
              Search rooms, circuits, devices, telemetry...
            </span>
            <kbd className="hidden sm:inline-flex items-center text-[10px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 font-mono font-bold shadow-2xs flex-shrink-0">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Right Status Badges & CTAs - strictly ONE line, no wrap */}
        <div className="flex items-center gap-2 flex-nowrap ml-auto flex-shrink-0">
          {/* Day / Night Theme Switcher (Icon Only) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0 ${
              theme === 'dark'
                ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
            title={theme === 'dark' ? 'Switch to Day Light View' : 'Switch to Cinematic Night View'}
          >
            {theme === 'dark' ? (
              <LightModeRoundedIcon sx={{ fontSize: 18, color: '#FBBF24' }} />
            ) : (
              <DarkModeRoundedIcon sx={{ fontSize: 18, color: '#6366F1' }} />
            )}
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsAlertsDrawerOpen(true)}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-black dark:text-white relative transition-colors flex-shrink-0"
            title="System Alerts"
          >
            <NotificationsRoundedIcon sx={{ fontSize: 18 }} />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Zone Chip */}
          <span className="hidden sm:inline-flex h-8 items-center gap-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-black dark:text-white font-black text-xs flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="capitalize">{siteProfile.type || 'Office'}</span>
          </span>

          {/* Live Stream Status */}
          <span
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-xl font-black text-xs flex-shrink-0 ${
              isConnected
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-rose-50 text-rose-950 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </span>

          {/* Cloud Sync Icon */}
          <div
            title="Telemetry Sync: Realtime"
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-500 flex-shrink-0"
          >
            <CloudDoneRoundedIcon sx={{ fontSize: 18, color: '#10B981' }} />
          </div>

          {/* Connect Port CTA */}
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="h-8 inline-flex items-center gap-1 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex-shrink-0"
          >
            <UsbRoundedIcon sx={{ fontSize: 16 }} />
            <span>{isConnected && hubStatus?.port ? `Port: ${hubStatus.port}` : 'Connect Port'}</span>
          </button>

          {/* Admin Profile Dropdown */}
          <div className="relative flex-shrink-0" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="h-8 flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700 cursor-pointer flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {(currentUser.displayName || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-black text-black dark:text-white leading-none">
                  {currentUser.displayName || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-800 dark:text-slate-300 capitalize leading-tight mt-0.5 font-bold">
                  {currentUser.role || 'Operator'}
                </p>
              </div>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} className="text-slate-800 dark:text-slate-200" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-[100] text-xs">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-extrabold text-slate-800 dark:text-slate-100">{currentUser.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">@{currentUser.username}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('settings');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <SettingsRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                  <span>System Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-rose-600 font-semibold cursor-pointer"
                >
                  <LogoutRoundedIcon sx={{ fontSize: 16 }} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
