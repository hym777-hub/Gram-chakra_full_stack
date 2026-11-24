/**
 * ============================================================================
 * GramChakra Backend - PWMU Batch Conversion & Inventory API Router
 * ============================================================================
 * Module: backend/routes/processing.js
 * Endpoints:
 *   - GET  /api/processing/stockpile : Available raw MLP inventory balance (kg)
 *   - GET  /api/processing/batches   : History of conversion production runs
 *   - POST /api/processing/batches   : Creates batch, upcycles MLP, increments stock
 *   - GET  /api/processing/products  : Current warehouse inventory of circular goods
 * 
 * SBM-G Technical Conversion Formulas:
 * 1. Paver Blocks (Composite):
 *    - Ratio: 1 kg MLP + 3 kg Sand/Aggregate -> ~3 units (0.33 kg MLP/block)
 * 2. Fencing Posts (Extruded Plastic-Sand):
 *    - Ratio: 4 kg MLP + 8 kg Mineral Aggregate -> 1 unit 6ft post
 * 3. Interlocking Roof Tiles (Compression Molded):
 *    - Ratio: 1.5 kg MLP + 2.5 kg Fly Ash/Aggregate -> 1 unit tile
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// Defined product conversion configurations
export const CONVERSION_RECIPES = {
  PAVER_BLOCK: {
    name: 'Heavy-Duty Paver Block',
    productId: 'PROD_PAVER',
    mlpPerUnit: 0.333,
    aggregateRatio: 3.0, // 3kg aggregate per 1kg MLP
    unitPrice: 45.0,
    unitName: 'Piece'
  },
  FENCING_POST: {
    name: 'Reinforced 6ft Fencing Post',
    productId: 'PROD_FENCE',
    mlpPerUnit: 4.0,
    aggregateRatio: 2.0, // 2kg aggregate per 1kg MLP
    unitPrice: 320.0,
    unitName: '6ft Post'
  },
  ROOF_TILE: {
    name: 'Interlocking Composite Roof Tile',
    productId: 'PROD_ROOF',
    mlpPerUnit: 1.5,
    aggregateRatio: 1.67, // 2.5kg aggregate per 1.5kg MLP
    unitPrice: 180.0,
    unitName: 'Interlocking Tile'
  }
};

/**
 * GET /api/processing/stockpile
 * Returns raw shredded MLP balance available for batch processing.
 */
router.get('/stockpile', (req, res) => {
  try {
    const collected = db.prepare(`
      SELECT COALESCE(SUM(mlp_waste_kg), 0) as total_collected_mlp
      FROM waste_logs
    `).get();

    const consumed = db.prepare(`
      SELECT COALESCE(SUM(mlp_input_kg), 0) as total_consumed_mlp
      FROM processing_batches
    `).get();

    const totalCollected = Number(collected.total_collected_mlp);
    const totalConsumed = Number(consumed.total_consumed_mlp);
    const availableStockpile = Math.max(0, totalCollected - totalConsumed);

    res.json({
      success: true,
      data: {
        total_collected_mlp_kg: Number(totalCollected.toFixed(1)),
        total_consumed_mlp_kg: Number(totalConsumed.toFixed(1)),
        available_stockpile_kg: Number(availableStockpile.toFixed(1))
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to calculate stockpile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/processing/batches
 * Retrieves all completed and in-progress production batches.
 */
router.get('/batches', (req, res) => {
  try {
    const batches = db.prepare(`
      SELECT * FROM processing_batches
      ORDER BY batch_date DESC
    `).all();

    res.json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch batches:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/processing/batches
 * Initiates a conversion batch: verifies stockpile, increments finished product
 * inventory, and debits operating expenses into the financial ledger.
 */
router.post('/batches', (req, res) => {
  try {
    const {
      product_type,
      mlp_input_kg,
      electricity_kwh = 120.0,
      labor_cost_inr = 2400.0,
      batch_date = new Date().toISOString().split('T')[0]
    } = req.body;

    const recipe = CONVERSION_RECIPES[product_type];
    if (!recipe) {
      return res.status(400).json({
        success: false,
        message: `Invalid product_type. Must be one of: ${Object.keys(CONVERSION_RECIPES).join(', ')}`
      });
    }

    const inputMlp = Number(mlp_input_kg);
    if (!inputMlp || inputMlp <= 0) {
      return res.status(400).json({ success: false, message: 'mlp_input_kg must be greater than zero.' });
    }

    // 1. Stockpile Verification
    const collected = db.prepare('SELECT COALESCE(SUM(mlp_waste_kg), 0) as total FROM waste_logs').get();
    const consumed = db.prepare('SELECT COALESCE(SUM(mlp_input_kg), 0) as total FROM processing_batches').get();
    const available = collected.total - consumed.total;

    if (inputMlp > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient MLP stockpile. Requested ${inputMlp} kg, but only ${available.toFixed(1)} kg available.`
      });
    }

    // 2. Conversion Calculations
    const aggregateInputKg = Number((inputMlp * recipe.aggregateRatio).toFixed(1));
    const unitsProduced = Math.floor(inputMlp / recipe.mlpPerUnit);
    const batchId = `BATCH_${Date.now()}`;
    const batchCode = `BATCH-${new Date().getFullYear()}-${product_type.substring(0, 2)}${Math.floor(100 + Math.random() * 900)}`;

    const runBatchTx = db.transaction(() => {
      // Record batch
      db.prepare(`
        INSERT INTO processing_batches (
          id, batch_code, product_type, mlp_input_kg, aggregate_input_kg,
          units_produced, electricity_kwh, labor_cost_inr, batch_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        batchCode,
        product_type,
        inputMlp,
        aggregateInputKg,
        unitsProduced,
        Number(electricity_kwh),
        Number(labor_cost_inr),
        batch_date,
        'COMPLETED'
      );

      // Increment finished product stock
      db.prepare(`
        UPDATE finished_products
        SET stock_units = stock_units + ?, updated_at = ?
        WHERE id = ?
      `).run(unitsProduced, new Date().toISOString(), recipe.productId);

      // Record production O&M expense debit in ledger
      const totalOpCost = Number(labor_cost_inr) + Number(electricity_kwh) * 8.5; // Approx ₹8.5 / kWh
      db.prepare(`
        INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LEDGER_BATCH_${batchId}`,
        batch_date,
        'EXPENSE_DEBIT',
        'OPERATOR_WAGES',
        totalOpCost,
        batchCode,
        `Processing O&M: ${unitsProduced} ${recipe.unitName} produced from ${inputMlp}kg MLP`
      );
    });

    runBatchTx();

    const createdBatch = db.prepare('SELECT * FROM processing_batches WHERE id = ?').get(batchId);
    const updatedStock = db.prepare('SELECT * FROM finished_products WHERE id = ?').get(recipe.productId);

    res.status(201).json({
      success: true,
      message: `Batch ${batchCode} completed: Converted ${inputMlp} kg MLP into ${unitsProduced} units of ${recipe.name}`,
      data: {
        batch: createdBatch,
        current_product_stock: updatedStock
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to process batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/processing/products
 * Returns all upcycled finished products and real-time inventory counts.
 */
router.get('/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM finished_products').all();
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
