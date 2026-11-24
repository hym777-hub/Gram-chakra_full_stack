/**
 * ============================================================================
 * Graph 1: 4-Stream Waste Segregation Breakdown (Pie / Donut Chart)
 * ============================================================================
 * Component: frontend/src/components/charts/StreamBreakdownChart.jsx
 * Data Source: GET /api/analytics/stream-breakdown
 * 
 * Visualization:
 *   Interactive Recharts Pie/Donut Chart rendering the proportion of waste
 *   segregated across rural cluster collection sheds:
 *   - Wet Waste (Organic / Composting): Green (#10B981)
 *   - Dry Recyclables (PET, Glass, Metal): Blue (#3B82F6)
 *   - Multi-Layer Plastic (MLP laminates): Amber (#F59E0B)
 *   - Sanitary & Hazardous: Red (#EF4444)
 * ============================================================================
 */

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function StreamBreakdownChart({ data = [], totalKg = 0, loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading 4-stream breakdown...</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = totalKg > 0 ? ((item.value / totalKg) * 100).toFixed(1) : 0;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.payload.fill }}></span>
            <span className="font-semibold text-slate-800 text-xs">{item.name}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {item.value.toLocaleString('en-IN')} kg
            <span className="ml-1 text-xs font-normal text-slate-500">({percentage}%)</span>
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
          <h3 className="font-bold text-slate-900 text-base">4-Stream Waste Segregation</h3>
          <p className="text-xs text-slate-500">Total Segregated: <strong className="text-slate-800">{totalKg.toLocaleString('en-IN')} kg</strong></p>
        </div>
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
          SBM-G Streams
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || '#10B981'} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-xs font-medium text-slate-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
