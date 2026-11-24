/**
 * ============================================================================
 * GramChakra Frontend - Executive Dashboard & 4 Recharts Analytics Grid
 * ============================================================================
 * Component: frontend/src/components/views/DashboardView.jsx
 * Data Sources:
 *   - GET /api/analytics/kpis
 *   - GET /api/analytics/stream-breakdown    (Graph 1)
 *   - GET /api/analytics/village-fills      (Graph 2)
 *   - GET /api/analytics/monthly-financials (Graph 3)
 *   - GET /api/analytics/product-inventory  (Graph 4)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Recycle,
  Fuel,
  IndianRupee,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

import StreamBreakdownChart from '../charts/StreamBreakdownChart';
import VillageFillChart from '../charts/VillageFillChart';
import FinancialLedgerChart from '../charts/FinancialLedgerChart';
import ProductInventoryChart from '../charts/ProductInventoryChart';

export default function DashboardView() {
  const [kpis, setKpis] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [totalStreamKg, setTotalStreamKg] = useState(0);
  const [villageData, setVillageData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const [kpiRes, streamRes, villageRes, monthlyRes, inventoryRes] = await Promise.all([
        fetch('/api/analytics/kpis'),
        fetch('/api/analytics/stream-breakdown'),
        fetch('/api/analytics/village-fills'),
        fetch('/api/analytics/monthly-financials'),
        fetch('/api/analytics/product-inventory')
      ]);

      const kpiJson = await kpiRes.json();
      const streamJson = await streamRes.json();
      const villageJson = await villageRes.json();
      const monthlyJson = await monthlyRes.json();
      const inventoryJson = await inventoryRes.json();

      if (kpiJson.success) setKpis(kpiJson.data);
      if (streamJson.success) {
        setStreamData(streamJson.data);
        setTotalStreamKg(streamJson.total_kg);
      }
      if (villageJson.success) setVillageData(villageJson.data);
      if (monthlyJson.success) setMonthlyData(monthlyJson.data);
      if (inventoryJson.success) setInventoryData(inventoryJson.data);
    } catch (err) {
      console.error('Failed to load analytics dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            SBM-G PWMU Command Center & Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time multi-village tracking, dynamic route savings, and O&M financial self-sustainability
          </p>
        </div>

        <button
          onClick={fetchAllAnalytics}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              MLP Diverted from Dumps
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Recycle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-900">
              {kpis ? kpis.total_mlp_diverted_kg.toLocaleString('en-IN') : '...'} <span className="text-sm font-normal text-slate-500">kg</span>
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Upcycled into Pavers & Posts
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Route Fuel Cost Savings
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Fuel className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-emerald-600">
              ₹{kpis ? kpis.total_fuel_savings_inr.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Avoided {kpis ? kpis.total_co2_saved_kg : '0'} kg CO₂ emissions
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              O&M Cost Recovery Ratio
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-blue-700">
              {kpis ? kpis.cost_recovery_percent : '...'}%
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Self-Sustainable (Zero Grant Dependency)
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sheds Requiring Pickup
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertOctagon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-red-600">
              {kpis ? kpis.critical_sheds_needing_pickup : '0'} <span className="text-sm font-normal text-slate-500">sheds</span>
            </div>
            <div className="text-xs text-red-600 font-semibold mt-1">
              Breached ≥ 75% Fill Threshold
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Recharts Graphs Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: 4-Stream Waste Segregation (Pie/Donut) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <StreamBreakdownChart data={streamData} totalKg={totalStreamKg} loading={loading} />
        </div>

        {/* Graph 2: Village Shed Fill Levels with 75% Threshold (Bar Chart) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <VillageFillChart data={villageData} threshold={75.0} loading={loading} />
        </div>

        {/* Graph 3: 6-Month O&M Financial Sustainability Ledger (Composed Bar + Line) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <FinancialLedgerChart data={monthlyData} loading={loading} />
        </div>

        {/* Graph 4: Upcycled Product Stock & Valuation (Horizontal Bar Chart) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <ProductInventoryChart data={inventoryData} loading={loading} />
        </div>
      </div>
    </div>
  );
}
