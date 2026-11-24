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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isPhysicallyOnline, setIsPhysicallyOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const [villages, setVillages] = useState([]);
  const [depot, setDepot] = useState(null);

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

  // 2. Fetch Village Cluster & Central Depot
  const fetchClusterMetadata = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/villages'),
        fetch('/api/villages/depot')
      ]);

      const vData = await vRes.json();
      const dData = await dRes.json();

      if (vData.success) setVillages(vData.data);
      if (dData.success) setDepot(dData.data);
    } catch (err) {
      console.warn('Could not fetch village metadata:', err);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation & Offline Status Controls */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        isPhysicallyOnline={isPhysicallyOnline}
        pendingCount={pendingCount}
        onFlushQueue={handleManualFlush}
        flushing={flushing}
      />

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

      {/* Academic Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">GramChakra</span>
            <span>•</span>
            <span>Swachh Bharat Mission (Gramin) Phase II - Solid Waste Management</span>
          </div>
          <div className="text-slate-400">
            Plastic Waste Management Unit (PWMU) / Material Recovery Facility (MRF) Operations
          </div>
        </div>
      </footer>
    </div>
  );
}
