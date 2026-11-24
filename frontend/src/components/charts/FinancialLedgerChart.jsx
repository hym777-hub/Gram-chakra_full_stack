/**
 * ============================================================================
 * Graph 3: Monthly O&M Financial Sustainability Ledger (Composed Chart)
 * ============================================================================
 * Component: frontend/src/components/charts/FinancialLedgerChart.jsx
 * Data Source: GET /api/analytics/monthly-financials
 * 
 * Visualization:
 *   Composed Bar + Line Chart tracking 6 months of rural PWMU operational economics:
 *   - Stacked Bars: Sales Revenue (Green) vs Operating Expenses (Red/Slate)
 *   - Line: Net Operating Margin (Blue Trendline)
 *   - Metric: Cost Recovery Ratio (% self-sustainability)
 * ============================================================================
 */

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export default function FinancialLedgerChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading financial sustainability ledger...</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthData = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[190px]">
          <div className="font-bold text-slate-900 text-sm border-b pb-1 mb-2">Month: {label}</div>
          <div className="flex justify-between text-xs py-0.5">
            <span className="text-emerald-700 font-medium">Product Sales & Scrap:</span>
            <span className="font-bold text-slate-800">₹{monthData.revenue_inr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs py-0.5">
            <span className="text-slate-600 font-medium">O&M Expenses (Fuel/Wages):</span>
            <span className="font-bold text-slate-800">₹{monthData.expenses_inr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-t mt-1 font-extrabold">
            <span className={monthData.net_margin_inr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              Net Margin:
            </span>
            <span className={monthData.net_margin_inr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {monthData.net_margin_inr >= 0 ? '+' : ''}₹{monthData.net_margin_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Cost Recovery: <strong className="text-slate-800">{monthData.cost_recovery_percent}%</strong>
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
          <h3 className="font-bold text-slate-900 text-base">O&M Cost Recovery & Financial Self-Sustainability</h3>
          <p className="text-xs text-slate-500">
            6-Month Cash Flow (Product Revenue vs Vehicle Fuel & Operator Wages)
          </p>
        </div>
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          GP O&M Ledger
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} iconType="circle" />
            <Bar dataKey="revenue_inr" name="Revenue (Credits)" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses_inr" name="O&M Costs (Debits)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="net_margin_inr"
              name="Net Margin"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563EB' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
