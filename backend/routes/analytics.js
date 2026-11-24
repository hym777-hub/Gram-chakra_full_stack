/**
 * ============================================================================
 * GramChakra Backend - Live Analytics & Financial Sustainability API Router
 * ============================================================================
 * Module: backend/routes/analytics.js
 * Endpoints (Directly powering the 4 Interactive Recharts Graphs):
 *   - GET /api/analytics/stream-breakdown   : Graph 1 (Pie/Donut: 4-Stream Segregation)
 *   - GET /api/analytics/village-fills     : Graph 2 (Bar Chart: Village Shed Fill Levels)
 *   - GET /api/analytics/monthly-financials: Graph 3 (Composed: Monthly O&M Revenue vs Expenses)
 *   - GET /api/analytics/product-inventory : Graph 4 (Horizontal Bar: Upcycled Stock)
 *   - GET /api/analytics/kpis              : Executive Summary KPI cards
 * 
 * SBM-G Domain Context:
 *   Quantifies operational self-sustainability: computes the Cost Recovery Ratio
 *   (CRR = Total Revenue / Total Operating Costs). A CRR >= 100% indicates that
 *   the rural PWMU operates without recurring government grant dependency.
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

/**
 * GET /api/analytics/stream-breakdown
 * Graph 1: 4-Stream Source Segregation Breakdown (kg).
 */
router.get('/stream-breakdown', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg), 0) as wet,
        COALESCE(SUM(dry_recyclable_kg), 0) as dry,
        COALESCE(SUM(mlp_waste_kg), 0) as mlp,
        COALESCE(SUM(sanitary_hazardous_kg), 0) as sanitary
      FROM waste_logs
    `).get();

    const chartData = [
      { name: 'Wet Waste (Organic)', key: 'wet', value: Number(summary.wet.toFixed(1)), fill: '#10B981', color: '#10B981' },
      { name: 'Dry Recyclables (PET/Metal)', key: 'dry', value: Number(summary.dry.toFixed(1)), fill: '#3B82F6', color: '#3B82F6' },
      { name: 'Multi-Layer Plastic (MLP)', key: 'mlp', value: Number(summary.mlp.toFixed(1)), fill: '#F59E0B', color: '#F59E0B' },
      { name: 'Sanitary & Hazardous', key: 'sanitary', value: Number(summary.sanitary.toFixed(1)), fill: '#EF4444', color: '#EF4444' }
    ];

    const totalKg = chartData.reduce((acc, curr) => acc + curr.value, 0);

    res.json({
      success: true,
      total_kg: Number(totalKg.toFixed(1)),
      data: chartData
    });
  } catch (error) {
    console.error('[API Error] Stream breakdown failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/village-fills
 * Graph 2: Real-time Village Shed Fill Levels (%) with 75% threshold indicator.
 */
router.get('/village-fills', (req, res) => {
  try {
    const villages = db.prepare(`
      SELECT id, name, panchayat_name, current_fill_percent,
             CASE WHEN current_fill_percent >= 75.0 THEN 1 ELSE 0 END as is_critical
      FROM villages
      ORDER BY current_fill_percent DESC
    `).all();

    const chartData = villages.map((v) => ({
      village_id: v.id,
      name: v.name,
      panchayat: v.panchayat_name,
      fill_percent: Number(v.current_fill_percent),
      is_critical: Boolean(v.is_critical),
      bar_color: v.current_fill_percent >= 75 ? '#DC2626' : v.current_fill_percent >= 50 ? '#F59E0B' : '#10B981'
    }));

    res.json({
      success: true,
      threshold: 75.0,
      critical_count: chartData.filter((d) => d.fill_percent >= 75).length,
      data: chartData
    });
  } catch (error) {
    console.error('[API Error] Village fills failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/monthly-financials
 * Graph 3: 6-Month O&M Financial Sustainability Ledger (Revenue vs Expenses vs Net Margin).
 */
router.get('/monthly-financials', (req, res) => {
  try {
    const rawLedger = db.prepare(`
      SELECT 
        substr(entry_date, 1, 7) as month,
        entry_type,
        SUM(amount_inr) as total_amount
      FROM om_financial_ledger
      GROUP BY month, entry_type
      ORDER BY month ASC
    `).all();

    // Group by month
    const monthMap = {};
    for (const row of rawLedger) {
      if (!monthMap[row.month]) {
        monthMap[row.month] = {
          month: row.month,
          revenue_inr: 0,
          expenses_inr: 0,
          net_margin_inr: 0
        };
      }
      if (row.entry_type === 'REVENUE_CREDIT') {
        monthMap[row.month].revenue_inr += Number(row.total_amount);
      } else if (row.entry_type === 'EXPENSE_DEBIT') {
        monthMap[row.month].expenses_inr += Number(row.total_amount);
      }
    }

    const chartData = Object.values(monthMap).map((m) => {
      const revenue = Math.round(m.revenue_inr);
      const expenses = Math.round(m.expenses_inr);
      const netMargin = revenue - expenses;
      return {
        month: m.month,
        revenue_inr: revenue,
        expenses_inr: expenses,
        net_margin_inr: netMargin,
        cost_recovery_percent: expenses > 0 ? Math.round((revenue / expenses) * 100) : 100
      };
    });

    res.json({
      success: true,
      months_count: chartData.length,
      data: chartData
    });
  } catch (error) {
    console.error('[API Error] Financial analytics failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/product-inventory
 * Graph 4: Upcycled Finished Product Inventory & Unit Economics.
 */
router.get('/product-inventory', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, product_type, unit_name, stock_units, unit_price_inr,
             (stock_units * unit_price_inr) as inventory_value_inr
      FROM finished_products
      ORDER BY stock_units DESC
    `).all();

    const chartData = products.map((p) => {
      let displayName = p.product_type;
      let barFill = '#3B82F6';
      if (p.product_type === 'PAVER_BLOCK') {
        displayName = 'Paver Blocks (Pieces)';
        barFill = '#F59E0B';
      } else if (p.product_type === 'FENCING_POST') {
        displayName = 'Fencing Posts (6ft Units)';
        barFill = '#10B981';
      } else if (p.product_type === 'ROOF_TILE') {
        displayName = 'Roof Tiles (Units)';
        barFill = '#6366F1';
      }

      return {
        id: p.id,
        product_type: p.product_type,
        displayName,
        stock_units: p.stock_units,
        unit_price_inr: p.unit_price_inr,
        inventory_value_inr: Math.round(p.inventory_value_inr),
        fill: barFill
      };
    });

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('[API Error] Product inventory failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/kpis
 * Executive KPI summary metrics for the main overview cards.
 */
router.get('/kpis', (req, res) => {
  try {
    const wasteSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg + dry_recyclable_kg + mlp_waste_kg + sanitary_hazardous_kg), 0) as total_waste_kg,
        COALESCE(SUM(mlp_waste_kg), 0) as total_mlp_kg
      FROM waste_logs
    `).get();

    const routeSavings = db.prepare(`
      SELECT 
        COALESCE(SUM(fuel_savings_inr), 0) as total_fuel_savings_inr,
        COALESCE(SUM(co2_savings_kg), 0) as total_co2_savings_kg,
        COUNT(*) as total_routes_optimized
      FROM collection_routes
    `).get();

    const financials = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'REVENUE_CREDIT' THEN amount_inr ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE_DEBIT' THEN amount_inr ELSE 0 END), 0) as total_expenses
      FROM om_financial_ledger
    `).get();

    const production = db.prepare(`
      SELECT 
        COALESCE(SUM(units_produced), 0) as total_units_produced,
        COUNT(*) as total_batches_run
      FROM processing_batches
    `).get();

    const criticalSheds = db.prepare(`
      SELECT COUNT(*) as count FROM villages WHERE current_fill_percent >= 75.0
    `).get();

    const costRecoveryPercent = financials.total_expenses > 0
      ? Math.round((financials.total_revenue / financials.total_expenses) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        total_waste_collected_kg: Math.round(wasteSummary.total_waste_kg),
        total_mlp_diverted_kg: Math.round(wasteSummary.total_mlp_kg),
        total_fuel_savings_inr: Math.round(routeSavings.total_fuel_savings_inr),
        total_co2_saved_kg: Math.round(routeSavings.total_co2_savings_kg),
        total_routes_optimized: routeSavings.total_routes_optimized,
        total_revenue_inr: Math.round(financials.total_revenue),
        total_expenses_inr: Math.round(financials.total_expenses),
        net_financial_margin_inr: Math.round(financials.total_revenue - financials.total_expenses),
        cost_recovery_percent: costRecoveryPercent,
        total_units_manufactured: production.total_units_produced,
        critical_sheds_needing_pickup: criticalSheds.count
      }
    });
  } catch (error) {
    console.error('[API Error] KPI metrics failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
