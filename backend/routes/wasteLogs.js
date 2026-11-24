/**
 * ============================================================================
 * GramChakra Backend - 4-Stream Waste Logging & Offline Sync API Router
 * ============================================================================
 * Module: backend/routes/wasteLogs.js
 * Endpoints:
 *   - POST /api/waste-logs            : Logs a single 4-stream entry (idempotent)
 *   - POST /api/waste-logs/batch-sync : Flushes queued offline logs atomically
 *   - GET  /api/waste-logs            : Fetches recent waste logging records
 *   - GET  /api/waste-logs/summary    : Cumulative segregation stream weights
 * 
 * SBM-G Domain Context:
 *   Supports 4-stream rural waste segregation:
 *   1. Wet Waste (Organic / Composting)
 *   2. Dry Recyclable (Paper, Cardboard, Rigid Plastics, Glass, Metal)
 *   3. Multi-Layer Plastic (MLP - Metallized wrappers, Sachets, Pouch laminates)
 *   4. Sanitary / Domestic Hazardous (Diapers, Medical, Pesticide containers)
 * 
 * Offline-First Mechanics:
 *   Uses client_sync_id (UUIDv4) to guarantee zero-duplication when reconnecting
 *   after spotty rural network interruptions.
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

/**
 * Helper: Insert a single waste log and update village fill level atomically.
 */
function recordWasteLogTx(payload) {
  const {
    client_sync_id,
    village_id,
    wet_waste_kg = 0,
    dry_recyclable_kg = 0,
    mlp_waste_kg = 0,
    sanitary_hazardous_kg = 0,
    recorded_fill_percent,
    logged_by = 'Swachhata Doot',
    recorded_at = new Date().toISOString()
  } = payload;

  if (!village_id || recorded_fill_percent === undefined) {
    throw new Error('village_id and recorded_fill_percent are required.');
  }

  // Idempotency Check: return existing log if already synced
  const existing = db.prepare('SELECT * FROM waste_logs WHERE client_sync_id = ?').get(client_sync_id);
  if (existing) {
    return { log: existing, isDuplicate: true };
  }

  const id = `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const synced_at = new Date().toISOString();

  // Insert log
  db.prepare(`
    INSERT INTO waste_logs (
      id, client_sync_id, village_id, wet_waste_kg, dry_recyclable_kg,
      mlp_waste_kg, sanitary_hazardous_kg, recorded_fill_percent, logged_by, recorded_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    client_sync_id || `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    village_id,
    Number(wet_waste_kg) || 0,
    Number(dry_recyclable_kg) || 0,
    Number(mlp_waste_kg) || 0,
    Number(sanitary_hazardous_kg) || 0,
    Number(recorded_fill_percent),
    logged_by,
    recorded_at,
    synced_at
  );

  // Update village current fill level
  db.prepare(`
    UPDATE villages
    SET current_fill_percent = ?, last_updated_at = ?
    WHERE id = ?
  `).run(Number(recorded_fill_percent), recorded_at, village_id);

  const inserted = db.prepare('SELECT * FROM waste_logs WHERE id = ?').get(id);
  return { log: inserted, isDuplicate: false };
}

/**
 * POST /api/waste-logs
 * Ingests a 4-stream waste log from a village aggregation point.
 */
router.post('/', (req, res) => {
  try {
    const runTx = db.transaction(() => recordWasteLogTx(req.body));
    const result = runTx();

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate ? 'Log already synced (idempotent)' : 'Waste log recorded successfully',
      data: result.log
    });
  } catch (error) {
    console.error('[API Error] Failed to record waste log:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/waste-logs/batch-sync
 * Ingests an array of queued logs synced from client-side IndexedDB after offline operation.
 */
router.post('/batch-sync', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty items array' });
    }

    const runBatchTx = db.transaction(() => {
      const processed = [];
      for (const item of items) {
        const result = recordWasteLogTx(item);
        processed.push(result.log);
      }
      return processed;
    });

    const syncedRecords = runBatchTx();

    res.json({
      success: true,
      message: `Successfully flushed and synced ${syncedRecords.length} offline waste logs.`,
      count: syncedRecords.length,
      data: syncedRecords
    });
  } catch (error) {
    console.error('[API Error] Batch sync failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/waste-logs
 * Fetches the latest 50 waste collection logs with village details.
 */
router.get('/', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT w.*, v.name as village_name, v.panchayat_name
      FROM waste_logs w
      JOIN villages v ON w.village_id = v.id
      ORDER BY w.recorded_at DESC
      LIMIT 50
    `).all();

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch waste logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/waste-logs/summary
 * Returns cumulative segregation weights across all 4 streams.
 */
router.get('/summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg), 0) as total_wet_kg,
        COALESCE(SUM(dry_recyclable_kg), 0) as total_dry_kg,
        COALESCE(SUM(mlp_waste_kg), 0) as total_mlp_kg,
        COALESCE(SUM(sanitary_hazardous_kg), 0) as total_sanitary_kg,
        COUNT(*) as total_logs_count
      FROM waste_logs
    `).get();

    res.json({
      success: true,
      data: {
        total_wet_kg: Number(summary.total_wet_kg.toFixed(1)),
        total_dry_kg: Number(summary.total_dry_kg.toFixed(1)),
        total_mlp_kg: Number(summary.total_mlp_kg.toFixed(1)),
        total_sanitary_kg: Number(summary.total_sanitary_kg.toFixed(1)),
        total_waste_kg: Number((
          summary.total_wet_kg + 
          summary.total_dry_kg + 
          summary.total_mlp_kg + 
          summary.total_sanitary_kg
        ).toFixed(1)),
        total_logs_count: summary.total_logs_count
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch waste summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
