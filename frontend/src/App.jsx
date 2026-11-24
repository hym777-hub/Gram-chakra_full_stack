/**
 * ============================================================================
 * GramChakra Frontend - Master Application Root Component
 * ============================================================================
 * File: frontend/src/App.jsx
 * Context: SBM-G Rural Solid Waste & MLP Management System
 * 
 * Features:
 *   - Offline State Management (Physical + Simulated Toggle)
 *   - IndexedDB Sync Queue Auto-Reconciliation
 *   - URL Hash & Refresh Persistence (#dashboard, #logger, #routes, etc.)
 *   - Presenter Quick-Tour Navigation Banner for Live Presentations
 *   - Fallback Data Resiliency for Cloud/Vercel Demos
 *   - 5 Main Navigation Views:
 *     1. Executive Dashboard (4 Recharts live visual analytics)
 *     2. 4-Stream Low-Bandwidth Waste Logger (with offline queue)
 *     3. Dynamic Route Optimizer (Interactive Leaflet Map with custom SVG pins)
 *     4. PWMU Upcycling & Batch Conversion Wizard
 *     5. Contractor & Gram Panchayat Forward Linkages Marketplace
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardView from './components/views/DashboardView';
import WasteLoggerView from './components/views/WasteLoggerView';
import ClusterMap from './components/ClusterMap';
import PWMUProcessingView from './components/views/PWMUProcessingView';
import MarketplaceView from './components/views/MarketplaceView';

import { getPendingCount, flushQueue } from './utils/offlineQueue';

// Fallback Rural Cluster Dataset (ensures live demo never breaks even if remote server is unreachable)
const FALLBACK_VILLAGES = [
  { id: 'VIL_01', name: 'Rampur Kalan', panchayat_name: 'Rampur GP', block_name: 'Phanda Block', latitude: 23.2850, longitude: 77.4320, current_fill_percent: 88.0 },
  { id: 'VIL_02', name: 'Shivgarh', panchayat_name: 'Shivgarh GP', block_name: 'Phanda Block', latitude: 23.2210, longitude: 77.3910, current_fill_percent: 92.0 },
  { id: 'VIL_03', name: 'Barkheda Bondar', panchayat_name: 'Barkheda GP', block_name: 'Phanda Block', latitude: 23.3100, longitude: 77.3750, current_fill_percent: 78.0 },
  { id: 'VIL_04', name: 'Devnagar', panchayat_name: 'Devnagar GP', block_name: 'Phanda Block', latitude: 23.2050, longitude: 77.4560, current_fill_percent: 84.0 },
  { id: 'VIL_05', name: 'Anandpur Khurd', panchayat_name: 'Anandpur GP', block_name: 'Phanda Block', latitude: 23.2920, longitude: 77.4810, current_fill_percent: 76.0 },
  { id: 'VIL_06', name: 'Kalyanpur', panchayat_name: 'Kalyanpur GP', block_name: 'Phanda Block', latitude: 23.1890, longitude: 77.3620, current_fill_percent: 35.0 },
  { id: 'VIL_07', name: 'Sundarpur', panchayat_name: 'Sundarpur GP', block_name: 'Phanda Block', latitude: 23.3350, longitude: 77.4250, current_fill_percent: 42.0 },
  { id: 'VIL_08', name: 'Mohanpur', panchayat_name: 'Mohanpur GP', block_name: 'Phanda Block', latitude: 23.1650, longitude: 77.4200, current_fill_percent: 22.0 },
  { id: 'VIL_09', name: 'Govindgarh', panchayat_name: 'Govindgarh GP', block_name: 'Phanda Block', latitude: 23.2420, longitude: 77.5100, current_fill_percent: 55.0 },
  { id: 'VIL_10', name: 'Kishanpur', panchayat_name: 'Kishanpur GP', block_name: 'Phanda Block', latitude: 23.3050, longitude: 77.5300, current_fill_percent: 48.0 }
];

const FALLBACK_DEPOT = {
  id: 'DEPOT_00',
  name: 'Central PWMU Block Processing Depot',
  panchayat_name: 'Block HQ Cluster',
  block_name: 'Phanda Block',
  latitude: 23.2599,
  longitude: 77.4126,
  current_fill_percent: 0.0,
  type: 'DEPOT'
};

const VALID_TABS = ['dashboard', 'logger', 'routes', 'processing', 'marketplace'];

export default function App() {
  // Read initial tab from URL hash or localStorage
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (VALID_TABS.includes(hash)) return hash;
    const stored = localStorage.getItem('gramchakra_active_tab');
    if (VALID_TABS.includes(stored)) return stored;
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isPhysicallyOnline, setIsPhysicallyOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const [villages, setVillages] = useState(FALLBACK_VILLAGES);
  const [depot, setDepot] = useState(FALLBACK_DEPOT);

  // Sync tab changes with URL hash & localStorage
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = `#${tabId}`;
    localStorage.setItem('gramchakra_active_tab', tabId);
  };

  // Listen to browser hash navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 1. Physical Network Status Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsPhysicallyOnline(true);
      triggerAutoFlush();
    };

    const handleOffline = () => {
      setIsPhysicallyOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of pending queue
    updatePendingBadge();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Fetch Village Cluster & Central Depot (with fallback safety)
  const fetchClusterMetadata = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/villages'),
        fetch('/api/villages/depot')
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        if (vData.success && Array.isArray(vData.data) && vData.data.length > 0) {
          setVillages(vData.data);
        }
      }

      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.success && dData.data) {
          setDepot(dData.data);
        }
      }
    } catch (err) {
      console.warn('Backend offline, running with resilient SBM-G demo cluster dataset:', err);
    }
  };

  useEffect(() => {
    fetchClusterMetadata();
  }, []);

  // 3. Queue Management
  const updatePendingBadge = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (e) {
      console.warn('Error reading pending queue count:', e);
    }
  };

  const triggerAutoFlush = async () => {
    const isOffline = isSimulatedOffline || !navigator.onLine;
    if (isOffline) return;

    const count = await getPendingCount();
    if (count > 0) {
      setFlushing(true);
      const res = await flushQueue();
      setFlushing(false);
      updatePendingBadge();
      fetchClusterMetadata();
    }
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);

    // If toggled back to online, auto-flush any buffered logs
    if (!nextState && isPhysicallyOnline) {
      setTimeout(() => triggerAutoFlush(), 300);
    }
  };

  const handleManualFlush = async () => {
    setFlushing(true);
    await flushQueue();
    setFlushing(false);
    updatePendingBadge();
    fetchClusterMetadata();
  };

  const tourSteps = [
    { id: 'dashboard', num: '1', title: 'Executive KPIs', desc: '4 Recharts live financial & circularity analytics' },
    { id: 'logger', num: '2', title: '4-Stream Logger', desc: 'Low-bandwidth field entry with IndexedDB queue' },
    { id: 'routes', num: '3', title: '2-Opt Route GIS', desc: 'Demand-based dynamic collection route optimization' },
    { id: 'processing', num: '4', title: 'PWMU Upcycling', desc: 'Raw MLP conversion into Pavers, Posts & Roof Tiles' },
    { id: 'marketplace', num: '5', title: 'Forward Linkages', desc: 'Panchayat & contractor procurement portal' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation & Offline Status Controls */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        isPhysicallyOnline={isPhysicallyOnline}
        pendingCount={pendingCount}
        onFlushQueue={handleManualFlush}
        flushing={flushing}
      />

      {/* Presenter Guided Tour Stepper Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-2 px-4 shadow-inner no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-extrabold text-emerald-400 uppercase tracking-wider flex items-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Live Demo Tour:
            </span>
            <span className="text-slate-400 hidden md:inline">Follow the SBM-G operational workflow</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {tourSteps.map((step) => {
              const isActive = activeTab === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => handleTabChange(step.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={step.desc}
                >
                  <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}

        {activeTab === 'logger' && (
          <WasteLoggerView
            villages={villages}
            isSimulatedOffline={isSimulatedOffline}
            isPhysicallyOnline={isPhysicallyOnline}
            onLogSaved={() => {
              fetchClusterMetadata();
              updatePendingBadge();
            }}
            onQueueUpdated={updatePendingBadge}
          />
        )}

        {activeTab === 'routes' && (
          <ClusterMap
            villages={villages}
            depot={depot}
            onRouteGenerated={() => fetchClusterMetadata()}
          />
        )}

        {activeTab === 'processing' && (
          <PWMUProcessingView onBatchCreated={() => fetchClusterMetadata()} />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceView onOrderPlaced={() => fetchClusterMetadata()} />
        )}
      </main>

      {/* Academic / Government Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">GramChakra SBM-G Platform</span>
            <span>•</span>
            <span>Swachh Bharat Mission (Gramin) Phase II - Solid Waste Management</span>
          </div>
          <div className="text-slate-400">
            Plastic Waste Management Unit (PWMU) / Material Recovery Facility (MRF) Operations • Central MP Block Cluster
          </div>
        </div>
      </footer>
    </div>
  );
}