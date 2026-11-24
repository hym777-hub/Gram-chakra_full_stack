/**
 * ============================================================================
 * GramChakra Frontend - Header & 1-Click Offline Demo Controls
 * ============================================================================
 * Component: frontend/src/components/Header.jsx
 * Context: SBM-G Swachh Bharat Mission (Gramin) Operations Hub
 * 
 * Features:
 *   - 1-Click "Simulate Offline Mode" toggle switch for seamless offline demo.
 *   - Live Sync Status Badge: Online / Simulated Offline / Offline.
 *   - "X Pending Sync" pill with a 1-click manual "Flush Sync Queue Now" trigger.
 *   - 5-tab responsive navigation.
 * ============================================================================
 */

import React from 'react';
import {
  Recycle,
  LayoutDashboard,
  Scale,
  MapPin,
  Factory,
  ShoppingBag,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RotateCw,
  Zap
} from 'lucide-react';

export default function Header({
  activeTab = 'dashboard',
  onTabChange,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isPhysicallyOnline,
  pendingCount = 0,
  onFlushQueue,
  flushing = false
}) {
  const isEffectivelyOffline = isSimulatedOffline || !isPhysicallyOnline;

  const tabs = [
    { id: 'dashboard', label: 'Analytics & KPIs', icon: LayoutDashboard },
    { id: 'logger', label: '4-Stream Logger', icon: Scale },
    { id: 'routes', label: 'Route Optimizer', icon: MapPin },
    { id: 'processing', label: 'PWMU Upcycling', icon: Factory },
    { id: 'marketplace', label: 'Buyer Portal', icon: ShoppingBag }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">GramChakra</h1>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                SBM-G Phase II
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Multi-Layer Plastic (MLP) Management & Dynamic Rural Route Optimization
            </p>
          </div>
        </div>

        {/* 1-Click Offline Demo Controls & Live Sync Status Badge */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 1-Click Simulate Offline Mode Switch */}
          <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Simulate Offline:</span>
            <button
              onClick={onToggleSimulatedOffline}
              type="button"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSimulatedOffline ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isSimulatedOffline ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Live Sync Status Indicator */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              isSimulatedOffline
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : !isPhysicallyOnline
                ? 'bg-red-50 text-red-800 border-red-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <CloudOff className="h-4 w-4 text-amber-600 animate-pulse" />
                <span>Simulated Offline</span>
              </>
            ) : !isPhysicallyOnline ? (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span>No Connection</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-emerald-600" />
                <span>Cloud Online</span>
              </>
            )}
          </div>

          {/* Pending Sync Pill & 1-Click Flush Action */}
          {pendingCount > 0 && (
            <button
              onClick={onFlushQueue}
              disabled={flushing || isEffectivelyOffline}
              title={isEffectivelyOffline ? 'Switch to Online to flush queue' : 'Click to flush queued logs now'}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${flushing ? 'animate-spin' : ''}`} />
              <span>
                {flushing ? 'Flushing...' : `${pendingCount} Pending Sync`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-2.5 px-3.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
