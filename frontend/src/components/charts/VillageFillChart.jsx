/**
 * ============================================================================
 * Graph 2: Village Shed Fill Levels with 75% Threshold (Bar Chart)
 * ============================================================================
 * Component: frontend/src/components/charts/VillageFillChart.jsx
 * Data Source: GET /api/analytics/village-fills
 * 
 * Visualization:
 *   Vertical Bar Chart displaying current waste accumulation (%) in each rural
 *   collection shed, featuring a horizontal ReferenceLine at 75%.
 *   Color Coding:
 *   - Red (>= 75%): Actionable critical breach requiring dynamic pickup.
 *   - Amber (50% - 74%): Moderate accumulation.
 *   - Green (< 50%): Under capacity, pickup deferred to prevent fuel waste.
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
  ReferenceLine,
  Cell
} from 'recharts';

export default function VillageFillChart({ data = [], threshold = 75.0, loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading village shed capacities...</span>
      </div>
    );
  }

  const criticalCount = data.filter((v) => v.fill_percent >= threshold).length;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isUrgent = item.fill_percent >= threshold;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
          <div className="text-xs text-slate-500">{item.panchayat}</div>
          <div className="mt-2 flex items-center justify-between space-x-3">
            <span className="text-xs font-medium text-slate-600">Shed Fill Level:</span>
            <span className={`text-sm font-extrabold ${isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
              {item.fill_percent}%
            </span>
          </div>
          {isUrgent && (
            <div className="mt-1 text-[11px] font-semibold text-red-600 flex items-center">
              🚨 Exceeds {threshold}% Threshold - Route Pickup Active
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Village Collection Shed Capacity</h3>
          <p className="text-xs text-slate-500">
            Actionable Threshold: <strong className="text-red-600">≥ {threshold}%</strong> ({criticalCount} sheds critical)
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-red-600 mr-1"></span> ≥75%</span>
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500 mr-1"></span> 50-74%</span>
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 mr-1"></span> &lt;50%</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={50}
              tick={{ fontSize: 10, fill: '#64748B' }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold}
              stroke="#DC2626"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Pickup Trigger (${threshold}%)`,
                position: 'top',
                fill: '#DC2626',
                fontSize: 10,
                fontWeight: 700
              }}
            />
            <Bar dataKey="fill_percent" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.bar_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
