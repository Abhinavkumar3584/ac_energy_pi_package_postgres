import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import ConnectPortModal from './components/ConnectPortModal';
import RoomDetailModal from './components/RoomDetailModal';
import GlobalSearchModal from './components/GlobalSearchModal';
import AlertsModal from './components/AlertsModal';

// Views
import DashboardView from './components/views/DashboardView';
import RoomsView from './components/views/RoomsView';
import AnalyticsView from './components/views/AnalyticsView';
import AutomationView from './components/views/AutomationView';
import AlertsView from './components/views/AlertsView';
import ReportsView from './components/views/ReportsView';
import LiveEnergyView from './components/views/LiveEnergyView';
import HistoryView from './components/views/HistoryView';
import DevicesView from './components/views/DevicesView';
import SettingsView from './components/views/SettingsView';

function MainLayout() {
  const {
    currentTab,
    setCurrentTab,
    roomsData,
    liveData,
    hubStatus,
    automationRules,
    alerts,
    selectedRoomModal,
    setSelectedRoomModal,
    isConnectModalOpen,
    setIsConnectModalOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    isAlertsDrawerOpen,
    setIsAlertsDrawerOpen,
    handleToggleRelay,
    handleUpdateAutomation,
    handleDismissAlert,
    handleMarkAllAlertsRead,
    refreshBackend,
  } = useApp();

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden box-border relative z-10">
      {/* Fixed Modern Left Navigation Sidebar */}
      <Sidebar />

      {/* Fixed Top Navbar - stuck at top-3.5, 100% equal with Sidebar top */}
      <TopNavbar />

      {/* Main Fluid Content Canvas - single clean page scroll, starts 14px below fixed TopNavbar */}
      <main className="flex-1 min-w-0 max-w-full md:ml-[298px] p-3.5 pt-[84px] flex flex-col gap-3.5 box-border">
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'rooms' && <RoomsView />}
        {currentTab === 'analytics' && <AnalyticsView />}
        {currentTab === 'automation' && <AutomationView />}
        {currentTab === 'alerts' && <AlertsView />}
        {currentTab === 'reports' && <ReportsView />}
        {currentTab === 'live' && <LiveEnergyView />}
        {currentTab === 'history' && <HistoryView />}
        {currentTab === 'devices' && <DevicesView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Room Detail, Telemetry & Automation Modal */}
      {selectedRoomModal && (
        <RoomDetailModal
          roomId={selectedRoomModal}
          onClose={() => setSelectedRoomModal(null)}
          roomsData={roomsData}
          liveData={liveData}
          automationRules={automationRules}
          onToggleRelay={handleToggleRelay}
          onUpdateAutomation={handleUpdateAutomation}
        />
      )}

      {/* Global Quick Search Dialog (Ctrl + K) */}
      <GlobalSearchModal
        open={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        rooms={roomsData}
        onSelectRoom={setSelectedRoomModal}
        onNavigate={setCurrentTab}
      />

      {/* Alerts & Notifications Drawer */}
      <AlertsModal
        open={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onDismissAlert={handleDismissAlert}
        onMarkAllRead={handleMarkAllAlertsRead}
      />

      {/* Connect Port Dialog Modal */}
      <ConnectPortModal
        open={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        hubStatus={hubStatus}
        onRefreshStatus={refreshBackend}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
