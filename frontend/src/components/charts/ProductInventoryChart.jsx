/**
 * ============================================================================
 * Graph 4: Upcycled MLP Product Stock & Valuation (Horizontal Bar Chart)
 * ============================================================================
 * Component: frontend/src/components/charts/ProductInventoryChart.jsx
 * Data Source: GET /api/analytics/product-inventory
 * 
 * Visualization:
 *   Horizontal Bar Chart showing ready-to-dispatch quantities of durable
 *   construction composite items manufactured from shredded rural MLP:
 *   - Heavy-Duty Paver Blocks: For MGNREGA / CC rural roads
 *   - 6ft Fencing Posts: For farm orchards & boundary protection
 *   - Interlocking Roof Tiles: For rural community sheds
 * ============================================================================
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

export default function ProductInventoryChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading upcycled inventory stock...</span>
      </div>
    );
  }

  const totalValuation = data.reduce((acc, curr) => acc + (curr.inventory_value_inr || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[180px]">
          <div className="font-bold text-slate-900 text-sm">{item.displayName}</div>
          <div className="mt-2 text-xs text-slate-600">
            Available Warehouse Stock: <strong className="text-slate-900 text-sm">{item.stock_units.toLocaleString('en-IN')} units</strong>
          </div>
          <div className="text-xs text-slate-600">
            Govt / Contractor Unit Price: <strong className="text-emerald-700">₹{item.unit_price_inr}</strong>
          </div>
          <div className="mt-1 pt-1 border-t text-xs font-semibold text-indigo-700">
            Stock Valuation: ₹{item.inventory_value_inr.toLocaleString('en-IN')}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Upcycled MLP Product Stock</h3>
          <p className="text-xs text-slate-500">
            Warehouse Valuation: <strong className="text-indigo-700">₹{totalValuation.toLocaleString('en-IN')}</strong>
          </p>
        </div>
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          PWMU Finished Goods
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 15, right: 25, left: 20, bottom: 15 }}
          >
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis
              type="category"
              dataKey="displayName"
              width={130}
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="stock_units" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || '#6366F1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
