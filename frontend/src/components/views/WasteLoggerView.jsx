/**
 * ============================================================================
 * GramChakra Frontend - 4-Stream Waste Logger View (Offline-First)
 * ============================================================================
 * Component: frontend/src/components/views/WasteLoggerView.jsx
 * Context: SBM-G Field Data Collection at Village Aggregation Sheds
 * 
 * Mechanics:
 *   - Offline-First: If browser is offline or "Simulate Offline Mode" is toggled,
 *     waste logs are queued directly in browser IndexedDB.
 *   - Auto Sync: When online, flushes queued entries with idempotent UUIDs.
 *   - Immediate Feedback: Updates shed fill levels and segregation weights.
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Scale,
  CloudOff,
  Cloud,
  CheckCircle,
  AlertCircle,
  MapPin,
  Send,
  User,
  Clock
} from 'lucide-react';
import { enqueueWasteLog, generateSyncId } from '../../utils/offlineQueue';

export default function WasteLoggerView({
  villages = [],
  isSimulatedOffline = false,
  isPhysicallyOnline = true,
  onLogSaved = null,
  onQueueUpdated = null
}) {
  const isOffline = isSimulatedOffline || !isPhysicallyOnline;

  const [selectedVillageId, setSelectedVillageId] = useState(villages[0]?.id || 'VIL_01');
  const [fillPercent, setFillPercent] = useState(85);
  const [wetKg, setWetKg] = useState('');
  const [dryKg, setDryKg] = useState('');
  const [mlPkg, setMlPkg] = useState('');
  const [sanitaryKg, setSanitaryKg] = useState('');
  const [loggedBy, setLoggedBy] = useState('Ramesh Sharma (Swachhata Doot)');

  const [statusMessage, setStatusMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVillageId) {
      alert('Please select a village aggregation point');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const payload = {
      client_sync_id: generateSyncId(),
      village_id: selectedVillageId,
      wet_waste_kg: Number(wetKg) || 0,
      dry_recyclable_kg: Number(dryKg) || 0,
      mlp_waste_kg: Number(mlPkg) || 0,
      sanitary_hazardous_kg: Number(sanitaryKg) || 0,
      recorded_fill_percent: Number(fillPercent),
      logged_by: loggedBy,
      recorded_at: new Date().toISOString()
    };

    try {
      if (isOffline) {
        // Enqueue to IndexedDB
        await enqueueWasteLog(payload);
        setStatusMessage({
          type: 'offline',
          text: `Log safely buffered in local IndexedDB offline queue (${payload.client_sync_id.substring(0, 8)}...). Will auto-flush upon reconnection.`
        });
        if (onQueueUpdated) onQueueUpdated();
      } else {
        // Direct API Post
        const res = await fetch('/api/waste-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to submit log');

        setStatusMessage({
          type: 'online',
          text: `Waste log synced directly to SQLite database for ${villages.find((v) => v.id === selectedVillageId)?.name || 'Village'}.`
        });
        if (onLogSaved) onLogSaved();
      }

      // Reset numeric inputs
      setWetKg('');
      setDryKg('');
      setMlPkg('');
      setSanitaryKg('');
    } catch (err) {
      console.error('Submission error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error recording waste log.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVillage = villages.find((v) => v.id === selectedVillageId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">4-Stream Source Waste Logger</h2>
              <p className="text-xs text-slate-500">
                Low-bandwidth field entry for Swachhata Doots & SHG Operators
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isOffline ? (
            <div className="flex items-center space-x-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <CloudOff className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>Offline Mode Active (Local IndexedDB Storage)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Cloud className="h-4 w-4 text-emerald-600" />
              <span>Online (Direct Server Sync)</span>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start space-x-3 border ${
            statusMessage.type === 'offline'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : statusMessage.type === 'online'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {statusMessage.type === 'offline' ? (
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'online' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Location & Operator Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" /> Village Aggregation Shed
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.panchayat_name}) — Current: {v.current_fill_percent}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <User className="h-3.5 w-3.5 mr-1 text-slate-500" /> Logging Field Officer
              </label>
              <input
                type="text"
                value={loggedBy}
                onChange={(e) => setLoggedBy(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Name of Swachhata Doot"
              />
            </div>
          </div>

          {/* Fill Percentage Slider */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-800">
                Current Collection Shed Fill Level (%)
              </span>
              <span
                className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                  fillPercent >= 75
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : fillPercent >= 50
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {fillPercent}% {fillPercent >= 75 ? '(Actionable Threshold Breached)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={fillPercent}
              onChange={(e) => setFillPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>0% Empty</span>
              <span className="text-red-600 font-bold">75% Dynamic Route Trigger</span>
              <span>100% Overflowing</span>
            </div>
          </div>

          {/* 4-Stream Weight Entries */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Daily Segregated Weights by Stream (Kilograms)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stream 1: Wet Waste */}
              <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800">1. Wet Organic</span>
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={wetKg}
                  onChange={(e) => setWetKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-emerald-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="text-[10px] text-emerald-700 mt-1">Compostable food & leaves</div>
              </div>

              {/* Stream 2: Dry Recyclables */}
              <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-800">2. Dry Recyclable</span>
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={dryKg}
                  onChange={(e) => setDryKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-blue-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="text-[10px] text-blue-700 mt-1">PET, paper, glass, cans</div>
              </div>

              {/* Stream 3: Multi-Layer Plastic (MLP) */}
              <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900">3. MLP Laminates</span>
                  <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={mlPkg}
                  onChange={(e) => setMlPkg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-amber-400 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <div className="text-[10px] text-amber-800 mt-1 font-medium">Chips, sachets, foils</div>
              </div>

              {/* Stream 4: Sanitary & Hazardous */}
              <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-800">4. Sanitary / Hazard</span>
                  <span className="h-3 w-3 rounded-full bg-red-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={sanitaryKg}
                  onChange={(e) => setSanitaryKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-red-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <div className="text-[10px] text-red-700 mt-1">Diapers, pesticide tins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Total Input:{' '}
            <strong className="text-slate-800">
              {(Number(wetKg) || 0) + (Number(dryKg) || 0) + (Number(mlPkg) || 0) + (Number(sanitaryKg) || 0)} kg
            </strong>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isOffline ? 'Save to Offline Queue' : 'Submit & Sync to Cloud'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
