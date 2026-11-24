/**
 * ============================================================================
 * GramChakra Frontend - Interactive Cluster & Dynamic Route Leaflet Map
 * ============================================================================
 * Component: frontend/src/components/ClusterMap.jsx
 * Dependencies: Leaflet, Lucide Icons
 * 
 * Visualization:
 *   Renders an OpenStreetMap centered on the rural SBM-G cluster.
 *   - Custom L.divIcon inline SVG markers (eliminates broken PNG asset paths):
 *     • Central Depot: Blue marker with PWMU factory icon
 *     • High Fill (>= 75%): Red pulsing marker (Immediate pickup candidate)
 *     • Medium Fill (50-74%): Amber marker
 *     • Low Fill (< 50%): Green marker
 *   - Threshold Slider (50% - 90%): Dynamically controls eligible stops
 *   - Polyline Overlay: Visualizes optimized TSP path from Depot -> Stops -> Depot
 *   - O&M Fuel & Carbon Savings Card: Displays real-time INR and CO2 avoided
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Fuel, Leaf, Milestone, Navigation, Play, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ClusterMap({ villages = [], depot = null, onRouteGenerated = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [threshold, setThreshold] = useState(75);
  const [optimizing, setOptimizing] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeMessage, setRouteMessage] = useState('');

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center coordinates (Phanda Block, Central India)
    const initialCenter = depot ? [depot.latitude, depot.longitude] : [23.2599, 77.4126];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SBM-G GramChakra'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Helper to create Vite-safe custom SVG icons
  const createCustomIcon = (type, fillPercent = 0) => {
    if (type === 'DEPOT') {
      return L.divIcon({
        className: 'custom-depot-pin',
        html: `
          <div style="background-color: #1D4ED8; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(29, 78, 216, 0.5); border: 2px solid #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
    }

    const isCritical = fillPercent >= threshold;
    const isMedium = fillPercent >= 50 && fillPercent < threshold;
    const bgColor = isCritical ? '#DC2626' : isMedium ? '#F59E0B' : '#10B981';
    const animationClass = isCritical ? 'pulsing-alert-pin' : '';

    return L.divIcon({
      className: 'custom-village-pin',
      html: `
        <div class="${animationClass}" style="background-color: ${bgColor}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; box-shadow: 0 4px 8px rgba(0,0,0,0.25); border: 2px solid #ffffff;">
          <span>${Math.round(fillPercent)}%</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  // 3. Render Markers when villages or threshold changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Add Central Depot Marker
    if (depot) {
      const depotMarker = L.marker([depot.latitude, depot.longitude], {
        icon: createCustomIcon('DEPOT')
      });
      depotMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <strong style="color: #1D4ED8; font-size: 13px;">${depot.name}</strong>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Central Plastic Waste Processing Unit</div>
          <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #0F172A;">Operational Hub: Collection Vehicle Depot & Agglomerator</div>
        </div>
      `);
      markersLayerRef.current.addLayer(depotMarker);
    }

    // Add Village Markers
    villages.forEach((village) => {
      const isCritical = village.current_fill_percent >= threshold;
      const marker = L.marker([village.latitude, village.longitude], {
        icon: createCustomIcon('VILLAGE', village.current_fill_percent)
      });

      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; min-width: 170px;">
          <strong style="font-size: 13px; color: #0F172A;">${village.name}</strong>
          <div style="font-size: 11px; color: #64748B;">${village.panchayat_name} (${village.block_name})</div>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #E2E8F0;" />
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Current Shed Fill:</span>
            <strong style="color: ${isCritical ? '#DC2626' : '#10B981'};">${village.current_fill_percent}%</strong>
          </div>
          <div style="margin-top: 4px; font-size: 11px; font-weight: 600; color: ${isCritical ? '#DC2626' : '#64748B'};">
            ${isCritical ? '🚨 Pickup Threshold Breached' : '⏳ Capacity Adequate - No Action'}
          </div>
        </div>
      `);

      markersLayerRef.current.addLayer(marker);
    });
  }, [villages, depot, threshold]);

  // 4. Trigger Route Optimization
  const handleOptimizeRoute = async () => {
    try {
      setOptimizing(true);
      setRouteMessage('');

      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: Number(threshold),
          vehicle_no: 'MP-04-GA-4501 (Tata Ace SBM-G Tipper)'
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Route optimization failed');
      }

      if (!data.action_required) {
        setRouteMessage(data.message);
        setActiveRoute(null);
        if (routeLayerRef.current) routeLayerRef.current.clearLayers();
        return;
      }

      setActiveRoute(data.data);
      if (onRouteGenerated) onRouteGenerated(data.data);

      // Render Route Polyline on Map
      if (routeLayerRef.current && data.data && data.data.tour) {
        routeLayerRef.current.clearLayers();
        const latLngs = data.data.tour.map((p) => [p.latitude, p.longitude]);

        const polyline = L.polyline(latLngs, {
          color: '#2563EB',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(routeLayerRef.current);

        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    } catch (err) {
      console.error('Route optimization error:', err);
      setRouteMessage(err.message || 'Failed to compute dynamic route');
    } finally {
      setOptimizing(false);
    }
  };

  const criticalCount = villages.filter((v) => v.current_fill_percent >= threshold).length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[750px]">
      {/* Map Canvas */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        {/* Map Header Floating Overlay */}
        <div className="absolute top-4 left-14 z-[1000] bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 p-3 max-w-sm">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Village Cluster GIS</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {villages.length} rural aggregation sheds monitored around Central PWMU.
          </div>
          <div className="mt-2 flex items-center space-x-3 text-[11px]">
            <span className="flex items-center text-slate-700 font-medium">
              <span className="h-3 w-3 rounded-full bg-blue-600 mr-1 inline-block"></span> PWMU Depot
            </span>
            <span className="flex items-center text-red-600 font-bold">
              <span className="h-3 w-3 rounded-full bg-red-600 mr-1 inline-block"></span> ≥{threshold}% Critical ({criticalCount})
            </span>
            <span className="flex items-center text-emerald-600 font-medium">
              <span className="h-3 w-3 rounded-full bg-emerald-500 mr-1 inline-block"></span> &lt;{threshold}% Normal
            </span>
          </div>
        </div>

        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="flex-1 w-full h-full" />
      </div>

      {/* Optimization Control & Dispatch Manifest Sidebar */}
      <div className="w-full lg:w-96 flex flex-col space-y-4 overflow-y-auto">
        {/* Route Optimization Configuration Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dynamic TSP Dispatch</h3>
                <p className="text-[11px] text-slate-500">Demand-Gated Pickup Optimizer</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              SBM-G O&M
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Dynamic Fill Threshold</span>
                <span className="text-red-600 font-bold">{threshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>50% (High Frequency)</span>
                <span>75% (Recommended)</span>
                <span>90% (Strict Max)</span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Total Cluster Sheds:</span>
                <strong className="text-slate-800">{villages.length}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Actionable Sheds (≥{threshold}%):</span>
                <strong className={criticalCount > 0 ? 'text-red-600' : 'text-slate-800'}>
                  {criticalCount} sheds
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vehicles Available:</span>
                <strong className="text-emerald-700">1 (3.5T Rural LCV)</strong>
              </div>
            </div>

            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Computing Nearest-Neighbor + 2-Opt...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Compute Dynamic Optimal Route</span>
                </>
              )}
            </button>

            {routeMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{routeMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Realized Fuel & Carbon Savings Card */}
        {activeRoute && activeRoute.metrics && (
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-emerald-400" />
                <h4 className="font-bold text-sm">O&M Resource Savings</h4>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center">
                  <Milestone className="h-3.5 w-3.5 mr-1 text-blue-400" /> Dist Saved
                </div>
                <div className="text-lg font-extrabold text-white mt-1">
                  {activeRoute.metrics.distance_saved_km} <span className="text-xs font-normal text-slate-300">km</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  vs {activeRoute.metrics.baseline_static_distance_km} km static
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center">
                  <Fuel className="h-3.5 w-3.5 mr-1 text-amber-400" /> Fuel Saved
                </div>
                <div className="text-lg font-extrabold text-white mt-1">
                  {activeRoute.metrics.fuel_savings_liters} <span className="text-xs font-normal text-slate-300">Liters</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-bold mt-0.5">
                  ₹{activeRoute.metrics.fuel_savings_inr} Saved
                </div>
              </div>
            </div>

            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-200">Carbon Footprint Avoided:</span>
              <strong className="text-emerald-300 text-sm font-extrabold">
                {activeRoute.metrics.co2_savings_kg} kg CO₂
              </strong>
            </div>
          </div>
        )}

        {/* Turn-by-Turn Driver Dispatch Itinerary */}
        {activeRoute && activeRoute.stops && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex-1">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Driver Itinerary ({activeRoute.stops.length} Stops)</span>
              <span className="text-[11px] font-semibold text-slate-500">Route: {activeRoute.id}</span>
            </h4>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
              {/* Start Depot */}
              <div className="relative flex items-start space-x-3 text-xs pl-1">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">
                  D
                </span>
                <div>
                  <strong className="text-slate-900">{depot ? depot.name : 'Central PWMU Depot'}</strong>
                  <div className="text-[10px] text-slate-500">Origin Departure & Vehicle Weighment</div>
                </div>
              </div>

              {/* Stops */}
              {activeRoute.stops.map((stop) => (
                <div key={stop.stop_sequence} className="relative flex items-start space-x-3 text-xs pl-1">
                  <span className="h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">
                    {stop.stop_sequence}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900">{stop.village_name}</strong>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {stop.village_fill_at_dispatch}% Fill
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{stop.panchayat_name}</div>
                  </div>
                </div>
              ))}

              {/* End Depot */}
              <div className="relative flex items-start space-x-3 text-xs pl-1">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">
                  D
                </span>
                <div>
                  <strong className="text-slate-900">{depot ? depot.name : 'Central PWMU Depot'}</strong>
                  <div className="text-[10px] text-slate-500">Return & Unload Segregated Waste at MRF</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
