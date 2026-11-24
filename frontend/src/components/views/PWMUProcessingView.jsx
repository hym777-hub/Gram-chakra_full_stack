/**
 * ============================================================================
 * GramChakra Frontend - PWMU/MRF Batch Processing & Conversion View
 * ============================================================================
 * Component: frontend/src/components/views/PWMUProcessingView.jsx
 * Data Sources:
 *   - GET  /api/processing/stockpile
 *   - GET  /api/processing/batches
 *   - POST /api/processing/batches
 * 
 * SBM-G Domain Context:
 *   Non-recyclable Multi-Layer Plastic (MLP) cannot be mechanically extruded into
 *   virgin-grade pellets. This view tracks the rural agglomeration and compression
 *   molding process that turns shredded MLP + sand/fly-ash into durable infrastructure:
 *   1. Paver Blocks: 1 kg MLP + 3 kg Sand -> 3 Paver Blocks
 *   2. Fencing Posts: 4 kg MLP + 8 kg Aggregate -> 1 Fencing Post
 *   3. Roof Tiles: 1.5 kg MLP + 2.5 kg Fly Ash -> 1 Interlocking Roof Tile
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Factory,
  Boxes,
  Zap,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  TrendingUp,
  Layers
} from 'lucide-react';

const RECIPES = {
  PAVER_BLOCK: {
    name: 'Heavy-Duty Paver Block',
    mlpRatio: 0.333,
    aggregateMultiplier: 3.0,
    aggregateName: 'River Sand & Stone Dust',
    unitName: 'Pieces',
    defaultUnitPrice: 45
  },
  FENCING_POST: {
    name: 'Reinforced 6ft Fencing Post',
    mlpRatio: 4.0,
    aggregateMultiplier: 2.0,
    aggregateName: 'Crushed Mineral Aggregate',
    unitName: 'Posts',
    defaultUnitPrice: 320
  },
  ROOF_TILE: {
    name: 'Interlocking Composite Roof Tile',
    mlpRatio: 1.5,
    aggregateMultiplier: 1.67,
    aggregateName: 'Class-F Fly Ash / Slag',
    unitName: 'Tiles',
    defaultUnitPrice: 180
  }
};

export default function PWMUProcessingView({ onBatchCreated = null }) {
  const [stockpile, setStockpile] = useState({
    total_collected_mlp_kg: 0,
    total_consumed_mlp_kg: 0,
    available_stockpile_kg: 0
  });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [productType, setProductType] = useState('PAVER_BLOCK');
  const [mlpInput, setMlpInput] = useState('300');
  const [electricityKwh, setElectricityKwh] = useState('90');
  const [laborCost, setLaborCost] = useState('1800');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchProcessingData = async () => {
    try {
      setLoading(true);
      const [stockRes, batchRes] = await Promise.all([
        fetch('/api/processing/stockpile'),
        fetch('/api/processing/batches')
      ]);

      const stockData = await stockRes.json();
      const batchData = await batchRes.json();

      if (stockData.success) setStockpile(stockData.data);
      if (batchData.success) setBatches(batchData.data);
    } catch (err) {
      console.error('Error fetching processing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingData();
  }, []);

  const activeRecipe = RECIPES[productType];
  const mlpKg = Number(mlpInput) || 0;
  const estimatedAggregateKg = Math.round(mlpKg * activeRecipe.aggregateMultiplier);
  const expectedUnits = Math.floor(mlpKg / activeRecipe.mlpRatio);
  const estimatedSalesValuation = expectedUnits * activeRecipe.defaultUnitPrice;

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (mlpKg <= 0) {
      alert('Please enter a valid MLP input quantity');
      return;
    }
    if (mlpKg > stockpile.available_stockpile_kg) {
      alert(`MLP input (${mlpKg} kg) exceeds available warehouse stockpile (${stockpile.available_stockpile_kg} kg).`);
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch('/api/processing/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: productType,
          mlp_input_kg: mlpKg,
          electricity_kwh: Number(electricityKwh) || 0,
          labor_cost_inr: Number(laborCost) || 0,
          batch_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Batch creation failed');

      setFeedback({
        type: 'success',
        text: data.message
      });

      fetchProcessingData();
      if (onBatchCreated) onBatchCreated();
    } catch (err) {
      console.error('Batch error:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to execute conversion batch.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stockpile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
            <Boxes className="h-4 w-4" />
            <span>Raw Shredded MLP Stockpile</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {stockpile.available_stockpile_kg.toLocaleString('en-IN')}{' '}
            <span className="text-sm font-normal text-slate-500">kg available</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>Total Collected: {stockpile.total_collected_mlp_kg.toLocaleString('en-IN')} kg</span>
            <span>Processed: {stockpile.total_consumed_mlp_kg.toLocaleString('en-IN')} kg</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{
                width: `${
                  stockpile.total_collected_mlp_kg > 0
                    ? Math.min(100, (stockpile.available_stockpile_kg / stockpile.total_collected_mlp_kg) * 100)
                    : 0
                }%`
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <Factory className="h-4 w-4" />
            <span>Completed Production Batches</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {batches.length} <span className="text-sm font-normal text-slate-500">runs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Agglomeration & Hot Compression Hydraulic Pressing
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="h-4 w-4" />
            <span>Circularity Index</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">
            100% Zero-Landfill
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Every kg of metallized MLP is upcycled into durable infrastructure
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Batch Processing Conversion Wizard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">PWMU Upcycling Batch Conversion</h3>
              <p className="text-xs text-slate-500">
                Configure raw MLP input, aggregate matrix, and compute expected output units
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            SBM-G Circular Economy
          </span>
        </div>

        <form onSubmit={handleCreateBatch} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Product Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Recycled Product
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PAVER_BLOCK">Heavy-Duty Paver Block (1:3 Sand Ratio)</option>
                <option value="FENCING_POST">Reinforced 6ft Fencing Post (1:2 Mineral)</option>
                <option value="ROOF_TILE">Interlocking Composite Roof Tile (Fly Ash)</option>
              </select>
            </div>

            {/* MLP Input (kg) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shredded MLP Input (kg)
              </label>
              <input
                type="number"
                min="10"
                step="5"
                value={mlpInput}
                onChange={(e) => setMlpInput(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 300"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Max Available: {stockpile.available_stockpile_kg} kg
              </span>
            </div>

            {/* Electricity Consumption (kWh) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" /> Machine Power (kWh)
              </label>
              <input
                type="number"
                min="0"
                value={electricityKwh}
                onChange={(e) => setElectricityKwh(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Conversion Ratio Calculations Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
              Batch Conversion Yield & Economics (Real-time Model)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Required Additive:</span>
                <strong className="text-white text-sm block mt-0.5">{estimatedAggregateKg} kg</strong>
                <span className="text-[10px] text-slate-400">{activeRecipe.aggregateName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Expected Yield:</span>
                <strong className="text-emerald-400 text-sm block mt-0.5">
                  {expectedUnits} {activeRecipe.unitName}
                </strong>
                <span className="text-[10px] text-slate-400">QA Pass Target: 98%</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Est. Sales Value:</span>
                <strong className="text-amber-300 text-sm block mt-0.5">
                  ₹{estimatedSalesValuation.toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-slate-400">@ ₹{activeRecipe.defaultUnitPrice}/unit</span>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <RotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      <span>Execute Batch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Batches History Table */}
        <div className="border-t border-slate-200">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Batch Conversion Audit Log ({batches.length} Records)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-6">Batch Code</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">MLP Input</th>
                  <th className="py-2.5 px-4">Aggregate Input</th>
                  <th className="py-2.5 px-4">Output Units</th>
                  <th className="py-2.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-6 font-mono font-bold text-slate-800">{b.batch_code}</td>
                    <td className="py-3 px-4">{b.batch_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {RECIPES[b.product_type]?.name || b.product_type}
                    </td>
                    <td className="py-3 px-4 text-amber-700 font-bold">{b.mlp_input_kg} kg</td>
                    <td className="py-3 px-4">{b.aggregate_input_kg} kg</td>
                    <td className="py-3 px-4 text-emerald-700 font-extrabold">{b.units_produced} units</td>
                    <td className="py-3 px-6 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
