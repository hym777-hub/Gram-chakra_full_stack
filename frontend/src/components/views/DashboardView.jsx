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
  Sparkles,
  Award,
  ShieldCheck,
  Leaf
} from 'lucide-react';

import StreamBreakdownChart from '../charts/StreamBreakdownChart';
import VillageFillChart from '../charts/VillageFillChart';
import FinancialLedgerChart from '../charts/FinancialLedgerChart';
import ProductInventoryChart from '../charts/ProductInventoryChart';

// Resilient SBM-G Demo Datasets for Cloud/Vercel presentation stability
const FALLBACK_KPIS = {
  total_waste_collected_kg: 18450,
  total_mlp_diverted_kg: 4820,
  total_fuel_savings_inr: 28540,
  total_co2_saved_kg: 830,
  total_routes_optimized: 18,
  total_revenue_inr: 534200,
  total_expenses_inr: 287100,
  net_financial_margin_inr: 247100,
  cost_recovery_percent: 186,
  total_units_manufactured: 5680,
  critical_sheds_needing_pickup: 5
};

const FALLBACK_STREAM = [
  { name: 'Wet Waste (Organic)', key: 'wet', value: 8750, fill: '#10B981', color: '#10B981' },
  { name: 'Dry Recyclables (PET/Metal)', key: 'dry', value: 4880, fill: '#3B82F6', color: '#3B82F6' },
  { name: 'Multi-Layer Plastic (MLP)', key: 'mlp', value: 4820, fill: '#F59E0B', color: '#F59E0B' },
  { name: 'Sanitary & Hazardous', key: 'sanitary', value: 1100, fill: '#EF4444', color: '#EF4444' }
];

const FALLBACK_VILLAGES_FILL = [
  { village_id: 'VIL_02', name: 'Shivgarh', panchayat: 'Shivgarh GP', fill_percent: 92, is_critical: true, bar_color: '#DC2626' },
  { village_id: 'VIL_01', name: 'Rampur Kalan', panchayat: 'Rampur GP', fill_percent: 88, is_critical: true, bar_color: '#DC2626' },
  { village_id: 'VIL_04', name: 'Devnagar', panchayat: 'Devnagar GP', fill_percent: 84, is_critical: true, bar_color: '#DC2626' },
  { village_id: 'VIL_03', name: 'Barkheda Bondar', panchayat: 'Barkheda GP', fill_percent: 78, is_critical: true, bar_color: '#DC2626' },
  { village_id: 'VIL_05', name: 'Anandpur Khurd', panchayat: 'Anandpur GP', fill_percent: 76, is_critical: true, bar_color: '#DC2626' },
  { village_id: 'VIL_09', name: 'Govindgarh', panchayat: 'Govindgarh GP', fill_percent: 55, is_critical: false, bar_color: '#F59E0B' },
  { village_id: 'VIL_10', name: 'Kishanpur', panchayat: 'Kishanpur GP', fill_percent: 48, is_critical: false, bar_color: '#10B981' },
  { village_id: 'VIL_07', name: 'Sundarpur', panchayat: 'Sundarpur GP', fill_percent: 42, is_critical: false, bar_color: '#10B981' },
  { village_id: 'VIL_06', name: 'Kalyanpur', panchayat: 'Kalyanpur GP', fill_percent: 35, is_critical: false, bar_color: '#10B981' },
  { village_id: 'VIL_08', name: 'Mohanpur', panchayat: 'Mohanpur GP', fill_percent: 22, is_critical: false, bar_color: '#10B981' }
];

const FALLBACK_MONTHLY = [
  { month: '2026-06', revenue_inr: 68500, expenses_inr: 46000, net_margin_inr: 22500, cost_recovery_percent: 149 },
  { month: '2026-07', revenue_inr: 74200, expenses_inr: 47300, net_margin_inr: 26900, cost_recovery_percent: 157 },
  { month: '2026-08', revenue_inr: 82000, expenses_inr: 47400, net_margin_inr: 34600, cost_recovery_percent: 173 },
  { month: '2026-09', revenue_inr: 89400, expenses_inr: 47000, net_margin_inr: 42400, cost_recovery_percent: 190 },
  { month: '2026-10', revenue_inr: 104500, expenses_inr: 47600, net_margin_inr: 56900, cost_recovery_percent: 220 },
  { month: '2026-11', revenue_inr: 115600, expenses_inr: 47600, net_margin_inr: 68000, cost_recovery_percent: 243 }
];

const FALLBACK_INVENTORY = [
  { id: 'PROD_PAVER', product_type: 'PAVER_BLOCK', displayName: 'Paver Blocks (Pieces)', stock_units: 3250, unit_price_inr: 45, inventory_value_inr: 146250, fill: '#F59E0B' },
  { id: 'PROD_ROOF', product_type: 'ROOF_TILE', displayName: 'Roof Tiles (Units)', stock_units: 920, unit_price_inr: 180, inventory_value_inr: 165600, fill: '#6366F1' },
  { id: 'PROD_FENCE', product_type: 'FENCING_POST', displayName: 'Fencing Posts (6ft Units)', stock_units: 420, unit_price_inr: 320, inventory_value_inr: 134400, fill: '#10B981' }
];

export default function DashboardView() {
  const [kpis, setKpis] = useState(FALLBACK_KPIS);
  const [streamData, setStreamData] = useState(FALLBACK_STREAM);
  const [totalStreamKg, setTotalStreamKg] = useState(19550);
  const [villageData, setVillageData] = useState(FALLBACK_VILLAGES_FILL);
  const [monthlyData, setMonthlyData] = useState(FALLBACK_MONTHLY);
  const [inventoryData, setInventoryData] = useState(FALLBACK_INVENTORY);
  const [loading, setLoading] = useState(false);

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

      if (kpiRes.ok) {
        const kpiJson = await kpiRes.json();
        if (kpiJson.success) setKpis(kpiJson.data);
      }

      if (streamRes.ok) {
        const streamJson = await streamRes.json();
        if (streamJson.success && streamJson.data) {
          setStreamData(streamJson.data);
          setTotalStreamKg(streamJson.total_kg || 19550);
        }
      }

      if (villageRes.ok) {
        const villageJson = await villageRes.json();
        if (villageJson.success && villageJson.data) setVillageData(villageJson.data);
      }

      if (monthlyRes.ok) {
        const monthlyJson = await monthlyRes.json();
        if (monthlyJson.success && monthlyJson.data) setMonthlyData(monthlyJson.data);
      }

      if (inventoryRes.ok) {
        const inventoryJson = await inventoryRes.json();
        if (inventoryJson.success && inventoryJson.data) setInventoryData(inventoryJson.data);
      }
    } catch (err) {
      console.warn('Analytics API unavailable, displaying pre-seeded SBM-G demo metrics:', err);
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

      {/* SBM-G High-Impact Pillars Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
              <Leaf className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white block">48-60% Fuel Reduction</span>
              <p className="text-slate-400 text-[11px]">2-Opt TSP dynamic collection eliminates empty runs</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
              <Recycle className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white block">100% Zero-Landfill MLP Circularity</span>
              <p className="text-slate-400 text-[11px]">Upcycled into high-strength rural paver blocks & posts</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0 mt-0.5">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white block">186% Cost Recovery (Self-Sustaining)</span>
              <p className="text-slate-400 text-[11px]">Forward marketplace revenue funds collection fuel & wages</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
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
              {kpis.total_mlp_diverted_kg.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-500">kg</span>
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Upcycled into Pavers & Posts
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
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
              ₹{kpis.total_fuel_savings_inr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Avoided {kpis.total_co2_saved_kg} kg CO₂ emissions ({kpis.total_routes_optimized || 5} tours)
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
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
              {kpis.cost_recovery_percent}%
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Self-Sustainable (Zero Grant Dependency)
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
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
              {kpis.critical_sheds_needing_pickup} <span className="text-sm font-normal text-slate-500">sheds</span>
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