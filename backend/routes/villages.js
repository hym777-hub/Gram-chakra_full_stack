/**
 * ============================================================================
 * GramChakra Backend - Villages & Aggregation Points API Router
 * ============================================================================
 * Module: backend/routes/villages.js
 * Endpoints:
 *   - GET   /api/villages            : Fetches all rural aggregation points & fill %
 *   - GET   /api/villages/depot      : Returns the central PWMU Block Depot location
 *   - PATCH /api/villages/:id/fill   : Updates real-time shed fill % for a village
 * 
 * SBM-G Domain Context:
 *   Under SBM-G Phase II, each Gram Panchayat maintains a segregated dry waste
 *   collection shed. Tracking shed fill level prevents premature pickups and
 *   enables demand-responsive dynamic vehicle dispatching.
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// Constant Central PWMU Depot Waypoint (Phanda Block Headquarters)
export const CENTRAL_PWMU_DEPOT = {
  id: 'DEPOT_00',
  name: 'Central PWMU Block Processing Depot',
  panchayat_name: 'Block HQ Cluster',
  block_name: 'Phanda Block',
  latitude: 23.2599,
  longitude: 77.4126,
  current_fill_percent: 0.0,
  type: 'DEPOT'
};

/**
 * GET /api/villages
 * Returns all registered rural aggregation sheds with real-time fill rates.
 */
router.get('/', (req, res) => {
  try {
    const villages = db.prepare(`
      SELECT id, name, panchayat_name, block_name, latitude, longitude, 
             current_fill_percent, last_updated_at
      FROM villages
      ORDER BY current_fill_percent DESC
    `).all();

    res.json({
      success: true,
      count: villages.length,
      data: villages
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch villages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/villages/depot
 * Returns the central PWMU facility coordinates serving as TSP origin/terminus.
 */
router.get('/depot', (req, res) => {
  res.json({
    success: true,
    data: CENTRAL_PWMU_DEPOT
  });
});

/**
 * PATCH /api/villages/:id/fill
 * Manually updates the fill level of a village collection shed.
 */
router.patch('/:id/fill', (req, res) => {
  try {
    const { id } = req.params;
    const { fill_percent } = req.body;

    if (fill_percent === undefined || fill_percent < 0 || fill_percent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fill_percent. Must be between 0 and 100.'
      });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE villages 
      SET current_fill_percent = ?, last_updated_at = ?
      WHERE id = ?
    `).run(Number(fill_percent), now, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Village not found' });
    }

    const updated = db.prepare('SELECT * FROM villages WHERE id = ?').get(id);

    res.json({
      success: true,
      message: `Updated ${updated.name} shed fill to ${fill_percent}%`,
      data: updated
    });
  } catch (error) {
    console.error('[API Error] Failed to update fill level:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
